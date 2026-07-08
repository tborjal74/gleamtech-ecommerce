import React from "react";
import { ChevronRight, Clock, HelpCircle, Mail, MapPin, PackageCheck, Phone, RefreshCcw, Search, ShieldCheck, Truck } from "lucide-react";
import type { Page } from "../types";

type SupportPageKind = "delivery-info" | "returns-refunds" | "track-order" | "faq" | "contact-us";

type SupportPageProps = {
  page: SupportPageKind;
  onNavigate: (page: Page) => void;
  onSignIn?: () => void;
  isSignedIn?: boolean;
};

const contact = {
  email: "gleamtechmarketing@gmail.com",
  phone: "+63 955-732-1423 | +63 918-907-0712",
  hours: "Monday to Friday, 9:00 AM to 5:00 PM PHT",
  location: "Antipolo, Rizal, Philippines",
};

const supportNav: Array<{ label: string; page: SupportPageKind }> = [
  { label: "Delivery Info", page: "delivery-info" },
  { label: "Returns & Refunds", page: "returns-refunds" },
  { label: "Track Your Order", page: "track-order" },
  { label: "FAQ", page: "faq" },
  { label: "Contact Us", page: "contact-us" },
];

export function SupportPage({ page, onNavigate, onSignIn, isSignedIn = false }: SupportPageProps) {
  if (page === "track-order") {
    return (
      <SupportShell
        eyebrow="Order Support"
        title="Track Your Order"
        description="View your payment status, order status, purchased items, and payment options from your account."
        page={page}
        onNavigate={onNavigate}
      >
        <section className="rounded-2xl border border-border bg-card p-5 sm:p-6">
          <div className="grid gap-4 md:grid-cols-3">
            <Step icon={Search} title="Open Orders" text="Go to your account and select Orders." />
            <Step icon={PackageCheck} title="Select Order" text="Choose the order number you want to review." />
            <Step icon={ShieldCheck} title="Check Status" text="Review payment, fulfillment, delivery, and payment instructions." />
          </div>
          <div className="mt-6 flex flex-col gap-3 sm:flex-row">
            {isSignedIn ? (
              <button onClick={() => onNavigate("orders")} className="h-11 rounded-xl bg-primary px-5 text-sm font-semibold text-primary-foreground hover:bg-[var(--green-dark)]">
                View My Orders
              </button>
            ) : (
              <button onClick={onSignIn} className="h-11 rounded-xl bg-primary px-5 text-sm font-semibold text-primary-foreground hover:bg-[var(--green-dark)]">
                Sign In to Track
              </button>
            )}
            <button onClick={() => onNavigate("contact-us")} className="h-11 rounded-xl border border-border px-5 text-sm font-semibold hover:bg-secondary">
              Need Help?
            </button>
          </div>
        </section>
      </SupportShell>
    );
  }

  const content = supportContent[page];
  const action = supportActions[page];
  return (
    <SupportShell eyebrow={content.eyebrow} title={content.title} description={content.description} page={page} onNavigate={onNavigate}>
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
      {action && (
        <section className="mt-6 rounded-2xl border border-border bg-card p-5 sm:p-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="font-bold text-foreground">{action.title}</h2>
              <p className="mt-1 text-sm leading-relaxed text-muted-foreground">{action.text}</p>
            </div>
            <button
              onClick={() => onNavigate(action.page)}
              className="h-11 rounded-xl bg-primary px-5 text-sm font-semibold text-primary-foreground hover:bg-[var(--green-dark)]"
            >
              {action.label}
            </button>
          </div>
        </section>
      )}
    </SupportShell>
  );
}

function SupportShell({
  eyebrow,
  title,
  description,
  page,
  onNavigate,
  children,
}: {
  eyebrow: string;
  title: string;
  description: string;
  page: SupportPageKind;
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
      <nav className="mb-8 flex gap-2 overflow-x-auto pb-2" aria-label="Help pages">
        {supportNav.map(item => (
          <button
            key={item.page}
            onClick={() => onNavigate(item.page)}
            className={`h-10 shrink-0 rounded-xl border px-3 text-sm font-semibold transition-colors ${
              item.page === page
                ? "border-[var(--green)] bg-[var(--green-light)] text-[var(--green)]"
                : "border-border bg-card text-muted-foreground hover:text-foreground"
            }`}
          >
            {item.label}
          </button>
        ))}
      </nav>
      {children}
    </main>
  );
}

