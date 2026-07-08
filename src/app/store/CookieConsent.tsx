import React from "react";
import { Cookie, X } from "lucide-react";
import type { Page } from "./types";

export type CookieConsentChoice = "all" | "declined" | "necessary";

type CookieConsentProps = {
  open: boolean;
  onChoose: (choice: CookieConsentChoice) => void;
  onNavigate: (page: Page) => void;
};

export function CookieConsent({ open, onChoose, onNavigate }: CookieConsentProps) {
  if (!open) return null;

  return (
    <div className="fixed inset-x-0 bottom-0 z-[75] px-4 pb-4 sm:px-6">
      <section className="mx-auto max-w-4xl rounded-2xl border border-border bg-card p-4 shadow-2xl sm:p-5">
        <div className="flex gap-3">
          <span className="mt-1 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[var(--green-light)] text-[var(--green)]">
            <Cookie size={20} />
          </span>
          <div className="min-w-0 flex-1">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 className="font-bold text-foreground">Cookie preferences</h2>
                <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
                  We use necessary cookies for account security, cart, checkout, and session protection. Optional cookies are used only if you allow them.
                </p>
              </div>
              <button
                onClick={() => onChoose("necessary")}
                className="rounded-lg p-1.5 text-muted-foreground hover:bg-secondary hover:text-foreground"
                aria-label="Close cookie preferences"
              >
                <X size={17} />
              </button>
            </div>

            <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:items-center">
              <button
                onClick={() => onChoose("all")}
                className="h-10 rounded-xl bg-primary px-4 text-sm font-semibold text-primary-foreground hover:bg-[var(--green-dark)]"
              >
                Allow
              </button>
              <button
                onClick={() => onChoose("necessary")}
                className="h-10 rounded-xl border border-border px-4 text-sm font-semibold hover:bg-secondary"
              >
                Allow only necessary cookies
              </button>
              <button
                onClick={() => onChoose("declined")}
                className="h-10 rounded-xl border border-border px-4 text-sm font-semibold hover:bg-secondary"
              >
                Decline
              </button>
              <button
                onClick={() => onNavigate("privacy-policy")}
                className="h-10 px-2 text-sm font-semibold text-[var(--green)] hover:underline"
              >
                Privacy Policy
              </button>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
