import { getNewsletterSubscribers } from "@/lib/newsletter/subscribers";
import { AdminNotice, describeError } from "@/components/admin-notice";

export default async function AdminNewslettersPage() {
  let data;

  try {
    data = await getNewsletterSubscribers();
  } catch (error) {
    console.error("[admin] Failed to load newsletter subscribers:", error);
    return (
      <>
        <h1 className="admin-page-title">Newsletters</h1>
        <AdminNotice
          title="Couldn't load newsletter subscribers"
          detail={describeError(error)}
        />
      </>
    );
  }

  const { subscribers, total } = data;

  return (
    <>
      <h1 className="admin-page-title">Newsletters</h1>
      <p className="admin-page-sub">
        Email addresses collected from the newsletter form on the contact page,
        newest first.
      </p>

      {subscribers.length === 0 ? (
        <p className="admin-empty">No subscribers yet.</p>
      ) : (
        <div className="admin-subscriber-list">
          {subscribers.map((subscriber) => (
            <div className="admin-subscriber-row" key={subscriber.id}>
              <a
                className="admin-subscriber-email"
                href={`mailto:${subscriber.email}`}
              >
                {subscriber.email}
              </a>
              <span className="admin-subscriber-date">
                {subscriber.subscribedLabel}
              </span>
            </div>
          ))}
        </div>
      )}

      <p className="admin-footnote">
        {total} subscriber{total === 1 ? "" : "s"} in total.
        {subscribers.length < total
          ? ` Showing the ${subscribers.length} most recent.`
          : ""}
      </p>
    </>
  );
}
