import React, { useState } from "react";
import { Trash2, ChevronRight, Tag, ShoppingBag, Leaf, ArrowRight, Plus, Minus } from "lucide-react";
import { ProductCard } from "../ProductCard";
import { cn } from "../../components/ui/utils";
import type { CartItem, Product, Page } from "../types";
import { formatCurrency } from "../currency";
import type { PromoCode } from "../../api";

interface CartPageProps {
  cartItems: CartItem[];
  onUpdateQty: (productId: string, qty: number) => void;
  onRemove: (productId: string) => void;
  onAddToCart: (p: Product, qty: number, size: string) => void;
  onViewProduct: (p: Product) => void;
  onNavigate: (page: Page) => void;
  wishlist: Set<string>;
  onToggleWishlist: (id: string) => void;
  products: Product[];
  promos: PromoCode[];
  onCheckout: (promoCode: string | null) => void;
}

export function CartPage({ cartItems, onUpdateQty, onRemove, onAddToCart, onViewProduct, onNavigate, wishlist, onToggleWishlist, products, promos, onCheckout }: CartPageProps) {
  const [promoCode, setPromoCode] = useState("");
  const [appliedPromo, setAppliedPromo] = useState<string | null>(null);
  const [promoError, setPromoError] = useState("");

  const subtotal = cartItems.reduce((s, i) => s + i.product.price * i.qty, 0);
  const activePromo = appliedPromo ? promos.find(promo => promo.code === appliedPromo) : null;
  const discountPct = activePromo?.percentOff ?? 0;
  const discountAmount = (subtotal * discountPct) / 100;
  const total = subtotal - discountAmount;
  const stockWarnings = cartItems.filter(item => !item.product.inStock || (item.product.availableQuantity ?? item.qty) < item.qty);

  const applyPromo = () => {
    const code = promoCode.toUpperCase().trim();
    if (promos.some(promo => promo.code === code)) {
      setAppliedPromo(code);
      setPromoError("");
    } else {
      setPromoError("Invalid or expired promo code.");
    }
  };

  const recommendations = products.filter(p => !cartItems.some(i => i.product.id === p.id) && p.inStock).slice(0, 4);

  if (cartItems.length === 0) {
    return (
      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-16">
        <nav className="flex items-center gap-1.5 text-sm text-muted-foreground mb-8" aria-label="Breadcrumb">
          <button onClick={() => onNavigate("home")} className="hover:text-foreground">Home</button>
          <ChevronRight size={13} />
          <span className="text-foreground font-medium">Cart</span>
        </nav>
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div className="w-20 h-20 rounded-full bg-secondary flex items-center justify-center mb-5">
            <ShoppingBag size={36} className="text-muted-foreground/40" />
          </div>
          <h1 className="text-2xl font-bold text-foreground mb-2">Your cart is empty</h1>
          <p className="text-muted-foreground text-sm mb-6">Looks like you haven't added anything yet.</p>
          <button
            onClick={() => onNavigate("listing")}
            className="flex items-center gap-2 px-7 py-3 rounded-xl bg-primary text-primary-foreground font-semibold hover:bg-[var(--green-dark)] transition-colors"
          >
            Browse Products <ArrowRight size={16} />
          </button>
        </div>
      </main>
    );
  }

  return (
    <main className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
      {/* Breadcrumb */}
      <nav className="flex items-center gap-1.5 text-sm text-muted-foreground mb-6" aria-label="Breadcrumb">
        <button onClick={() => onNavigate("home")} className="hover:text-foreground">Home</button>
        <ChevronRight size={13} />
        <span className="text-foreground font-medium">Cart ({cartItems.reduce((s, i) => s + i.qty, 0)} items)</span>
      </nav>

      <h1 className="text-2xl sm:text-3xl font-bold text-foreground mb-8">Shopping Cart</h1>

      <div className="grid lg:grid-cols-3 gap-8">
        {/* Cart items */}
        <div className="lg:col-span-2 space-y-4">
          {cartItems.map(item => (
            <div key={`${item.product.id}-${item.size}`} className="bg-card rounded-2xl border border-border p-4 sm:p-5 flex gap-4">
              {/* Image */}
              <button
                onClick={() => onViewProduct(item.product)}
                className="w-24 h-24 sm:w-28 sm:h-28 rounded-xl overflow-hidden bg-[var(--green-light)] shrink-0"
              >
                <img src={item.product.image} alt={item.product.name} className="w-full h-full object-cover hover:scale-105 transition-transform" />
              </button>

              {/* Details */}
              <div className="flex-1 min-w-0 flex flex-col gap-2">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <button
                      onClick={() => onViewProduct(item.product)}
                      className="font-semibold text-foreground text-sm sm:text-base hover:text-[var(--green)] transition-colors text-left"
                    >
                      {item.product.name}
                    </button>
                    <p className="text-xs text-muted-foreground">{item.product.brand} · {item.size}</p>
                    {item.product.isEco && (
                      <span className="inline-flex items-center gap-1 text-xs text-[var(--green)] mt-0.5">
                        <Leaf size={10} /> Eco-Friendly
                      </span>
                    )}
                    {(!item.product.inStock || (item.product.availableQuantity ?? item.qty) < item.qty) && (
                      <p className="mt-1 text-xs font-semibold text-destructive">
                        Only {item.product.availableQuantity ?? 0} available. Please adjust quantity.
                      </p>
                    )}
                  </div>
                  <button
                    onClick={() => onRemove(item.product.id)}
                    className="text-muted-foreground hover:text-destructive transition-colors shrink-0"
                    aria-label={`Remove ${item.product.name}`}
                  >
                    <Trash2 size={16} />
                  </button>
                </div>

                <div className="flex items-center justify-between mt-auto">
                  {/* Qty controls */}
                  <div className="flex items-center border border-border rounded-xl overflow-hidden">
                    <button
                      onClick={() => item.qty <= 1 ? onRemove(item.product.id) : onUpdateQty(item.product.id, item.qty - 1)}
                      className="w-9 h-9 flex items-center justify-center text-muted-foreground hover:bg-secondary transition-colors"
                      aria-label="Decrease quantity"
                    >
                      <Minus size={13} />
                    </button>
                    <span className="px-4 text-sm font-semibold border-x border-border">{item.qty}</span>
                    <button
                      onClick={() => onUpdateQty(item.product.id, item.qty + 1)}
                      className="w-9 h-9 flex items-center justify-center text-muted-foreground hover:bg-secondary transition-colors"
                      aria-label="Increase quantity"
                    >
                      <Plus size={13} />
                    </button>
                  </div>
                  {/* Price */}
                  <div className="text-right">
                    <p className="font-bold text-foreground">{formatCurrency(item.product.price * item.qty)}</p>
                    {item.qty > 1 && (
                      <p className="text-xs text-muted-foreground">{formatCurrency(item.product.price)} each</p>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))}

          {/* Continue shopping */}
          <button
            onClick={() => onNavigate("listing")}
            className="flex items-center gap-2 text-sm text-[var(--green)] hover:underline font-medium"
          >
            ← Continue Shopping
          </button>
        </div>

        {/* Order summary */}
        <div className="lg:col-span-1">
          <div className="bg-card rounded-2xl border border-border p-5 sticky top-24">
            <h2 className="font-bold text-foreground text-lg mb-5">Order Summary</h2>

            {/* Promo code */}
            <div className="mb-5">
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Tag size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
                  <input
                    type="text"
                    placeholder="Promo code"
                    value={promoCode}
                    onChange={e => setPromoCode(e.target.value)}
                    onKeyDown={e => e.key === "Enter" && applyPromo()}
                    className={cn(
                      "w-full h-10 pl-9 pr-3 rounded-xl border text-sm text-foreground placeholder:text-muted-foreground outline-none transition-all bg-input-background",
                      promoError ? "border-destructive focus:ring-destructive/30" : "border-border focus:ring-2 focus:ring-ring/30 focus:border-ring"
                    )}
                    aria-label="Enter promo code"
                  />
                </div>
                <button
                  onClick={applyPromo}
                  className="px-4 h-10 rounded-xl bg-secondary text-secondary-foreground text-sm font-medium hover:bg-[var(--green-light)] border border-[var(--green-mid)]/30 transition-colors"
                >
                  Apply
                </button>
              </div>
              {promoError && <p className="text-xs text-destructive mt-1.5">{promoError}</p>}
              {appliedPromo && (
                <div className="flex items-center justify-between mt-2 px-3 py-2 rounded-lg bg-[var(--green-light)] text-[var(--green)]">
                  <span className="text-xs font-medium">✓ {appliedPromo} - {discountPct}% off</span>
                  <button onClick={() => { setAppliedPromo(null); setPromoCode(""); }} className="text-xs hover:opacity-70">Remove</button>
                </div>
              )}
            </div>

            {/* Cost breakdown */}
            <div className="space-y-3 border-t border-border pt-4 mb-4">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Subtotal ({cartItems.reduce((s, i) => s + i.qty, 0)} items)</span>
                <span className="font-medium">{formatCurrency(subtotal)}</span>
              </div>
              {appliedPromo && (
                <div className="flex justify-between text-sm">
                  <span className="text-[var(--green)]">Discount ({discountPct}%)</span>
                  <span className="font-medium text-[var(--green)]">-{formatCurrency(discountAmount)}</span>
                </div>
              )}
            </div>

            <div className="flex justify-between font-bold text-lg border-t border-border pt-4 mb-5">
              <span>Total</span>
              <span>{formatCurrency(total)}</span>
            </div>

            <button
              onClick={() => onCheckout(appliedPromo)}
              disabled={stockWarnings.length > 0}
              className="w-full h-13 rounded-2xl bg-primary text-primary-foreground font-bold text-base flex items-center justify-center gap-2 hover:bg-[var(--green-dark)] active:scale-[0.98] transition-all disabled:cursor-not-allowed disabled:opacity-50"
              style={{ height: "52px" }}
            >
              Proceed to Checkout <ArrowRight size={18} />
            </button>

            <div className="flex items-center justify-center gap-2 mt-4">
              {["GCash", "Bank transfer"].map(p => (
                <div key={p} className="px-2 py-1 rounded bg-secondary text-[9px] font-bold text-muted-foreground border border-border">
                  {p}
                </div>
              ))}
            </div>

          </div>
        </div>
      </div>

      {/* Recommended add-ons */}
      {recommendations.length > 0 && (
        <div className="mt-14">
          <h2 className="text-xl font-bold text-foreground mb-6">You might also like</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {recommendations.map(p => (
              <ProductCard
                key={p.id}
                product={p}
                onAddToCart={onAddToCart}
                onView={onViewProduct}
                isWishlisted={wishlist.has(p.id)}
                onToggleWishlist={onToggleWishlist}
              />
            ))}
          </div>
        </div>
      )}
    </main>
  );
}