function InfoRow({ icon: Icon, label, value }: { icon: typeof MapPin; label: string; value: string }) {
  return (
    <div className="flex gap-3">
      <Icon size={17} className="mt-0.5 shrink-0 text-[var(--green)]" />
      <div>
        <p className="font-semibold text-foreground">{label}</p>
        <p className="mt-0.5 leading-relaxed text-muted-foreground">{value}</p>
      </div>
    </div>
  );
}

function Step({ icon: Icon, title, text }: { icon: typeof Search; title: string; text: string }) {
  return (
    <div className="rounded-xl border border-border bg-secondary/40 p-4">
      <Icon size={20} className="text-[var(--green)]" />
      <h2 className="mt-3 font-bold text-foreground">{title}</h2>
      <p className="mt-1 text-sm leading-relaxed text-muted-foreground">{text}</p>
    </div>
  );
}

const supportContent = {
  "delivery-info": {
    eyebrow: "Customer Care",
    title: "Delivery Info",
    description: "Delivery is coordinated after payment confirmation so each order can be handled accurately and securely.",
    sections: [
      { icon: Truck, title: "Delivery Coordination", text: "A Gleamtech representative coordinates delivery details after your payment is confirmed. Keep your contact number reachable for updates." },
      { icon: Clock, title: "Processing Time", text: "Orders are reviewed during business hours. Paid orders are prepared for delivery coordination as soon as stock and payment are confirmed." },
      { icon: ShieldCheck, title: "Secure Handover", text: "Delivery details are matched with the order record to reduce mistakes and protect customer information." },
      { icon: MapPin, title: "Service Area", text: "Current delivery coordination prioritizes Antipolo, Rizal, and nearby areas." },
    ],
  },
  "returns-refunds": {
    eyebrow: "Customer Care",
    title: "Returns & Refunds",
    description: "Return and refund requests are reviewed carefully to keep the process fair, safe, and traceable.",
    sections: [
      { icon: RefreshCcw, title: "Return Review", text: "Contact us with your order number, item details, and photos if an item arrived damaged, incorrect, or incomplete." },
      { icon: PackageCheck, title: "Product Condition", text: "Unused items in original condition are easier to review. Opened cleaning products may need additional verification for safety." },
      { icon: ShieldCheck, title: "Refund Handling", text: "Approved refunds are coordinated through the original or agreed payment channel after order verification." },
      { icon: Mail, title: "Support Channel", text: `Send requests to ${contact.email} with your order number and reachable contact number.` },
    ],
  },
  faq: {
    eyebrow: "Help Center",
    title: "FAQ",
    description: "Quick answers for common Gleamtech ordering, payment, and delivery questions.",
    sections: [
      { icon: HelpCircle, title: "How do I pay?", text: "After checkout, open your order from My Account, choose QR or Bank Transfer, and follow the displayed payment details." },
      { icon: PackageCheck, title: "How do I know if my payment is confirmed?", text: "Your order payment status changes to Paid once an admin confirms payment. You will also receive a confirmation email when configured." },
      { icon: Truck, title: "When is delivery arranged?", text: "Delivery is coordinated after payment is confirmed and the order is ready for fulfillment." },
      { icon: Phone, title: "Can I update my contact number?", text: "Contact support as soon as possible with your order number and the correct phone number." },
    ],
  },
  "contact-us": {
    eyebrow: "Customer Care",
    title: "Contact Us",
    description: "Reach Gleamtech for order assistance, product questions, payment confirmation concerns, and delivery coordination.",
    sections: [
      { icon: Mail, title: "Email", text: contact.email },
      { icon: Phone, title: "Phone Number", text: contact.phone },
      { icon: Clock, title: "Support Hours", text: contact.hours },
      { icon: MapPin, title: "Location", text: contact.location },
    ],
  },
} satisfies Record<Exclude<SupportPageKind, "track-order">, {
  eyebrow: string;
  title: string;
  description: string;
  sections: Array<{ icon: typeof Mail; title: string; text: string }>;
}>;

const supportActions: Partial<Record<Exclude<SupportPageKind, "track-order">, { title: string; text: string; label: string; page: Page }>> = {
  "delivery-info": {
    title: "Need order-specific delivery help?",
    text: "Use the tracking page to review how order status and payment status are checked safely.",
    label: "Track Order",
    page: "track-order",
  },
  "returns-refunds": {
    title: "Ready to request support?",
    text: "Contact Gleamtech with your order number, photos if needed, and a reachable phone number.",
    label: "Contact Us",
    page: "contact-us",
  },
  faq: {
    title: "Still looking for an answer?",
    text: "Send your question directly to support so your order or product concern can be reviewed.",
    label: "Contact Us",
    page: "contact-us",
  },
};
