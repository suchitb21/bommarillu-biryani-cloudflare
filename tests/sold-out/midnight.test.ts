import test from "node:test";
import assert from "node:assert/strict";
import { midnightPacific } from "../../src/lib/sold-out/midnight.ts";

const iso = (date: Date) => date.toISOString();

test("afternoon in daylight time rolls to the next Pacific midnight", () => {
  // 1:00 PM PDT on Oct 12 -> midnight Oct 13 PDT = 07:00Z
  assert.equal(iso(midnightPacific(new Date("2026-10-12T20:00:00Z"))), "2026-10-13T07:00:00.000Z");
});

test("one second before midnight still ends at that midnight", () => {
  // 11:59:59 PM PDT Oct 12
  assert.equal(iso(midnightPacific(new Date("2026-10-13T06:59:59Z"))), "2026-10-13T07:00:00.000Z");
});

test("exactly at midnight rolls to the following midnight", () => {
  assert.equal(iso(midnightPacific(new Date("2026-10-13T07:00:00Z"))), "2026-10-14T07:00:00.000Z");
});

test("fall-back day (25 hours): midnight after Nov 1 is 08:00Z (PST)", () => {
  assert.equal(iso(midnightPacific(new Date("2026-11-01T12:00:00Z"))), "2026-11-02T08:00:00.000Z");
});

test("spring-forward day (23 hours): midnight after Mar 8 is 07:00Z (PDT)", () => {
  assert.equal(iso(midnightPacific(new Date("2026-03-08T20:00:00Z"))), "2026-03-09T07:00:00.000Z");
});

test("month and year rollover", () => {
  // 5:00 PM PST on Dec 31 -> midnight Jan 1 PST = 08:00Z
  assert.equal(iso(midnightPacific(new Date("2026-12-31T17:00:00-08:00"))), "2027-01-01T08:00:00.000Z");
});
