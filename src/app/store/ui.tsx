import React from "react";
import { Star, StarHalf } from "lucide-react";
import { cn } from "../components/ui/utils";

// ─── Rating Stars ────────────────────────────────────────────────
export function RatingStars({ rating, size = 14 }: { rating: number; size?: number }) {
  const full = Math.floor(rating);
  const half = rating % 1 >= 0.5;
  const empty = 5 - full - (half ? 1 : 0);
  return (
    <span className="flex items-center gap-0.5">
      {Array.from({ length: full }).map((_, i) => (
        <Star key={`f${i}`} size={size} fill="var(--yellow)" stroke="none" />
      ))}
      {half && <StarHalf size={size} fill="var(--yellow)" stroke="none" />}
      {Array.from({ length: empty }).map((_, i) => (
        <Star key={`e${i}`} size={size} fill="none" stroke="var(--border)" strokeWidth={1.5} />
      ))}
    </span>
  );
}

// ─── Badge ────────────────────────────────────────────────────────
export function Badge({
  label,
  color = "green",
  className,
}: {
  label: string;
  color?: "green" | "yellow" | "blue" | "red" | "gray";
  className?: string;
}) {
  const styles: Record<string, string> = {
    green: "bg-[var(--green-light)] text-[var(--green)] border-[var(--green-mid)]/30",
    yellow: "bg-[var(--yellow-light)] text-amber-700 border-amber-300/40",
    blue: "bg-[var(--blue-light)] text-[var(--blue)] border-[var(--blue)]/20",
    red: "bg-[var(--red-light)] text-[var(--red)] border-[var(--red)]/20",
    gray: "bg-muted text-muted-foreground border-border",
  };
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium shrink-0",
        styles[color],
        className
      )}
    >
      {label}
    </span>
  );
}

// ─── Quantity Selector ────────────────────────────────────────────
export function QtySelector({
  qty,
  onChange,
  min = 1,
  max = 99,
  size = "md",
}: {
  qty: number;
  onChange: (n: number) => void;
  min?: number;
  max?: number;
  size?: "sm" | "md";
}) {
  const btnCls = size === "sm"
    ? "w-7 h-7 text-sm"
    : "w-9 h-9 text-base";
  return (
    <div className="flex items-center rounded-xl border border-border bg-card overflow-hidden">
      <button
        onClick={() => onChange(Math.max(min, qty - 1))}
        disabled={qty <= min}
        className={cn("flex items-center justify-center font-medium text-foreground hover:bg-secondary disabled:opacity-30 transition-colors shrink-0", btnCls)}
        aria-label="Decrease quantity"
      >
        −
      </button>
      <span
        className={cn("text-center font-medium tabular-nums border-x border-border bg-background", size === "sm" ? "px-3 text-sm" : "px-4")}
        style={{ minWidth: size === "sm" ? "32px" : "40px" }}
      >
        {qty}
      </span>
      <button
        onClick={() => onChange(Math.min(max, qty + 1))}
        disabled={qty >= max}
        className={cn("flex items-center justify-center font-medium text-foreground hover:bg-secondary disabled:opacity-30 transition-colors shrink-0", btnCls)}
        aria-label="Increase quantity"
      >
        +
      </button>
    </div>
  );
}

// ─── Btn ─────────────────────────────────────────────────────────
export function Btn({
  children,
  variant = "primary",
  size = "md",
  full = false,
  disabled = false,
  loading = false,
  onClick,
  className,
  type = "button",
}: {
  children: React.ReactNode;
  variant?: "primary" | "secondary" | "outline" | "ghost" | "danger";
  size?: "sm" | "md" | "lg";
  full?: boolean;
  disabled?: boolean;
  loading?: boolean;
  onClick?: () => void;
  className?: string;
  type?: "button" | "submit";
}) {
  const base = "inline-flex items-center justify-center gap-2 font-medium rounded-xl transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 shrink-0";
  const variants: Record<string, string> = {
    primary: "bg-primary text-primary-foreground hover:bg-[var(--green-dark)] active:bg-[var(--teal)]",
    secondary: "bg-secondary text-secondary-foreground hover:bg-[var(--green-light)] border border-[var(--green-mid)]/30",
    outline: "border border-border bg-card text-foreground hover:bg-secondary",
    ghost: "text-foreground hover:bg-secondary",
    danger: "bg-destructive text-destructive-foreground hover:bg-[#b83a30]",
  };
  const sizes: Record<string, string> = {
    sm: "h-8 px-3 text-sm",
    md: "h-10 px-5 text-sm",
    lg: "h-12 px-7 text-base",
  };
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled || loading}
      className={cn(base, variants[variant], sizes[size], full && "w-full", className)}
    >
      {loading ? (
        <span className="w-4 h-4 rounded-full border-2 border-current border-t-transparent animate-spin" />
      ) : children}
    </button>
  );
}

