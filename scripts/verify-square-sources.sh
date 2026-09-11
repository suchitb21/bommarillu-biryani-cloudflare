#!/usr/bin/env bash
#
# Square source/channel diagnostic - READ ONLY. No writes, no order changes.
#
# Answers, against your real account:
#   1. What values does order.source.name actually take? (POS, DoorDash, Uber Eats, ...)
#   2. Do non-app channels carry order.metadata?      (metadata is app-private)
#   3. Does source_filter actually narrow results, or is it silently ignored?
#   4. Does a date range longer than 90 days error?   (unverified claim)
#
# Usage - export the two values first so they stay out of the command itself:
#
#   export SQUARE_ACCESS_TOKEN='sq0atp-...'
#   export SQUARE_LOCATION_ID='...'
#   bash scripts/verify-square-sources.sh
#
# Optional: LOOKBACK_DAYS=60 SAMPLE_PAGES=5 bash scripts/verify-square-sources.sh
#
set -uo pipefail

: "${SQUARE_ACCESS_TOKEN:?export SQUARE_ACCESS_TOKEN first}"
: "${SQUARE_LOCATION_ID:?export SQUARE_LOCATION_ID first}"

ENVIRONMENT="${SQUARE_ENVIRONMENT:-production}"
if [ "$ENVIRONMENT" = "sandbox" ]; then
  BASE="https://connect.squareupsandbox.com"
else
  BASE="https://connect.squareup.com"
fi

# The version the project's SDK (square 45.1.0) already sends by default.
VERSION="2026-08-19"
LOOKBACK_DAYS="${LOOKBACK_DAYS:-30}"
SAMPLE_PAGES="${SAMPLE_PAGES:-3}"
START=$(date -u -d "-${LOOKBACK_DAYS} days" +%Y-%m-%dT%H:%M:%SZ)
TMP=$(mktemp -d)
trap 'rm -rf "$TMP"' EXIT

echo
echo "environment : $ENVIRONMENT"
echo "base url    : $BASE"
echo "location    : $SQUARE_LOCATION_ID"
echo "window      : last ${LOOKBACK_DAYS} days (created_at >= $START)"
echo "sample      : up to ${SAMPLE_PAGES} page(s) of 500"
echo

if ! command -v jq >/dev/null; then
  echo "ERROR: jq is required. Install with: sudo dnf install jq"
  exit 1
fi

# ---------------------------------------------------------------- helpers ---
post_search() {
  # $1 = JSON body, $2 = output file. Prints HTTP status.
  curl -sS -o "$2" -w '%{http_code}' \
    -X POST "$BASE/v2/orders/search" \
    -H "Square-Version: $VERSION" \
    -H "Authorization: Bearer $SQUARE_ACCESS_TOKEN" \
    -H "Content-Type: application/json" \
    -d "$1"
}

page_xargs() {
  jq -nc --arg loc "$SQUARE_LOCATION_ID" --arg start "$START" \
    '{location_ids: [$loc], limit: 500,
      query: {filter: {date_time_filter: {created_at: {start_at: $start}}},
              sort: {sort_field: "CREATED_AT", sort_order: "DESC"}}}'
}

# --------------------------------------------------- 1. sample + histogram ---
echo "=== 1. SAMPLING ORDERS (no source filter) ==="
CURSOR=""
: > "$TMP/all.jsonl"
PAGES=0
while :; do
  BODY=$(page_xargs)
  if [ -n "$CURSOR" ]; then
    BODY=$(echo "$BODY" | jq -c --arg c "$CURSOR" '. + {cursor: $c}')
  fi
  STATUS=$(post_search "$BODY" "$TMP/page.json")
  if [ "$STATUS" != "200" ]; then
    echo "  HTTP $STATUS - request failed:"
    jq -r '.errors[]? | "    \(.code): \(.detail)"' "$TMP/page.json" 2>/dev/null || cat "$TMP/page.json"
    exit 1
  fi
  jq -c '.orders[]?' "$TMP/page.json" >> "$TMP/all.jsonl"
  PAGES=$((PAGES + 1))
  CURSOR=$(jq -r '.cursor // empty' "$TMP/page.json")
  COUNT=$(wc -l < "$TMP/all.jsonl")
  echo "  page $PAGES - $COUNT orders collected"
  if [ -z "$CURSOR" ] || [ "$PAGES" -ge "$SAMPLE_PAGES" ]; then break; fi
done

