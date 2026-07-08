import React from "react";
import { Heart } from "lucide-react";
import { ProductCard } from "../ProductCard";
import type { Page, Product } from "../types";

export function WishlistPage({
  products,
  wishlist,
  onAddToCart,
  onViewProduct,
  onToggleWishlist,
  onNavigate,
}: {
  products: Product[];
  wishlist: Set<string>;
  onAddToCart: (p: Product, qty: number, size: string) => void;
  onViewProduct: (p: Product) => void;
  onToggleWishlist: (id: string) => void;
  onNavigate: (page: Page) => void;
}) {
  const saved = products.filter(product => wishlist.has(product.id));
  return (
    <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
      <div className="mb-6">
        <p className="text-sm font-semibold uppercase tracking-widest text-[var(--green)]">My Account</p>
        <h1 className="mt-1 text-3xl font-bold text-foreground">Saved items</h1>
        <p className="mt-1 text-sm text-muted-foreground">Products you saved for later.</p>
      </div>
      {saved.length === 0 ? (
        <section className="rounded-2xl border border-border bg-card p-8 text-center">
          <Heart className="mx-auto text-muted-foreground" size={28} />
          <h2 className="mt-3 font-bold text-foreground">No saved items yet</h2>
          <p className="mt-1 text-sm text-muted-foreground">Tap the heart on a product to save it here.</p>
          <button onClick={() => onNavigate("listing")} className="mt-5 h-11 rounded-xl bg-primary px-5 text-sm font-semibold text-primary-foreground">
            Browse products
          </button>
        </section>
      ) : (
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {saved.map(product => (
            <ProductCard
              key={product.id}
              product={product}
              onAddToCart={onAddToCart}
              onView={onViewProduct}
              isWishlisted
              onToggleWishlist={onToggleWishlist}
            />
          ))}
        </div>
      )}
    </main>
  );
}