// ─── Input Field ─────────────────────────────────────────────────
export function InputField({
  label,
  id,
  type = "text",
  placeholder,
  value,
  onChange,
  error,
  hint,
  required,
  icon,
}: {
  label?: string;
  id: string;
  type?: string;
  placeholder?: string;
  value?: string;
  onChange?: (v: string) => void;
  error?: string;
  hint?: string;
  required?: boolean;
  icon?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      {label && (
        <label htmlFor={id} className="text-sm font-medium text-foreground">
          {label}{required && <span className="text-destructive ml-0.5">*</span>}
        </label>
      )}
      <div className="relative">
        {icon && (
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none">
            {icon}
          </span>
        )}
        <input
          id={id}
          type={type}
          placeholder={placeholder}
          value={value}
          onChange={e => onChange?.(e.target.value)}
          className={cn(
            "w-full h-11 rounded-xl border bg-card text-foreground placeholder:text-muted-foreground outline-none transition-all",
            "focus:ring-2 focus:ring-ring/30 focus:border-ring",
            icon ? "pl-10 pr-4" : "px-4",
            error ? "border-destructive focus:ring-destructive/30" : "border-border"
          )}
          style={{ fontSize: "14px" }}
          required={required}
        />
      </div>
      {error && <p className="text-xs text-destructive">{error}</p>}
      {hint && !error && <p className="text-xs text-muted-foreground">{hint}</p>}
    </div>
  );
}

// ─── Section Header ───────────────────────────────────────────────
export function SectionHeader({
  eyebrow,
  title,
  subtitle,
  action,
}: {
  eyebrow?: string;
  title: string;
  subtitle?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex items-end justify-between gap-4 mb-8">
      <div>
        {eyebrow && (
          <p className="text-xs font-semibold uppercase tracking-widest text-[var(--green)] mb-1">
            {eyebrow}
          </p>
        )}
        <h2 className="text-2xl sm:text-3xl font-bold text-foreground">{title}</h2>
        {subtitle && <p className="text-muted-foreground mt-1 text-sm">{subtitle}</p>}
      </div>
      {action}
    </div>
  );
}

// ─── Toast ────────────────────────────────────────────────────────
export function ToastNotif({
  message,
  type = "success",
  onClose,
}: {
  message: string;
  type?: "success" | "error" | "info";
  onClose?: () => void;
}) {
  const styles = {
    success: "bg-[var(--green)] text-white",
    error: "bg-destructive text-white",
    info: "bg-[var(--blue)] text-white",
  };
  return (
    <div
      className={cn(
        "fixed bottom-6 right-6 z-[100] flex items-center gap-3 px-5 py-3.5 rounded-2xl shadow-xl text-sm font-medium",
        styles[type]
      )}
      role="status"
    >
      {message}
      {onClose && (
        <button onClick={onClose} className="ml-2 opacity-70 hover:opacity-100 text-lg leading-none">
          ×
        </button>
      )}
    </div>
  );
}

// ─── Empty State ─────────────────────────────────────────────────
export function EmptyState({
  icon,
  title,
  message,
  action,
}: {
  icon: React.ReactNode;
  title: string;
  message: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center py-20 text-center px-4">
      <div className="w-16 h-16 rounded-full bg-secondary flex items-center justify-center mb-4 text-2xl">
        {icon}
      </div>
      <h3 className="text-lg font-semibold text-foreground mb-1">{title}</h3>
      <p className="text-muted-foreground text-sm max-w-xs mb-6">{message}</p>
      {action}
    </div>
  );
}
