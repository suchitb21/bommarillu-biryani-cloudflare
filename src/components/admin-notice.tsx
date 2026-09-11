export function AdminNotice({
  title,
  detail,
}: {
  title: string;
  detail: string;
}) {
  return (
    <div className="admin-notice admin-notice--error">
      <strong>{title}</strong>
      <p style={{ margin: "0.5rem 0 0" }}>{detail}</p>
    </div>
  );
}

export function describeError(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}
