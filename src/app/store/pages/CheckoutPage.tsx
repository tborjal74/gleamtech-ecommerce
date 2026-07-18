import React, { useEffect, useMemo, useState } from "react";
import { Check, ChevronRight, Landmark, Lock, Mail, MapPin, Phone, QrCode, Shield, User } from "lucide-react";
import { cn } from "../../components/ui/utils";
import { InputField } from "../ui";
import type { CartItem, Page } from "../types";
import { formatCurrency } from "../currency";
import { api, type CustomerAddress, type PromoCode, type PublicUser } from "../../api";
import { BANK_TRANSFER_DETAILS, gcashQrUrl } from "../paymentDetails";
import { ProductImage } from "../ProductImage";

interface CheckoutPageProps {
  cartItems: CartItem[];
  promo: PromoCode | null;
  onNavigate: (page: Page) => void;
  user: PublicUser;
  onPlaceOrder: (input: {
    idempotencyKey: string;
    paymentMethod: "GCASH" | "BANK_TRANSFER";
    promoCode?: string;
    shippingName: string;
    shippingPhone: string;
    shippingLine1: string;
    shippingLine2: string;
    shippingCity: string;
    shippingRegion: string;
    shippingPostal: string;
    shippingCountry: string;
    customerNote?: string;
  }) => Promise<{ orderNumber: string }>;
}

type CheckoutForm = {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  addressLine1: string;
  addressLine2: string;
  orderNote: string;
  city: string;
  region: string;
  postcode: string;
};

const STEPS = ["Contact", "Shipping", "Payment"];

const EMPTY_FORM: CheckoutForm = {
  firstName: "",
  lastName: "",
  email: "",
  phone: "",
  addressLine1: "",
  addressLine2: "",
  orderNote: "",
  city: "",
  region: "",
  postcode: "",
};

function formFromUser(user: PublicUser): CheckoutForm {
  return {
    ...EMPTY_FORM,
    firstName: user.firstName,
    lastName: user.lastName,
    email: user.email,
  };
}

function validateEmail(email: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
}

function validatePhone(phone: string) {
  return /^\+?[0-9\s()-]{7,20}$/.test(phone.trim());
}

