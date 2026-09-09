import Link from "next/link";
import "./about-us.css";

export default function AboutUsPage() {
  return (
    <>
      <section className="our-story">
        <div className="dot dot--orange" style={{ width: 8, height: 8, top: "12%", left: "6%" }} />
        <div className="dot dot--ring" style={{ width: 16, height: 16, top: "78%", left: "9%" }} />
        <div className="dot dot--orange" style={{ width: 6, height: 6, top: "20%", right: "8%" }} />

        <div className="story-inner">
          <div className="story-content">
            <span className="story-eyebrow">Our Story</span>
            <h2 className="story-heading">
              <span className="story-heading-main">Rooted in Andhra Tradition,</span>
              <span className="story-heading-script">Served with Love</span>
            </h2>
            <p className="story-desc">
              Bommarillu Biryani brings halal-certified, Andhra-style cooking to
              Redmond, Washington — fresh ingredients, generous portions, and a
              signature biryani our regulars keep coming back for. Every order
              is layered by hand and slow-cooked the traditional dum way, just
              like home.
            </p>
            <Link className="outline-btn" href="/order-online">
              <svg viewBox="0 0 24 24" fill="none">
                <path
                  d="M12 3c-3 3-5 6-5 9a5 5 0 0 0 10 0c0-3-2-6-5-9Z"
                  fill="currentColor"
                />
              </svg>
              Order Online
            </Link>
          </div>

          <div className="story-image-wrap">
            <div className="story-image-backdrop" />
            <div className="story-image-block">
              <img
                src="/about/dining.png"
                alt="Inside Bommarillu Biryani's dining room in Redmond, Washington"
              />
            </div>
          </div>
        </div>
      </section>

      <section className="why-us">
        <div className="dot dot--orange" style={{ width: 7, height: 7, top: "10%", right: "8%" }} />
        <div className="dot dot--ring" style={{ width: 16, height: 16, top: "82%", right: "11%" }} />
        <div className="dot dot--orange" style={{ width: 6, height: 6, top: "18%", left: "7%" }} />

        <div className="bs-heading">
          <svg viewBox="0 0 36 36" fill="none">
            <path
              d="M4 18c6-8 12-8 18 0M22 18c4-5 8-5 10-2"
              stroke="#f0821e"
              strokeWidth="2.4"
              strokeLinecap="round"
            />
            <circle cx="30" cy="12" r="2" fill="#f0821e" />
          </svg>
          <h2>
            Why <span>Choose Us</span>
          </h2>
          <svg viewBox="0 0 36 36" fill="none">
            <path
              d="M32 18c-6-8-12-8-18 0M14 18c-4-5-8-5-10-2"
              stroke="#f0821e"
              strokeWidth="2.4"
              strokeLinecap="round"
            />
            <circle cx="6" cy="12" r="2" fill="#f0821e" />
          </svg>
        </div>
        <p className="bs-sub">
          From the first bite to the last grain of rice, every dish reflects
          the same standard — quality ingredients, honest recipes, and
          portions worth sharing.
        </p>

        <div className="story-inner">
          <div className="whyus-image-wrap">
            <div className="whyus-image-backdrop" />
            <div className="whyus-image-block">
              <img
                src="/about/bommarillu.png"
                alt="Bommarillu Biryani storefront in Redmond, Washington"
              />
            </div>
          </div>

          <div className="story-content">
            <div className="whyus-features">
              <div className="whyus-feature">
                <div className="whyus-feature-icon">
                  <svg viewBox="0 0 24 24" fill="none">
                    <path
                      d="M12 3c-3 3-5 6-5 9a5 5 0 0 0 10 0c0-3-2-6-5-9Z"
                      fill="#fff"
                    />
                  </svg>
                </div>
                <div>
                  <div className="whyus-feature-title">Fresh, Quality Ingredients</div>
                  <p className="whyus-feature-sub">
                    Fresh vegetables, quality meats, and aromatic spices in
                    every order — nothing sits around, nothing is cut short.
                  </p>
                </div>
              </div>
              <div className="whyus-feature">
                <div className="whyus-feature-icon">
                  <svg viewBox="0 0 24 24" fill="none">
                    <path
                      d="M4 11c0-4 3.5-7 8-7s8 3 8 7"
                      stroke="#fff"
                      strokeWidth="1.8"
                      strokeLinecap="round"
                    />
                    <rect x="3" y="11" width="18" height="2.2" rx="1.1" fill="#fff" />
                  </svg>
                </div>
                <div>
                  <div className="whyus-feature-title">Authentic Andhra Recipes</div>
                  <p className="whyus-feature-sub">
                    Traditional dum-style cooking, sealed and slow-cooked the
                    old way, with a masala recipe true to its roots.
                  </p>
                </div>
              </div>
              <div className="whyus-feature">
                <div className="whyus-feature-icon">
                  <svg viewBox="0 0 24 24" fill="none">
                    <path
                      d="M12 21c-4-3-8-6-8-11a5 5 0 0 1 8-4 5 5 0 0 1 8 4c0 5-4 8-8 11Z"
                      fill="#fff"
                    />
                  </svg>
                </div>
                <div>
                  <div className="whyus-feature-title">Great Value, Family Packs</div>
                  <p className="whyus-feature-sub">
                    Generous portions at a fair price — our family packs make
                    it easy to share a real meal without breaking the bank.
                  </p>
                </div>
              </div>
            </div>

            <Link href="/order-online" className="order-btn">
              Order Online
              <span className="arrow">
                <svg viewBox="0 0 24 24" fill="none">
                  <path
                    d="M5 12h14M13 6l6 6-6 6"
                    stroke="#fff"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </span>
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}
