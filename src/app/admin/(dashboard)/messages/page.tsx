import { listContactSubmissions } from "@/lib/contact/submissions";
import { AdminNotice, describeError } from "@/components/admin-notice";

export default async function AdminMessagesPage() {
  let messages;

  try {
    messages = await listContactSubmissions();
  } catch (error) {
    console.error("[admin] Failed to load contact submissions:", error);
    return (
      <>
        <h1 className="admin-page-title">Contact Us</h1>
        <AdminNotice
          title="Couldn't load contact messages"
          detail={describeError(error)}
        />
      </>
    );
  }

  return (
    <>
      <h1 className="admin-page-title">Contact Us</h1>
      <p className="admin-page-sub">
        Messages sent through the contact form, newest first.
      </p>

      {messages.length === 0 ? (
        <p className="admin-empty">No messages yet.</p>
      ) : (
        <div className="admin-message-list">
          {messages.map((message) => (
            <article className="admin-message-card" key={message.id}>
              <h3>{message.name}</h3>
              <p className="admin-message-contact">
                <a href={`mailto:${message.email}`}>{message.email}</a>
                {message.phone && (
                  <>
                    {" · "}
                    <a href={`tel:${message.phone}`}>{message.phone}</a>
                  </>
                )}
              </p>
              <p className="admin-message-contact">
                Received {message.receivedLabel}
              </p>
              <p className="admin-message-body">{message.message}</p>
            </article>
          ))}
        </div>
      )}

      <p className="admin-footnote">
        Showing the {messages.length} most recent message
        {messages.length === 1 ? "" : "s"}.
      </p>
    </>
  );
}
