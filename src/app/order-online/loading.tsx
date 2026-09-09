import "@/components/menu-page.css";

export default function Loading() {
  return (
    <section className="menu-page">
      <div className="menu-page-inner">
        <div className="menu-page-header">
          <h1>Order Online</h1>
          <p>Loading the menu&hellip;</p>
        </div>
        <div className="menu-tabs-row">
          <div className="menu-tabs">
            {Array.from({ length: 6 }).map((_, i) => (
              <div className="menu-tab-skeleton" key={i} />
            ))}
          </div>
        </div>
        <div className="menu-section-grid">
          {Array.from({ length: 8 }).map((_, i) => (
            <div className="menu-item-skeleton" key={i} />
          ))}
        </div>
      </div>
    </section>
  );
}
