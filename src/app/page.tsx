"use client";

import { useEffect, useRef } from "react";
import Link from "next/link";
import "./home.css";
import { OrderEntryModal } from "@/components/order-entry-modal";

const TESTIMONIALS = [
  {
    name: "Britt B.",
    quote:
      "Ate here for the first time last week and it was delicious! At first glance it seems like a normal amount of food but once you dig into it, I'd be impressed if anyone could eat it all in one sitting! I ordered three entrees and they lasted over 4 meals. Service was quick and food was done on time, I really appreciate that the curry dish was saran-wrapped to keep it from leaking — very thoughtful addition.",
  },
  {
    name: "Nidhi K.",
    quote:
      "We have tried multiple items here and it's always been good. The Bommarillu special chicken biryani and chicken 999 are really tasty. People are nice and offer different spice levels as requested. Always had a good experience. Totally worth the price. Would recommend this place.",
  },
  {
    name: "Hemanth G.",
    quote:
      "I had a wonderful experience at Bommarillu Indian Cuisine! The food was great, bursting with fresh flavors, and the service was friendly. I truly enjoyed my meal and would definitely recommend it to others.",
  },
  {
    name: "Megha S.",
    quote:
      "Absolutely delicious! I ordered the veg and paneer biryani, tasty and full of flavor. I also loved the kadhi paneer. I've ordered it many times and the taste is always consistently amazing. Highly recommend!",
  },
  {
    name: "Gnana M.",
    quote:
      "Best mutton biryani I've ever had! I've had mutton biryani in many states, but this place truly stands out as the best so far. The mutton pieces were perfectly cooked — tender, flavorful, and well-seasoned. Outstanding Andhra-style dum biryani with authentic spices and rich taste.",
  },
  {
    name: "Eugene C.",
    quote:
      "The biryani here is a must! I got the Bommarillu Special Chicken Biryani (boneless) and it was outstanding. The rice was perfectly cooked and the spice blend was spot-on. The chicken was incredibly juicy and tender, not dry at all. Authentic flavors and generous portions — definitely found my new biryani destination!",
  },
];

