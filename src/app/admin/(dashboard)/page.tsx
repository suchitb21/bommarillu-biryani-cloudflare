import Link from "next/link";

const OPTIONS = [
  {
    href: "/admin/orders",
    title: "Online Orders",
    description:
      "Pickup orders placed through this website — upcoming and completed.",
  },
  {
    href: "/admin/catering",
    title: "Catering Orders",
    description:
      "Catering orders booked through the catering page, with event dates.",
  },
  {
    href: "/admin/sold-out",
    title: "Sold Out",
    description:
      "Mark a menu group or item as sold out so customers can't order it.",
  },
  {
    href: "/admin/messages",
    title: "Contact Us",
    description: "Messages customers sent through the contact form.",
  },
  {
    href: "/admin/newsletters",
    title: "Newsletters",
    description: "Email addresses collected from the newsletter signup.",
  },
];

export default function AdminHomePage() {
  return (
    <>
      <h1 className="admin-page-title">Dashboard</h1>
      <p className="admin-page-sub">What would you like to look at?</p>

      <div className="admin-hub-grid">
        {OPTIONS.map((option) => (
          <Link key={option.href} href={option.href} className="admin-hub-card">
            <h2>{option.title}</h2>
            <p>{option.description}</p>
          </Link>
        ))}
      </div>
    </>
  );
}
