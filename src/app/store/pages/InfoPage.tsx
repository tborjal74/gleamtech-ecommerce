import React from "react";
import type { LucideIcon } from "lucide-react";
import { CheckCircle2, ChevronRight, Cookie, FileText, Leaf, Lock, Map, RefreshCcw, ShieldCheck, ShoppingBag, Sparkles, Truck } from "lucide-react";
import type { Page } from "../types";

export type InfoPageKind =
  | "about-us"
  | "sustainability"
  | "sitemap"
  | "privacy-policy"
  | "terms-conditions"
  | "cookie-settings";

type InfoPageProps = {
  page: InfoPageKind;
  onNavigate: (page: Page) => void;
  onOpenCookiePreferences?: () => void;
};

type Section = {
  icon: LucideIcon;
  title: string;
  text: string;
};

const infoContent: Record<Exclude<InfoPageKind, "sitemap">, {
  eyebrow: string;
  title: string;
  description: string;
  sections: Section[];
}> = {
  "about-us": {
    eyebrow: "Company",
    title: "About Us",
    description: "Gleamtech provides practical cleaning essentials with secure checkout, clear order tracking, and responsive customer support.",
    sections: [
      { icon: Sparkles, title: "Our Focus", text: "We make everyday cleaning easier by offering reliable products for kitchens, bathrooms, laundry, floors, and general home care." },
      { icon: ShoppingBag, title: "Customer First", text: "Customers can review orders, check payment status, and access payment details from their account whenever they need them." },
      { icon: ShieldCheck, title: "Safe Ordering", text: "Checkout and account areas are designed around protected sessions, CSRF checks, and clear order records." },
      { icon: Truck, title: "Delivery Coordination", text: "Delivery is coordinated after payment confirmation so each order can be checked carefully before handover." },
    ],
  },
  sustainability: {
    eyebrow: "Company",
    title: "Sustainability",
    description: "Our sustainability direction is practical: reduce waste, support responsible product choices, and improve operations over time.",
    sections: [
      { icon: Leaf, title: "Responsible Choices", text: "Eco-conscious product options are highlighted so customers can identify items that better match their cleaning preferences." },
      { icon: CheckCircle2, title: "Waste Reduction", text: "Accurate order coordination helps reduce avoidable returns, replacements, and delivery mistakes." },
      { icon: ShieldCheck, title: "Responsible Data Use", text: "We collect only the information needed to process orders, support customers, and protect accounts." },
      { icon: Truck, title: "Coordinated Delivery", text: "Delivery coordination after payment helps reduce failed handoffs and unnecessary trips." },
    ],
  },
  "privacy-policy": {
    eyebrow: "Legal",
    title: "Privacy Policy",
    description: "This policy summarizes how Gleamtech handles customer information for accounts, orders, payments, support, and site security.",
    sections: [
      { icon: Lock, title: "Information We Use", text: "We use account details, contact information, shipping details, cart activity, and order records to provide store services and support." },
      { icon: ShieldCheck, title: "Security", text: "Sessions, CSRF protection, role checks, and server-side validation help protect customer accounts and order activity." },
      { icon: FileText, title: "Order Records", text: "Order and payment status records are retained so customers and administrators can review fulfillment, support, and payment confirmation history." },
      { icon: Cookie, title: "Cookies", text: "Necessary cookies support login, checkout, cart, and security. Optional cookies are used only if consent is granted." },
    ],
  },
  "terms-conditions": {
    eyebrow: "Legal",
    title: "Terms & Conditions",
    description: "These terms explain the basic conditions for using Gleamtech, placing orders, completing payment, and receiving support.",
    sections: [
      { icon: ShoppingBag, title: "Orders", text: "Orders are created from the items in the customer cart. Product availability and stock may be validated again during checkout." },
      { icon: ShieldCheck, title: "Payments", text: "Orders may remain pending until payment is confirmed. Customers should keep proof or reference details for payment follow-up." },
      { icon: Truck, title: "Delivery", text: "Delivery details and timing are coordinated after payment confirmation and may depend on location, stock, and customer availability." },
      { icon: RefreshCcw, title: "Returns", text: "Return and refund requests are reviewed based on order records, product condition, and support evidence provided by the customer." },
    ],
  },
  "cookie-settings": {
    eyebrow: "Privacy",
    title: "Cookie Settings",
    description: "Control how Gleamtech uses cookies and local browser storage beyond what is necessary for account and checkout security.",
    sections: [
      { icon: Cookie, title: "Necessary Cookies", text: "Required for authentication, CSRF protection, cart access, checkout, and basic store functions. These stay enabled." },
      { icon: ShieldCheck, title: "Optional Cookies", text: "Optional preferences may help improve the site experience. They are used only after consent." },
      { icon: Lock, title: "Your Choice", text: "You can allow all cookies, decline optional cookies, or allow only necessary cookies." },
      { icon: FileText, title: "Storage", text: "Your cookie preference is stored locally in your browser and can be changed from this page." },
    ],
  },
};