export default function Home() {
  const trackRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const cards = document.querySelectorAll(".testimonial-card");
    if (!cards.length) return;
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("visible");
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.15 }
    );
    cards.forEach((c) => observer.observe(c));
    return () => observer.disconnect();
  }, []);

  const scrollAmount = () => {
    const track = trackRef.current;
    const card = track?.querySelector<HTMLElement>(".testimonial-card");
    return (card?.offsetWidth ?? 280) + 22;
  };

  return (
    <>
      <OrderEntryModal />
      <section className="hero">
        {/* decorative dots */}
        <div className="dot dot--orange" style={{ width: 8, height: 8, top: "14%", left: "52%" }} />
        <div className="dot dot--orange" style={{ width: 6, height: 6, top: "20%", left: "57%" }} />
        <div className="dot dot--ring" style={{ width: 18, height: 18, top: "28%", left: "48%" }} />
        <div className="dot dot--orange" style={{ width: 5, height: 5, top: "35%", left: "44%" }} />

        <svg className="leaves" viewBox="0 0 170 170" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path
            d="M170 0C150 20 120 30 100 55C85 74 78 100 90 125C110 110 130 90 145 65C158 44 168 22 170 0Z"
            fill="#4c7a3d"
            opacity="0.85"
          />
          <path
            d="M150 10C130 30 105 45 90 68C110 60 132 48 150 30C160 20 165 12 150 10Z"
            fill="#3a5e2f"
            opacity="0.9"
          />
          <path
            d="M170 40C155 55 138 65 128 82C142 78 158 68 168 55C173 48 175 42 170 40Z"
            fill="#6f9a58"
          />
        </svg>

        <div className="hero-inner">
          <div className="hero-content">
            <span className="script">Authentic</span>
            <div className="headline">Bommarillu</div>
            <span className="script-2">Biryani</span>
            <p className="desc">
              Layer by layer, sealed and slow-cooked the old way — handi-fresh
              basmati and a masala recipe passed down through generations.
            </p>

            <div className="features">
              <div className="feature">
                <div className="feature-icon">
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
                  <div className="feature-title">Dum Sealed</div>
                  <div className="feature-sub">Slow-cooked the old way</div>
                </div>
              </div>
              <div className="feature">
                <div className="feature-icon">
                  <svg viewBox="0 0 24 24" fill="none">
                    <path d="M12 3c-3 3-5 6-5 9a5 5 0 0 0 10 0c0-3-2-6-5-9Z" fill="#fff" />
                  </svg>
                </div>
                <div>
                  <div className="feature-title">Handi-Fresh Basmati</div>
                  <div className="feature-sub">Fragrant &amp; fluffy</div>
                </div>
              </div>
              <div className="feature">
                <div className="feature-icon">
                  <svg viewBox="0 0 24 24" fill="none">
                    <path
                      d="M12 21c-4-3-8-6-8-11a5 5 0 0 1 8-4 5 5 0 0 1 8 4c0 5-4 8-8 11Z"
                      fill="#fff"
                    />
                  </svg>
                </div>
                <div>
                  <div className="feature-title">Signature Masala</div>
                  <div className="feature-sub">Generations-old recipe</div>
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

          <div className="cta-arrow">
            <svg viewBox="0 0 300 160" fill="none">
              <path
                d="M42 18 C 15 28, 8 55, 28 68 C 46 79, 66 66, 60 48 C 55 33, 34 34, 34 52 C 34 90, 70 118, 118 118 C 175 118, 230 100, 270 65"
                stroke="#3b2417"
                strokeWidth="9"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <path
                d="M270 65 L248 61 M270 65 L260 85"
                stroke="#3b2417"
                strokeWidth="9"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </div>

          <div className="hero-image">
            <div className="dish-wrap">
              <svg className="hero-arc" viewBox="0 0 400 120">
                <path id="arcPath" d="M20,110 A400,400 0 0,1 380,110" fill="none" />
                <text
                  fontFamily="var(--font-playfair-display), serif"
                  fontWeight="700"
                  fontSize="21"
                  fill="#3b2417"
                  letterSpacing="1.5"
                  textAnchor="middle"
                >
                  <textPath href="#arcPath" xlinkHref="#arcPath" startOffset="50%">
                    Bommarillu&rsquo;s Finest Biryani
                  </textPath>
                </text>
              </svg>

              <img
                className="dish-photo"
                src="/images/mascot.webp"
                alt="Bommarillu Biryani mascots holding a pot of chicken biryani"
              />

              <div className="badge">
                <svg viewBox="0 0 96 96">
                  <circle cx="48" cy="48" r="46" fill="#4c7a3d" />
                  <circle
                    cx="48"
                    cy="48"
                    r="46"
                    fill="none"
                    stroke="#fff"
                    strokeWidth="1.5"
                    strokeDasharray="3 3"
                    opacity="0.6"
                  />
                  <text x="48" y="42" textAnchor="middle" fill="#fff" fontFamily="var(--font-poppins), sans-serif" fontWeight="700" fontSize="13">
                    Hot
                  </text>
                  <text x="48" y="62" textAnchor="middle" fill="#fff" fontFamily="var(--font-poppins), sans-serif" fontWeight="700" fontSize="13">
                    &amp; Fresh
                  </text>
                </svg>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="bestsellers" id="menu">
        <div className="bs-dot" style={{ width: 10, height: 10, background: "var(--orange)", opacity: 0.5, top: "8%", left: "6%" }} />
        <div className="bs-dot" style={{ width: 14, height: 14, border: "2px solid var(--green)", top: "16%", right: "8%" }} />
        <div className="bs-dot" style={{ width: 7, height: 7, background: "var(--red)", opacity: 0.4, bottom: "12%", left: "12%" }} />
        <div className="bs-dot" style={{ width: 9, height: 9, background: "var(--yellow)", opacity: 0.7, bottom: "20%", right: "14%" }} />

        <div className="bs-inner">
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
              Our Bestselling <span>Biryanis</span>
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
            Straight from our kitchen to your table — the dishes our regulars
            keep coming back for.
          </p>

          <div className="menu-grid">
            {/* 1. Chicken Dum Biryani */}
            <div className="menu-card">
              <div className="ribbon ribbon--bestseller">Bestseller</div>
              <div className="veg-dot nonveg" />
              <div className="card-media">
                <img src="/menu-highlights/chicken-dum-biryani.jpeg" alt="Chicken Dum Biryani" />
                <div className="spice-row">
                  <ChiliIcon />
                  <ChiliIcon />
                </div>
              </div>
              <h3>Chicken Dum Biryani</h3>
              <p>
                Fragrant basmati layered dum-style with tender chicken and our
                generations-old masala blend.
              </p>
            </div>

            {/* 2. Mutton Biryani (Weekend Special) */}
            <div className="menu-card">
              <div className="ribbon ribbon--premium">Premium</div>
              <div className="veg-dot nonveg" />
              <div className="card-media">
                <img src="/menu-highlights/mutton-biryani-weekend-special.jpeg" alt="Mutton Biryani (Goat) Weekend Special" />
                <div className="spice-row">
                  <ChiliIcon />
                  <ChiliIcon />
                  <ChiliIcon />
                </div>
              </div>
              <h3>
                Mutton Biryani (Goat)
                <br />
                Weekend Special
              </h3>
              <p>
                Slow-cooked goat in a rich, deeply spiced gravy — a
                weekends-only favorite.
              </p>
            </div>

            {/* 3. Chef's Special Egg Biryani */}
            <div className="menu-card">
              <div className="ribbon ribbon--chef">Chef&rsquo;s Pick</div>
              <div className="veg-dot nonveg" />
              <div className="card-media">
                <img src="/menu-highlights/chefs-special-egg-biryani.jpeg" alt="Chef's Special Egg Biryani" />
                <div className="spice-row">
                  <ChiliIcon />
                </div>
              </div>
              <h3>Chef&rsquo;s Special Egg Biryani</h3>
              <p>
                Boiled eggs tossed through smoky, spice-laced basmati — a
                comforting classic.
              </p>
            </div>

            {/* 4. Bommarillu Special Chicken Biryani (Boneless) */}
            <div className="menu-card">
              <div className="ribbon ribbon--signature">Signature</div>
              <div className="veg-dot nonveg" />
              <div className="card-media">
                <img
                  src="/menu-highlights/bommarillu-special-chicken-biryani.jpeg"
                  alt="Bommarillu Special Chicken Biryani (Boneless)"
                />
                <div className="spice-row">
                  <ChiliIcon />
                  <ChiliIcon />
                </div>
              </div>
              <h3>
                Bommarillu Special
                <br />
                Chicken Biryani (Boneless)
              </h3>
              <p>
                Our signature boneless chicken, marinated overnight and
                dum-cooked to perfection.
              </p>
            </div>

            {/* 5. Paneer Biryani (Veg) */}
            <div className="menu-card">
              <div className="veg-dot" />
              <div className="card-media">
                <img src="/menu-highlights/paneer-biryani.jpeg" alt="Paneer Biryani" />
                <div className="spice-row">
                  <ChiliIcon />
                </div>
              </div>
              <h3>Paneer Biryani</h3>
              <p>
                Soft paneer cubes layered with fragrant rice — a hearty
                vegetarian favorite.
              </p>
            </div>

            {/* 6. Butter Chicken */}
            <div className="menu-card">
              <div className="veg-dot nonveg" />
              <div className="card-media">
                <img src="/menu-highlights/butter-chicken.jpeg" alt="Butter Chicken" />
                <div className="spice-row">
                  <ChiliIcon />
                </div>
              </div>
              <h3>Butter Chicken</h3>
              <p>
                Tender chicken simmered in a velvety tomato-butter gravy,
                finished with cream.
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="testimonials">
        <div className="dot dot--orange" style={{ width: 7, height: 7, top: "10%", left: "6%" }} />
        <div className="dot dot--ring" style={{ width: 16, height: 16, top: "80%", right: "9%" }} />
        <div className="dot dot--orange" style={{ width: 6, height: 6, top: "20%", right: "16%" }} />

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
            What Our <span>Guests Say</span>
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
          Real feedback from real diners, straight from our Google reviews.
        </p>

        <div className="testimonial-wrap">
          <button
            className="testimonial-arrow testimonial-arrow--prev"
            aria-label="Previous reviews"
            onClick={() => trackRef.current?.scrollBy({ left: -scrollAmount(), behavior: "smooth" })}
          >
            <svg viewBox="0 0 24 24" fill="none">
              <path
                d="M15 6l-6 6 6 6"
                stroke="#fff"
                strokeWidth="2.4"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </button>

          <div className="testimonial-track" ref={trackRef}>
            {TESTIMONIALS.map((t) => (
              <div className="testimonial-card" key={t.name}>
                <div className="testimonial-stars">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <svg key={i} viewBox="0 0 24 24" fill="#f0821e">
                      <path d="M12 2l2.9 6.9 7.1.6-5.4 4.7 1.6 7-6.2-3.9-6.2 3.9 1.6-7L2 9.5l7.1-.6Z" />
                    </svg>
                  ))}
                </div>
                <p className="testimonial-quote">{t.quote}</p>
                <div className="testimonial-foot">
                  <span className="testimonial-name">{t.name}</span>
                  <span className="testimonial-source">
                    <svg viewBox="0 0 24 24" fill="none">
                      <circle cx="12" cy="12" r="10" fill="#4c7a3d" />
                      <path
                        d="M8 12l2.5 2.5L16 9"
                        stroke="#fff"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                    Google review
                  </span>
                </div>
              </div>
            ))}
          </div>

          <button
            className="testimonial-arrow testimonial-arrow--next"
            aria-label="Next reviews"
            onClick={() => trackRef.current?.scrollBy({ left: scrollAmount(), behavior: "smooth" })}
          >
            <svg viewBox="0 0 24 24" fill="none">
              <path
                d="M9 6l6 6-6 6"
                stroke="#fff"
                strokeWidth="2.4"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </button>
        </div>
      </section>

      <section className="faq" id="faq">
        <div className="faq-inner">
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
              Common <span>Questions</span>
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
          <p className="bs-sub">Everything you need to know before you order.</p>

          <div className="faq-list">
            <details className="faq-item" open>
              <summary>
                How much does a full biryani platter cost?
                <span className="faq-icon">+</span>
              </summary>
              <p>
                Pricing depends on portion size and protein — chicken, mutton,
                egg, or veg. Order online to see live pricing for your
                location.
              </p>
            </details>
            <details className="faq-item">
              <summary>
                Do you deliver outside the city?
                <span className="faq-icon">+</span>
              </summary>
              <p>
                We currently deliver within city limits, with select weekend
                routes further out. Enter your address at checkout to check.
              </p>
            </details>
            <details className="faq-item">
              <summary>
                How spicy is the biryani?
                <span className="faq-icon">+</span>
              </summary>
              <p>
                Medium heat by default — ask for mild or extra spicy when
                ordering, no extra charge.
              </p>
            </details>
            <details className="faq-item">
              <summary>
                Can I order through third-party delivery apps?
                <span className="faq-icon">+</span>
              </summary>
              <p>
                Yes — order directly online for pickup or delivery, or find us
                on DoorDash for delivery to your door.
              </p>
            </details>
          </div>
        </div>
      </section>
    </>
  );
}

function ChiliIcon() {
  return (
    <svg viewBox="0 0 24 24">
      <path
        d="M6 4c3 0 6 2 6 6 0 5-4 9-8 9-2 0-3-1-3-3 0-5 2-9 5-12Z"
        fill="#c0392b"
      />
    </svg>
  );
}
