import React from "react";
import { Facebook, Instagram, Mail, MapPin, Phone, Youtube } from "lucide-react";
import type { Page } from "./types";

const logoUrl = new URL("../../../assets/gleamtech-main-logo.webp", import.meta.url).href;

const FOOTER_LINKS = {
  Shop: ["Kitchen", "Bathroom", "Laundry", "Floors", "Disinfectants", "Eco-Friendly", "Bundles & Kits"],
  Help: ["Delivery Info", "Returns & Refunds", "Track Your Order", "FAQ", "Contact Us"],
  Company: ["About Us", "Sustainability", "Sitemap"],
};

const FOOTER_LINK_PAGES: Partial<Record<string, Page>> = {
  "Delivery Info": "delivery-info",
  "Returns & Refunds": "returns-refunds",
  "Track Your Order": "track-order",
  FAQ: "faq",
  "Contact Us": "contact-us",
  "About Us": "about-us",
  Sustainability: "sustainability",
  Sitemap: "sitemap",
  "Privacy Policy": "privacy-policy",
  "Terms & Conditions": "terms-conditions",
  "Cookie Settings": "cookie-settings",
};

export function StoreFooter({
  onNavigate,
  showNewsletter = false,
  adminCompact = false,
}: {
  onNavigate: (p: Page) => void;
  showNewsletter?: boolean;
  adminCompact?: boolean;
}) {
  return (
    <footer className="bg-[var(--charcoal)] text-white">
      {showNewsletter && !adminCompact && (
        <div className="px-6 py-12" style={{ background: "var(--green)" }}>
          <div className="mx-auto max-w-2xl text-center">
            <p className="mb-2 text-xs font-semibold uppercase tracking-widest text-cyan-100">Stay Gleaming</p>
            <h3 className="mb-2 text-2xl font-bold">Get 10% off your first order</h3>
            <p className="mb-6 text-sm text-cyan-100">Subscribe for exclusive deals, product tips, and new arrivals.</p>
            <form className="mx-auto flex max-w-md flex-col gap-3 sm:flex-row" onSubmit={event => event.preventDefault()}>
              <label htmlFor="footer-email" className="sr-only">Email address</label>
              <input
                id="footer-email"
                type="email"
                placeholder="your@email.com"
                required
                className="h-11 flex-1 rounded-xl border border-white/30 bg-white/20 px-4 text-sm text-white outline-none backdrop-blur-sm placeholder:text-cyan-100 focus:ring-2 focus:ring-white/40"
              />
              <button
                type="submit"
                className="h-11 shrink-0 rounded-xl bg-white px-6 text-sm font-semibold text-[var(--green)] hover:bg-cyan-50"
              >
                Subscribe
              </button>
            </form>
            <p className="mt-3 text-xs text-cyan-100">Unsubscribe anytime. We never spam.</p>
          </div>
        </div>
      )}

      {!adminCompact && (
        <div className="mx-auto grid max-w-7xl grid-cols-1 gap-10 px-6 py-14 sm:grid-cols-2 lg:grid-cols-5">
          <div className="lg:col-span-2">
            <img src={logoUrl} alt="Gleamtech" className="mb-4 h-14 w-56 rounded-lg bg-white object-contain object-center" />
            <p className="mb-5 max-w-xs text-sm leading-relaxed text-white/60">
              Gleamtech brings reliable cleaning essentials to your door with bright service, secure checkout, and dependable delivery.
            </p>
            <div className="space-y-2">
              <div className="flex items-center gap-2.5 text-sm text-white/60">
                <Mail size={14} /> gleamtechmarketing@gmail.com
              </div>
              <div className="flex items-start gap-2.5 text-sm text-white/60">
                <Phone size={14} className="mt-0.5 shrink-0" />
                <div className="leading-relaxed">
                  <p>+63 955-732-1423 | +63 918-907-0712</p>
                  <p>
                    <span className="font-medium text-white/75">Store hours:</span> Mon-Fri, 9:00 AM-5:00 PM PHT
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2.5 text-sm text-white/60">
                <MapPin size={14} /> Antipolo, Philippines
              </div>
            </div>
            <div className="mt-5 flex items-center gap-3">
              {[Instagram, Facebook, Youtube].map((Icon, index) => (
                <a
                  key={["Instagram", "Facebook", "YouTube"][index]}
                  href="#"
                  className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/10 text-white/60 transition-all hover:bg-[var(--green)] hover:text-white"
                  aria-label={["Instagram", "Facebook", "YouTube"][index]}
                >
                  <Icon size={16} />
                </a>
              ))}
            </div>
          </div>

          {Object.entries(FOOTER_LINKS).map(([title, links]) => (
            <div key={title}>
              <h4 className="mb-4 text-sm font-semibold text-white">{title}</h4>
              <ul className="space-y-2.5">
                {links.map(link => (
                  <li key={link}>
                    <a
                      href="#"
                      className="text-sm text-white/55 transition-colors hover:text-white"
                      onClick={event => {
                        event.preventDefault();
                        onNavigate(FOOTER_LINK_PAGES[link] ?? "listing");
                      }}
                    >
                      {link}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      )}

      <div className="border-t border-white/10 px-6 py-5">
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-4 sm:flex-row">
          <p className="text-xs text-white/40">&copy; 2025 Gleamtech Ltd. All rights reserved.</p>
          {!adminCompact && (
            <>
              <div className="flex items-center gap-4 text-xs text-white/40">
                {["Privacy Policy", "Terms & Conditions", "Cookie Settings"].map(link => (
                  <a
                    key={link}
                    href="#"
                    className="transition-colors hover:text-white"
                    onClick={event => {
                      event.preventDefault();
                      onNavigate(FOOTER_LINK_PAGES[link] ?? "home");
                    }}
                  >
                    {link}
                  </a>
                ))}
              </div>
            </>
          )}
        </div>
      </div>
    </footer>
  );
}
