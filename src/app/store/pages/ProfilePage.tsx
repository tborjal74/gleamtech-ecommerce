import React, { useCallback, useEffect, useState } from "react";
import { CheckCircle2, KeyRound, LogOut, Mail, Package, ShieldCheck, User } from "lucide-react";
import { toast } from "sonner";
import { api, ApiClientError, type PublicUser } from "../../api";
import type { Page } from "../types";

interface ProfilePageProps {
  user: PublicUser;
  onNavigate: (page: Page) => void;
  onLogout: () => void;
}

export function ProfilePage({ user, onNavigate, onLogout }: ProfilePageProps) {
  const [securityLoading, setSecurityLoading] = useState(true);
  const [twoFactorEnabled, setTwoFactorEnabled] = useState(user.twoFactorEnabled);
  const [twoFactorSetup, setTwoFactorSetup] = useState<{ qrSvg: string } | null>(null);
  const [twoFactorCode, setTwoFactorCode] = useState("");
  const [twoFactorSetupPassword, setTwoFactorSetupPassword] = useState("");
  const [twoFactorDisablePassword, setTwoFactorDisablePassword] = useState("");
  const [securitySubmitting, setSecuritySubmitting] = useState(false);

  const apiMessage = (error: unknown) =>
    error instanceof ApiClientError
      ? error.body.message
      : error instanceof Error
        ? error.message
        : "Request failed.";

  const loadSecurity = useCallback(async () => {
    setSecurityLoading(true);
    try {
      const result = await api.accountSecurity();
      setTwoFactorEnabled(result.twoFactor.enabled);
    } catch (error) {
      toast.error(apiMessage(error));
    } finally {
      setSecurityLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadSecurity();
  }, [loadSecurity]);

  const beginTwoFactorSetup = async () => {
    if (!twoFactorSetupPassword) {
      toast.error("Enter your password before setting up 2FA.");
      return;
    }
    setSecuritySubmitting(true);
    try {
      const setup = await api.setupTwoFactor(twoFactorSetupPassword);
      setTwoFactorSetup({ qrSvg: setup.qrSvg });
      setTwoFactorCode("");
      setTwoFactorSetupPassword("");
    } catch (error) {
      toast.error(apiMessage(error));
    } finally {
      setSecuritySubmitting(false);
    }
  };

  const confirmTwoFactor = async () => {
    setSecuritySubmitting(true);
    try {
      await api.confirmTwoFactor(twoFactorCode);
      setTwoFactorEnabled(true);
      setTwoFactorSetup(null);
      setTwoFactorCode("");
      setTwoFactorSetupPassword("");
      toast.success("Two-factor authentication enabled");
    } catch (error) {
      toast.error(apiMessage(error));
    } finally {
      setSecuritySubmitting(false);
    }
  };

  const disableTwoFactor = async () => {
    if (!twoFactorDisablePassword) {
      toast.error("Enter your password before disabling 2FA.");
      return;
    }
    setSecuritySubmitting(true);
    try {
      await api.disableTwoFactor(twoFactorCode, twoFactorDisablePassword);
      toast.success("Two-factor authentication disabled. Please sign in again.");
      await onLogout();
    } catch (error) {
      toast.error(apiMessage(error));
    } finally {
      setSecuritySubmitting(false);
    }
  };

  return (
    <main className="max-w-5xl mx-auto px-4 sm:px-6 py-10">
      <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-sm font-semibold uppercase tracking-widest text-[var(--green)]">My Account</p>
          <h1 className="text-3xl font-bold text-foreground mt-1">Profile</h1>
          <p className="text-sm text-muted-foreground mt-1">Manage your Gleamtech shopping account.</p>
        </div>
        <button
          onClick={onLogout}
          className="inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-border bg-card px-4 text-sm font-semibold text-foreground hover:bg-secondary"
        >
          <LogOut size={16} />
          Sign out
        </button>
      </div>

      <div className="grid gap-5 lg:grid-cols-3">
        <section className="rounded-2xl border border-border bg-card p-6 lg:col-span-2">
          <div className="flex items-center gap-4">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[var(--green-light)] text-[var(--green)]">
              <User size={26} />
            </div>
            <div>
              <h2 className="text-xl font-bold text-foreground">
                {user.firstName} {user.lastName}
              </h2>
              <div className="mt-1 flex items-center gap-2 text-sm text-muted-foreground">
                <Mail size={14} />
                {user.email}
              </div>
            </div>
          </div>

          <div className="mt-6 grid gap-3 sm:grid-cols-2">
            <div className="rounded-xl border border-border bg-background p-4">
              <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Account status</p>
              <p className="mt-2 flex items-center gap-2 text-sm font-semibold text-[var(--green)]">
                <CheckCircle2 size={16} />
                Signed in
              </p>
            </div>
            <div className="rounded-xl border border-border bg-background p-4">
              <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Role</p>
              <p className="mt-2 text-sm font-semibold text-foreground">{user.role}</p>
            </div>
          </div>
        </section>

        <aside className="rounded-2xl border border-border bg-card p-6">
          <h3 className="font-bold text-foreground">Quick actions</h3>
          <div className="mt-4 grid gap-3">
            <button
              onClick={() => onNavigate("orders")}
              className="flex items-center gap-3 rounded-xl border border-border px-4 py-3 text-left text-sm font-semibold text-foreground hover:bg-secondary"
            >
              <Package size={17} className="text-muted-foreground" />
              View orders
            </button>
            <button
              onClick={() => onNavigate("cart")}
              className="flex items-center gap-3 rounded-xl border border-border px-4 py-3 text-left text-sm font-semibold text-foreground hover:bg-secondary"
            >
              <Package size={17} className="text-muted-foreground" />
              View cart
            </button>
            <button
              onClick={() => onNavigate("wishlist")}
              className="flex items-center gap-3 rounded-xl border border-border px-4 py-3 text-left text-sm font-semibold text-foreground hover:bg-secondary"
            >
              <ShieldCheck size={17} className="text-muted-foreground" />
              Saved items
            </button>
            <button
              onClick={() => onNavigate("listing")}
              className="flex items-center gap-3 rounded-xl border border-border px-4 py-3 text-left text-sm font-semibold text-foreground hover:bg-secondary"
            >
              <ShieldCheck size={17} className="text-muted-foreground" />
              Continue shopping
            </button>
          </div>
        </aside>

        <section className="rounded-2xl border border-border bg-card p-6 lg:col-span-3">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <div className="flex items-center gap-2">
                <KeyRound size={18} className="text-[var(--green)]" />
                <h3 className="font-bold text-foreground">Authenticator app security</h3>
              </div>
              <p className="mt-1 text-sm text-muted-foreground">
                Protect your account with a 6-digit code from Google Authenticator, Microsoft Authenticator, Authy, or another TOTP app.
              </p>
            </div>
            <span className={`inline-flex w-fit rounded-full px-3 py-1 text-xs font-semibold ${twoFactorEnabled ? "bg-[var(--green-light)] text-[var(--green)]" : "bg-secondary text-muted-foreground"}`}>
              {securityLoading ? "Checking..." : twoFactorEnabled ? "Enabled" : "Not enabled"}
            </span>
          </div>

          {!twoFactorEnabled && !twoFactorSetup && (
            <div className="mt-5 max-w-md space-y-3">
              <p className="text-sm text-muted-foreground">
                Enter your password before setting up an authenticator app.
              </p>
              <input
                className="h-11 w-full rounded-xl border border-border bg-card px-3 text-sm"
                placeholder="Current password"
                type="password"
                autoComplete="current-password"
                value={twoFactorSetupPassword}
                onChange={event => setTwoFactorSetupPassword(event.target.value)}
              />
              <button
                onClick={beginTwoFactorSetup}
                disabled={securitySubmitting || securityLoading || !twoFactorSetupPassword}
                className="inline-flex h-11 items-center justify-center rounded-xl bg-primary px-5 text-sm font-semibold text-primary-foreground hover:bg-[var(--green-dark)] disabled:cursor-not-allowed disabled:opacity-60"
              >
                {securitySubmitting ? "Preparing..." : "Set up authenticator app"}
              </button>
            </div>
          )}

          {!twoFactorEnabled && twoFactorSetup && (
            <div className="mt-5 grid gap-5 lg:grid-cols-[300px_1fr]">
              <div
                className="flex h-[300px] w-[300px] max-w-full items-center justify-center rounded-xl border border-border bg-white p-3 [&_svg]:h-full [&_svg]:w-full"
                dangerouslySetInnerHTML={{ __html: twoFactorSetup.qrSvg }}
              />
              <div className="space-y-3">
                <p className="text-sm text-muted-foreground">
                  Scan the QR code, then enter the current 6-digit code from your authenticator app.
                </p>
                <input
                  className="h-11 w-full max-w-xs rounded-xl border border-border bg-card px-3 text-center text-base font-semibold tracking-[0.3em]"
                  placeholder="000000"
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  maxLength={6}
                  value={twoFactorCode}
                  onChange={event => setTwoFactorCode(event.target.value.replace(/\D/g, "").slice(0, 6))}
                />
                <div className="flex flex-wrap gap-3">
                  <button
                    onClick={confirmTwoFactor}
                    disabled={securitySubmitting || twoFactorCode.length !== 6}
                    className="h-11 rounded-xl bg-primary px-5 text-sm font-semibold text-primary-foreground hover:bg-[var(--green-dark)] disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {securitySubmitting ? "Verifying..." : "Enable 2FA"}
                  </button>
                  <button
                    onClick={() => {
                      setTwoFactorSetup(null);
                      setTwoFactorCode("");
                      setTwoFactorSetupPassword("");
                    }}
                    className="h-11 rounded-xl border border-border px-5 text-sm font-semibold hover:bg-secondary"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          )}

          {twoFactorEnabled && (
            <div className="mt-5 max-w-md space-y-3">
              <p className="text-sm text-muted-foreground">
                Enter your password and a current authenticator code if you need to disable 2FA. You will be signed out after disabling it.
              </p>
              <input
                className="h-11 w-full rounded-xl border border-border bg-card px-3 text-sm"
                placeholder="Current password"
                type="password"
                autoComplete="current-password"
                value={twoFactorDisablePassword}
                onChange={event => setTwoFactorDisablePassword(event.target.value)}
              />
              <input
                className="h-11 w-full rounded-xl border border-border bg-card px-3 text-center text-base font-semibold tracking-[0.3em]"
                placeholder="000000"
                inputMode="numeric"
                autoComplete="one-time-code"
                maxLength={6}
                value={twoFactorCode}
                onChange={event => setTwoFactorCode(event.target.value.replace(/\D/g, "").slice(0, 6))}
              />
              <button
                onClick={disableTwoFactor}
                disabled={securitySubmitting || twoFactorCode.length !== 6 || !twoFactorDisablePassword}
                className="h-11 rounded-xl border border-red-200 px-5 text-sm font-semibold text-red-600 hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {securitySubmitting ? "Disabling..." : "Disable 2FA"}
              </button>
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