export function CheckoutPage({ cartItems, promo, onNavigate, onPlaceOrder, user }: CheckoutPageProps) {
  const [step, setStep] = useState(0);
  const [paymentMethod, setPaymentMethod] = useState<"GCASH" | "BANK_TRANSFER">("GCASH");
  const [showGcashQr, setShowGcashQr] = useState(false);
  const [form, setForm] = useState<CheckoutForm>(() => formFromUser(user));
  const [errors, setErrors] = useState<Partial<Record<keyof CheckoutForm | "payment", string>>>({});
  const [placing, setPlacing] = useState(false);
  const [placed, setPlaced] = useState(false);
  const [orderNumber, setOrderNumber] = useState("");
  const [error, setError] = useState("");
  const [addresses, setAddresses] = useState<CustomerAddress[]>([]);
  const [saveAddress, setSaveAddress] = useState(true);
  const idempotencyKey = useMemo(() => crypto.randomUUID(), []);

  const subtotal = cartItems.reduce((sum, item) => sum + item.product.price * item.qty, 0);
  const discount = promo ? Math.round(subtotal * promo.percentOff) / 100 : 0;
  const total = subtotal - discount;
  const stockWarnings = cartItems.filter(item => !item.product.inStock || (item.product.availableQuantity ?? item.qty) < item.qty);

  useEffect(() => {
    void api.addresses()
      .then(result => {
        setAddresses(result.addresses);
        const address = result.addresses.find(item => item.isDefault) ?? result.addresses[0];
        if (!address) return;
        const [firstName, ...lastNameParts] = address.name.split(" ");
        setForm(prev => ({
          ...prev,
          firstName: firstName || prev.firstName,
          lastName: lastNameParts.join(" ") || prev.lastName,
          phone: address.phone,
          addressLine1: address.line1,
          addressLine2: address.line2,
          city: address.city,
          region: address.region,
          postcode: address.postal,
        }));
      })
      .catch(() => undefined);
  }, []);

  const updateForm = (field: keyof CheckoutForm, value: string) => {
    setForm(prev => ({ ...prev, [field]: value }));
    setErrors(prev => ({ ...prev, [field]: undefined }));
  };

  const validateContact = () => {
    const next: Partial<Record<keyof CheckoutForm, string>> = {};
    if (!form.firstName.trim()) next.firstName = "First name is required.";
    if (!form.lastName.trim()) next.lastName = "Last name is required.";
    if (!form.email.trim()) next.email = "Email address is required.";
    else if (!validateEmail(form.email)) next.email = "Enter a valid email address.";
    if (!form.phone.trim()) next.phone = "Phone number is required.";
    else if (!validatePhone(form.phone)) next.phone = "Enter a valid phone number.";
    setErrors(prev => ({ ...prev, ...next }));
    return Object.keys(next).length === 0;
  };

  const validateShipping = () => {
    const next: Partial<Record<keyof CheckoutForm, string>> = {};
    if (!form.addressLine1.trim()) next.addressLine1 = "Address Line 1 is required.";
    if (!form.city.trim()) next.city = "City is required.";
    if (!form.region.trim()) next.region = "Province or region is required.";
    setErrors(prev => ({ ...prev, ...next }));
    return Object.keys(next).length === 0;
  };

  const continueFromContact = () => {
    if (validateContact()) setStep(1);
  };

  const continueFromShipping = () => {
    if (validateShipping()) setStep(2);
  };

  const handlePlaceOrder = async () => {
    const contactOk = validateContact();
    const shippingOk = validateShipping();
    if (!contactOk) {
      setStep(0);
      return;
    }
    if (!shippingOk) {
      setStep(1);
      return;
    }
    if (stockWarnings.length > 0) {
      setError("Some cart items exceed current stock. Please update your cart before placing the order.");
      return;
    }

    setPlacing(true);
    setError("");
    try {
      const result = await onPlaceOrder({
        idempotencyKey,
        paymentMethod,
        ...(promo ? { promoCode: promo.code } : {}),
        shippingName: `${form.firstName.trim()} ${form.lastName.trim()}`.trim(),
        shippingPhone: form.phone.trim(),
        shippingLine1: form.addressLine1.trim(),
        shippingLine2: form.addressLine2.trim(),
        shippingCity: form.city.trim(),
        shippingRegion: form.region.trim(),
        shippingPostal: form.postcode.trim(),
        shippingCountry: "PH",
        customerNote: form.orderNote.trim(),
      });
      if (saveAddress) {
        void api.saveAddress({
          label: "Default",
          name: `${form.firstName.trim()} ${form.lastName.trim()}`.trim(),
          phone: form.phone.trim(),
          line1: form.addressLine1.trim(),
          line2: form.addressLine2.trim(),
          city: form.city.trim(),
          region: form.region.trim(),
          postal: form.postcode.trim(),
          country: "PH",
          isDefault: true,
        }).catch(() => undefined);
      }
      setOrderNumber(result.orderNumber);
      setPlaced(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Checkout failed.");
    } finally {
      setPlacing(false);
    }
  };

  if (placed) {
    return (
      <main className="max-w-2xl mx-auto px-6 py-20 text-center">
        <div className="w-20 h-20 rounded-full bg-[var(--green-light)] flex items-center justify-center mx-auto mb-6">
          <Check size={36} style={{ color: "var(--green)" }} strokeWidth={2.5} />
        </div>
        <h1 className="text-3xl font-bold text-foreground mb-2">Order Confirmed</h1>
        <p className="text-muted-foreground mb-1">Thank you for your purchase.</p>
        <p className="text-muted-foreground text-sm mb-8">
          Your order <strong>#{orderNumber}</strong> has been created. Complete the transfer, then submit its reference and proof from My Orders.
        </p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <button
            onClick={() => onNavigate("home")}
            className="px-6 py-3 rounded-xl bg-primary text-primary-foreground font-semibold hover:bg-[var(--green-dark)] transition-colors"
          >
            Continue Shopping
          </button>
          <button
            onClick={() => onNavigate("orders")}
            className="px-6 py-3 rounded-xl border border-border text-foreground font-medium hover:bg-secondary transition-colors"
          >
            View My Orders
          </button>
        </div>
      </main>
    );
  }

  return (
    <main className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
      <nav className="flex items-center gap-1.5 text-sm text-muted-foreground mb-6" aria-label="Breadcrumb">
        <button onClick={() => onNavigate("home")} className="hover:text-foreground">Home</button>
        <ChevronRight size={13} />
        <button onClick={() => onNavigate("cart")} className="hover:text-foreground">Cart</button>
        <ChevronRight size={13} />
        <span className="text-foreground font-medium">Checkout</span>
      </nav>

      <div className="flex items-center mb-10 gap-0">
        {STEPS.map((label, index) => (
          <React.Fragment key={label}>
            <button
              onClick={() => index < step && setStep(index)}
              className={cn(
                "flex items-center gap-2 text-sm font-medium transition-colors",
                index === step ? "text-foreground" : index < step ? "text-[var(--green)] cursor-pointer" : "text-muted-foreground cursor-default",
              )}
            >
              <span
                className={cn(
                  "w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-all",
                  index === step
                    ? "bg-[var(--green)] text-white"
                    : index < step
                      ? "bg-[var(--green-light)] text-[var(--green)] border border-[var(--green)]"
                      : "bg-muted text-muted-foreground",
                )}
              >
                {index < step ? <Check size={13} /> : index + 1}
              </span>
              <span className="hidden sm:inline">{label}</span>
            </button>
            {index < STEPS.length - 1 && (
              <div className={cn("flex-1 h-px mx-3 transition-colors", index < step ? "bg-[var(--green)]" : "bg-border")} />
            )}
          </React.Fragment>
        ))}
      </div>

      <div className="grid lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-6">
          {step === 0 && (
            <section className="bg-card rounded-2xl border border-border p-6">
              <h2 className="font-bold text-foreground text-xl mb-2 flex items-center gap-2">
                <User size={20} style={{ color: "var(--green)" }} /> Contact Information
              </h2>
              <p className="text-sm text-muted-foreground mb-5">
                Checkout requires a signed-in account so your cart and order history stay connected.
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <InputField id="first-name" label="First Name" placeholder="Maria" required icon={<User size={14} />} value={form.firstName} onChange={value => updateForm("firstName", value)} error={errors.firstName} />
                <InputField id="last-name" label="Last Name" placeholder="Santos" required value={form.lastName} onChange={value => updateForm("lastName", value)} error={errors.lastName} />
                <InputField id="email" label="Email Address" type="email" placeholder="maria@email.com" required icon={<Mail size={14} />} value={form.email} onChange={value => updateForm("email", value)} error={errors.email} />
                <InputField id="phone" label="Phone Number" type="tel" placeholder="+63 917 123 4567" required icon={<Phone size={14} />} value={form.phone} onChange={value => updateForm("phone", value)} error={errors.phone} />
              </div>

              <button
                onClick={continueFromContact}
                className="mt-5 w-full h-12 rounded-2xl bg-primary text-primary-foreground font-semibold hover:bg-[var(--green-dark)] transition-all"
              >
                Continue to Shipping
              </button>
            </section>
          )}

          {step === 1 && (
            <section className="bg-card rounded-2xl border border-border p-6">
              <h2 className="font-bold text-foreground text-xl mb-5 flex items-center gap-2">
                <MapPin size={20} style={{ color: "var(--green)" }} /> Shipping Address
              </h2>
              {addresses.length > 0 && (
                <div className="mb-5 rounded-2xl border border-border bg-secondary/50 p-4">
                  <p className="mb-3 text-sm font-semibold text-foreground">Saved addresses</p>
                  <div className="grid gap-2 sm:grid-cols-2">
                    {addresses.map(address => (
                      <button
                        key={address.id}
                        type="button"
                        onClick={() => {
                          const [firstName, ...lastNameParts] = address.name.split(" ");
                          setForm(prev => ({
                            ...prev,
                            firstName: firstName || prev.firstName,
                            lastName: lastNameParts.join(" ") || prev.lastName,
                            phone: address.phone,
                            addressLine1: address.line1,
                            addressLine2: address.line2,
                            city: address.city,
                            region: address.region,
                            postcode: address.postal,
                          }));
                        }}
                        className="rounded-xl border border-border bg-card p-3 text-left text-sm hover:bg-secondary"
                      >
                        <span className="font-semibold text-foreground">{address.label}</span>
                        <span className="mt-1 block text-muted-foreground">{address.line1}, {address.city}</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="sm:col-span-2">
                  <InputField id="address" label="Address Line 1" placeholder="123 Marcos Highway" required icon={<MapPin size={14} />} value={form.addressLine1} onChange={value => updateForm("addressLine1", value)} error={errors.addressLine1} />
                </div>
                <InputField id="address2" label="Address Line 2 (optional)" placeholder="Unit 2" value={form.addressLine2} onChange={value => updateForm("addressLine2", value)} error={errors.addressLine2} />
                <label className="block">
                  <span className="mb-1.5 block text-sm font-medium text-foreground">Order notes (optional)</span>
                  <textarea
                    value={form.orderNote}
                    onChange={event => updateForm("orderNote", event.target.value.slice(0, 1000))}
                    placeholder="Delivery instructions, landmark, preferred time, or other notes"
                    className="min-h-24 w-full rounded-xl border border-border bg-input-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring/30"
                  />
                </label>
                <InputField id="city" label="City" placeholder="Antipolo" required value={form.city} onChange={value => updateForm("city", value)} error={errors.city} />
                <InputField id="region" label="Province / Region" placeholder="Rizal" required value={form.region} onChange={value => updateForm("region", value)} error={errors.region} />
                <InputField id="postcode" label="Postcode (optional)" placeholder="1870" value={form.postcode} onChange={value => updateForm("postcode", value)} error={errors.postcode} />
                <div className="sm:col-span-2">
                  <label htmlFor="country" className="text-sm font-medium text-foreground block mb-1.5">
                    Country
                  </label>
                  <input
                    id="country"
                    value="Philippines"
                    disabled
                    className="w-full h-11 rounded-xl border border-border bg-muted px-4 text-sm text-muted-foreground"
                  />
                </div>
              </div>
              <label className="mt-4 flex items-center gap-2 text-sm text-muted-foreground">
                <input type="checkbox" checked={saveAddress} onChange={event => setSaveAddress(event.target.checked)} />
                Save this as my default address
              </label>
              <div className="flex gap-3 mt-5">
                <button onClick={() => setStep(0)} className="h-12 px-5 rounded-2xl border border-border text-foreground font-medium hover:bg-secondary transition-colors text-sm">
                  Back
                </button>
                <button onClick={continueFromShipping} className="flex-1 h-12 rounded-2xl bg-primary text-primary-foreground font-semibold hover:bg-[var(--green-dark)] transition-all">
                  Continue to Payment
                </button>
              </div>
            </section>
          )}

          {step === 2 && (
            <section className="bg-card rounded-2xl border border-border p-6">
              <h2 className="font-bold text-foreground text-xl mb-5 flex items-center gap-2">
                <QrCode size={20} style={{ color: "var(--green)" }} /> Payment
              </h2>

              <div className="grid gap-3 sm:grid-cols-2 mb-6">
                <button
                  onClick={() => {
                    setPaymentMethod("GCASH");
                  }}
                  className={cn(
                    "min-h-24 rounded-2xl border p-4 text-left transition-all",
                    paymentMethod === "GCASH" ? "border-[var(--green)] bg-[var(--green-light)]" : "border-border hover:border-[var(--green-mid)]",
                  )}
                >
                  <QrCode size={20} className="mb-3 text-[var(--green)]" />
                  <p className="font-semibold text-foreground">GCash QR</p>
                  <p className="mt-1 text-xs text-muted-foreground">Pay by scanning the GCash QR after placing your order.</p>
                </button>
                <button
                  onClick={() => {
                    setPaymentMethod("BANK_TRANSFER");
                    setShowGcashQr(false);
                  }}
                  className={cn(
                    "min-h-24 rounded-2xl border p-4 text-left transition-all",
                    paymentMethod === "BANK_TRANSFER" ? "border-[var(--green)] bg-[var(--green-light)]" : "border-border hover:border-[var(--green-mid)]",
                  )}
                >
                  <Landmark size={20} className="mb-3 text-[var(--green)]" />
                  <p className="font-semibold text-foreground">Bank Transfer</p>
                  <p className="mt-1 text-xs text-muted-foreground">Use the bank details provided after your order is created.</p>
                </button>
              </div>

              {paymentMethod === "GCASH" && (
                <div className="rounded-2xl border border-border bg-secondary/60 p-4">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <p className="text-sm text-muted-foreground">
                      After placing the order, send payment through GCash QR, keep your reference number, and save or screenshot your payment confirmation for transaction verification.
                    </p>
                    <button
                      type="button"
                      onClick={() => setShowGcashQr(open => !open)}
                      className="inline-flex h-10 shrink-0 items-center justify-center gap-2 rounded-xl border border-border bg-card px-4 text-sm font-semibold text-foreground hover:bg-secondary"
                      aria-expanded={showGcashQr}
                    >
                      <QrCode size={15} />
                      {showGcashQr ? "Hide QR" : "Show QR"}
                    </button>
                  </div>
                  {showGcashQr && (
                    <div className="mt-4 flex justify-center rounded-2xl border border-border bg-white p-4">
                      <img
                        src={gcashQrUrl}
                        alt="GCash QR payment code"
                        className="h-72 w-72 max-w-full object-contain"
                      />
                    </div>
                  )}
                </div>
              )}

              {paymentMethod === "BANK_TRANSFER" && (
                <div className="rounded-2xl border border-border bg-muted p-4 text-sm text-muted-foreground select-none">
                  <p className="mb-3 font-semibold text-foreground">Bank transfer details</p>
                  <div className="grid gap-2">
                    <div className="flex flex-col gap-1 sm:flex-row sm:justify-between">
                      <span>Bank Name</span>
                      <span className="font-semibold text-foreground">{BANK_TRANSFER_DETAILS.bankName}</span>
                    </div>
                    <div className="flex flex-col gap-1 sm:flex-row sm:justify-between">
                      <span>Account Number</span>
                      <span className="font-semibold text-foreground">{BANK_TRANSFER_DETAILS.accountNumber}</span>
                    </div>
                    <div className="flex flex-col gap-1 sm:flex-row sm:justify-between">
                      <span>Account Name</span>
                      <span className="font-semibold text-foreground">{BANK_TRANSFER_DETAILS.accountName}</span>
                    </div>
                  </div>
                  <p className="mt-3 text-xs">
                    After placing the order, transfer the total amount, keep your bank reference number, and save or screenshot your payment confirmation for transaction verification.
                  </p>
                </div>
              )}

              <div className="flex flex-wrap items-center justify-center gap-4 mt-5 pt-5 border-t border-border">
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <Shield size={13} style={{ color: "var(--green)" }} /> Secure checkout
                </div>
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <Lock size={13} style={{ color: "var(--green)" }} /> Account-protected order
                </div>
              </div>

              <div className="flex gap-3 mt-5">
                <button onClick={() => setStep(1)} className="h-12 px-5 rounded-2xl border border-border text-foreground font-medium hover:bg-secondary transition-colors text-sm">
                  Back
                </button>
                <button
                  onClick={handlePlaceOrder}
                  disabled={placing}
                  className="flex-1 h-12 rounded-2xl bg-primary text-primary-foreground font-bold flex items-center justify-center gap-2 hover:bg-[var(--green-dark)] transition-all disabled:opacity-70"
                >
                  {placing ? (
                    <><span className="w-5 h-5 rounded-full border-2 border-white border-t-transparent animate-spin" /> Processing...</>
                  ) : (
                    <>Place Order - {formatCurrency(total)}</>
                  )}
                </button>
              </div>
              {error && <p className="text-sm text-destructive mt-3">{error}</p>}
            </section>
          )}
        </div>

        <aside className="lg:col-span-1">
          <div className="bg-card rounded-2xl border border-border p-5 sticky top-24">
            <h3 className="font-bold text-foreground mb-4">Order Summary</h3>
            <div className="space-y-3 mb-4">
              {cartItems.map(item => (
                <div key={`${item.product.id}-${item.size}`} className="flex gap-3 items-center">
                  <div className="relative w-12 h-12 rounded-xl overflow-hidden bg-secondary shrink-0">
                    <ProductImage product={item.product} className="h-full w-full object-cover" />
                    <span className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-[var(--green)] text-white text-[9px] flex items-center justify-center font-bold">
                      {item.qty}
                    </span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">{item.product.name}</p>
                    <p className="text-xs text-muted-foreground">{item.size}</p>
                    {(!item.product.inStock || (item.product.availableQuantity ?? item.qty) < item.qty) && (
                      <p className="mt-1 text-xs font-semibold text-destructive">
                        Only {item.product.availableQuantity ?? 0} available. Update cart quantity.
                      </p>
                    )}
                  </div>
                  <span className="text-sm font-semibold">{formatCurrency(item.product.price * item.qty)}</span>
                </div>
              ))}
            </div>
            <div className="space-y-2 border-t border-border pt-3 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Subtotal</span>
                <span>{formatCurrency(subtotal)}</span>
              </div>
              {promo && (
                <div className="flex justify-between text-[var(--green)]">
                  <span>{promo.code} ({promo.percentOff}% off)</span>
                  <span>-{formatCurrency(discount)}</span>
                </div>
              )}
              <div className="flex justify-between font-bold text-base border-t border-border pt-2 mt-1">
                <span>Total</span>
                <span>{formatCurrency(total)}</span>
              </div>
            </div>
            <div className="mt-4 flex items-center gap-2 text-xs text-muted-foreground">
              <Shield size={12} style={{ color: "var(--green)" }} />
              Sign-in required so your cart and order are protected
            </div>
          </div>
        </aside>
      </div>
    </main>
  );
}