TOTAL_SAMPLED=$(wc -l < "$TMP/all.jsonl")
echo
echo "  sampled $TOTAL_SAMPLED orders"
if [ "$TOTAL_SAMPLED" -eq 0 ]; then
  echo "  No orders in this window. Try LOOKBACK_DAYS=180."
  exit 0
fi

echo
echo "--- order.source.name histogram ---"
jq -r '
  if .source == null then "<source absent>"
  elif (.source.name // "") == "" then "<name absent or empty>"
  else .source.name end
' "$TMP/all.jsonl" | sort | uniq -c | sort -rn | sed 's/^/  /'

echo
echo "--- full order.source object shapes (top 5 distinct) ---"
jq -c '.source // "<absent>"' "$TMP/all.jsonl" | sort | uniq -c | sort -rn | head -5 | sed 's/^/  /'

# ------------------------------------------------------- 2. metadata check ---
echo
echo "=== 2. DOES order.metadata EXIST ON THESE ORDERS? ==="
echo "  (metadata is private to the app that wrote it, so non-app orders"
echo "   should show no metadata at all)"
jq -r '
  if (.metadata // {}) == {} then "no metadata"
  else "metadata keys: " + ([.metadata | keys[]] | join(",")) end
' "$TMP/all.jsonl" | sort | uniq -c | sort -rn | head -10 | sed 's/^/  /'

echo
echo "--- metadata.channel values seen ---"
jq -r '.metadata.channel // "<none>"' "$TMP/all.jsonl" | sort | uniq -c | sort -rn | sed 's/^/  /'

# --------------------------------------------------- 3. source_filter test ---
echo
echo "=== 3. DOES source_filter ACTUALLY WORK? ==="
NAMES=$(jq -r '
  if .source == null then empty
  elif (.source.name // "") == "" then empty
  else .source.name end
' "$TMP/all.jsonl" | sort -u)

if [ -z "$NAMES" ]; then
  echo "  No non-empty source.name values were found, so source_filter CANNOT"
  echo "  be used as an allowlist in this account. Nothing to test."
else
  while IFS= read -r NAME; do
    [ -z "$NAME" ] && continue
    FBODY=$(jq -nc --arg loc "$SQUARE_LOCATION_ID" --arg start "$START" --arg n "$NAME" \
      '{location_ids: [$loc], limit: 100,
        query: {filter: {date_time_filter: {created_at: {start_at: $start}},
                         source_filter: {source_names: [$n]}},
                sort: {sort_field: "CREATED_AT", sort_order: "DESC"}}}')
    STATUS=$(post_search "$FBODY" "$TMP/filt.json")
    if [ "$STATUS" != "200" ]; then
      echo "  source_filter [$NAME] -> HTTP $STATUS (filter REJECTED)"
      jq -r '.errors[]? | "      \(.code): \(.detail)"' "$TMP/filt.json" 2>/dev/null
      continue
    fi
    RETURNED=$(jq '.orders | length' "$TMP/filt.json")
    OTHERS=$(jq -r --arg n "$NAME" '
      [.orders[]? | select((.source.name // "") != $n)] | length
    ' "$TMP/filt.json")
    echo "  source_filter [$(printf '%s' "$NAME")] -> $RETURNED order(s) returned, $OTHERS MISMATCHED"
    if [ "$OTHERS" -gt 0 ]; then
      echo "      ^ filter is being IGNORED - it returned orders from other sources"
    fi
  done <<< "$NAMES"
fi

# ------------------------------------------------------ 4. 90-day cap test ---
echo
echo "=== 4. DOES A DATE RANGE OVER 90 DAYS ERROR? ==="
LONG_START=$(date -u -d "-365 days" +%Y-%m-%dT%H:%M:%SZ)
LBODY=$(jq -nc --arg loc "$SQUARE_LOCATION_ID" --arg start "$LONG_START" \
  '{location_ids: [$loc], limit: 1,
    query: {filter: {date_time_filter: {created_at: {start_at: $start}}},
            sort: {sort_field: "CREATED_AT", sort_order: "DESC"}}}')
STATUS=$(post_search "$LBODY" "$TMP/long.json")
echo "  365-day range (start_at=$LONG_START) -> HTTP $STATUS"
if [ "$STATUS" = "200" ]; then
  echo "  ACCEPTED - no 90-day cap enforced on created_at (at least at this range)"
else
  echo "  REJECTED - a 90-day cap may be real:"
  jq -r '.errors[]? | "    \(.code): \(.detail)"' "$TMP/long.json" 2>/dev/null || cat "$TMP/long.json"
fi

echo
echo "=== DONE - paste this whole output back ==="
echo