const sitemapGroups: Array<{
  title: string;
  icon: LucideIcon;
  links: Array<{ label: string; page: Page }>;
}> = [
  {
    title: "Shop",
    icon: ShoppingBag,
    links: [
      { label: "Home", page: "home" },
      { label: "Products", page: "listing" },
      { label: "Cart", page: "cart" },
      { label: "Checkout", page: "checkout" },
    ],
  },
  {
    title: "Help",
    icon: ShieldCheck,
    links: [
      { label: "Delivery Info", page: "delivery-info" },
      { label: "Returns & Refunds", page: "returns-refunds" },
      { label: "Track Your Order", page: "track-order" },
      { label: "FAQ", page: "faq" },
      { label: "Contact Us", page: "contact-us" },
    ],
  },
  {
    title: "Company & Legal",
    icon: FileText,
    links: [
      { label: "About Us", page: "about-us" },
      { label: "Sustainability", page: "sustainability" },
      { label: "Privacy Policy", page: "privacy-policy" },
      { label: "Terms & Conditions", page: "terms-conditions" },
      { label: "Cookie Settings", page: "cookie-settings" },
    ],
  },
];

export function InfoPage({ page, onNavigate, onOpenCookiePreferences }: InfoPageProps) {
  if (page === "sitemap") {
    return (
      <InfoShell
        eyebrow="Company"
        title="Sitemap"
        description="A quick map of the main Gleamtech store, support, company, and legal pages."
        onNavigate={onNavigate}
      >
        <div className="grid gap-4 md:grid-cols-3">
          {sitemapGroups.map(group => (
            <section key={group.title} className="rounded-2xl border border-border bg-card p-5">
              <div className="mb-4 flex items-center gap-2 text-[var(--green)]">
                <group.icon size={18} />
                <h2 className="font-bold text-foreground">{group.title}</h2>
              </div>
              <div className="grid gap-2">
                {group.links.map(link => (
                  <button
                    key={link.label}
                    onClick={() => onNavigate(link.page)}
                    className="flex items-center justify-between rounded-xl border border-border px-3 py-2 text-left text-sm text-muted-foreground hover:bg-secondary hover:text-foreground"
                  >
                    {link.label}
                    <ChevronRight size={14} />
                  </button>
                ))}
              </div>
            </section>
          ))}
        </div>
      </InfoShell>
    );
  }

  const content = infoContent[page];
  return (
    <InfoShell eyebrow={content.eyebrow} title={content.title} description={content.description} onNavigate={onNavigate}>
      <div className="grid gap-4 md:grid-cols-2">
        {content.sections.map(section => (
          <section key={section.title} className="rounded-2xl border border-border bg-card p-5">
            <div className="mb-3 flex items-center gap-2 text-[var(--green)]">
              <section.icon size={18} />
              <h2 className="font-bold text-foreground">{section.title}</h2>
            </div>
            <p className="text-sm leading-relaxed text-muted-foreground">{section.text}</p>
          </section>
        ))}
      </div>
      {page === "cookie-settings" && (
        <section className="mt-6 rounded-2xl border border-border bg-card p-5 sm:p-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="font-bold text-foreground">Manage Cookie Preferences</h2>
              <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
                Update your consent choice anytime. Necessary cookies keep account, cart, checkout, and security features working.
              </p>
            </div>
            <button
              onClick={onOpenCookiePreferences}
              className="h-11 rounded-xl bg-primary px-5 text-sm font-semibold text-primary-foreground hover:bg-[var(--green-dark)]"
            >
              Open Settings
            </button>
          </div>
        </section>
      )}
    </InfoShell>
  );
}

function InfoShell({
  eyebrow,
  title,
  description,
  onNavigate,
  children,
}: {
  eyebrow: string;
  title: string;
  description: string;
  onNavigate: (page: Page) => void;
  children: React.ReactNode;
}) {
  return (
    <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
      <nav className="mb-6 flex items-center gap-2 text-sm text-muted-foreground">
        <button onClick={() => onNavigate("home")} className="hover:text-foreground">Home</button>
        <ChevronRight size={14} />
        <span className="text-foreground">{title}</span>
      </nav>
      <div className="mb-8 max-w-3xl">
        <p className="text-sm font-semibold uppercase tracking-widest text-[var(--green)]">{eyebrow}</p>
        <h1 className="mt-2 text-3xl font-bold text-foreground sm:text-4xl">{title}</h1>
        <p className="mt-3 text-sm leading-relaxed text-muted-foreground sm:text-base">{description}</p>
      </div>
      {children}
    </main>
  );
}
