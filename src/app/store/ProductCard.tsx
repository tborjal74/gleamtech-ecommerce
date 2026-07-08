import React, { useEffect, useState } from "react";
import { Heart, ShoppingCart, Eye } from "lucide-react";
import { cn } from "../components/ui/utils";
import { RatingStars, Badge, QtySelector } from "./ui";
import type { Product } from "./types";
import { formatCurrency } from "./currency";
import { fallbackProductImage } from "./productImages";

interface ProductCardProps {
  product: Product;
  onAddToCart: (p: Product, qty: number, size: string) => void;
  onView: (p: Product) => void;
  isWishlisted?: boolean;
  onToggleWishlist?: (id: string) => void;
}

function badgeColor(badge?: string): "green" | "yellow" | "blue" | "red" | "gray" {
  if (!badge) return "gray";
  if (badge === "Eco") return "green";
  if (badge === "Best Seller") return "yellow";
  if (badge === "Bundle Deal") return "blue";
  if (badge === "Out of Stock") return "gray";
  return "red"; // discounts
}

export function ProductCard({ product, onAddToCart, onView, isWishlisted, onToggleWishlist }: ProductCardProps) {
  const [qty, setQty] = useState(1);
  const [selectedSize, setSelectedSize] = useState(product.sizes[0]);
  const [adding, setAdding] = useState(false);
  const [imageSrc, setImageSrc] = useState(product.image || fallbackProductImage(product));

  const discount = product.originalPrice
    ? Math.round((1 - product.price / product.originalPrice) * 100)
    : null;

  const handleAdd = () => {
    setAdding(true);
    onAddToCart(product, qty, selectedSize);
    setTimeout(() => setAdding(false), 800);
  };

  useEffect(() => {
    setImageSrc(product.image || fallbackProductImage(product));
  }, [product]);

  return (
    <div className="group relative bg-card rounded-2xl border border-border overflow-hidden hover:shadow-md hover:border-[var(--green-mid)]/40 transition-all duration-200 flex flex-col">
      {/* Image area */}
      <div
        role="button"
        tabIndex={0}
        onClick={() => onView(product)}
        onKeyDown={event => {
          if (event.key === "Enter" || event.key === " ") {
            event.preventDefault();
            onView(product);
          }
        }}
        className="relative overflow-hidden bg-[var(--green-light)] aspect-square text-left focus:outline-none focus:ring-2 focus:ring-[var(--green)]"
        aria-label={`View ${product.name}`}
      >
        <img
          src={imageSrc}
          alt={product.name}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
          loading="lazy"
          onError={() => {
            const fallback = fallbackProductImage(product);
            if (imageSrc !== fallback) setImageSrc(fallback);
          }}
        />

        {/* Badges */}
        <div className="absolute top-3 left-3 flex flex-col gap-1.5">
          {product.badge && (
            <Badge label={product.badge} color={badgeColor(product.badge)} />
          )}
          {discount && (
            <Badge label={`-${discount}%`} color="red" />
          )}
          {product.isEco && !product.badge?.includes("Eco") && (
            <Badge label="🌿 Eco" color="green" />
          )}
        </div>

        {/* Wishlist */}
        <button
          onClick={event => {
            event.stopPropagation();
            onToggleWishlist?.(product.id);
          }}
          className={cn(
            "absolute top-3 right-3 w-8 h-8 rounded-full bg-white/90 backdrop-blur-sm flex items-center justify-center transition-all opacity-0 group-hover:opacity-100",
            isWishlisted ? "text-red-500" : "text-muted-foreground hover:text-red-400"
          )}
          aria-label={isWishlisted ? "Remove from wishlist" : "Add to wishlist"}
        >
          <Heart size={15} fill={isWishlisted ? "currentColor" : "none"} />
        </button>

        {/* Quick view */}
        <button
          onClick={event => {
            event.stopPropagation();
            onView(product);
          }}
          className="absolute bottom-3 right-3 flex items-center gap-1.5 bg-white/90 backdrop-blur-sm text-foreground text-xs font-medium px-3 py-1.5 rounded-full opacity-0 group-hover:opacity-100 transition-all hover:bg-white"
        >
          <Eye size={12} />
          Quick View
        </button>

        {/* Out of stock overlay */}
        {!product.inStock && (
          <div className="absolute inset-0 bg-white/70 flex items-center justify-center">
            <span className="text-sm font-semibold text-muted-foreground">Out of Stock</span>
          </div>
        )}
      </div>

      {/* Card body */}
      <div className="flex flex-col flex-1 p-4 gap-3">
        {/* Category + name */}
        <div>
          <p className="text-xs text-[var(--green)] font-medium uppercase tracking-wider mb-0.5">
            {product.category}
          </p>
          <h3
            className="font-semibold text-foreground leading-snug hover:text-[var(--green)] cursor-pointer transition-colors"
            onClick={() => onView(product)}
            style={{ fontSize: "14.5px" }}
          >
            {product.name}
          </h3>
          <p className="text-muted-foreground text-xs mt-0.5 line-clamp-1">{product.shortDesc}</p>
        </div>

        {/* Rating */}
        <div className="flex items-center gap-2">
          <RatingStars rating={product.rating} size={13} />
          <span className="text-xs text-muted-foreground">{product.rating} ({product.reviewCount})</span>
        </div>

        {/* Size selector */}
        {product.sizes.length > 1 && (
          <div className="flex flex-wrap gap-1.5">
            {product.sizes.map(s => (
              <button
                key={s}
                onClick={() => setSelectedSize(s)}
                className={cn(
                  "px-2.5 py-1 rounded-lg border text-xs font-medium transition-all",
                  selectedSize === s
                    ? "border-[var(--green)] bg-[var(--green-light)] text-[var(--green)]"
                    : "border-border text-muted-foreground hover:border-[var(--green-mid)]"
                )}
              >
                {s}
              </button>
            ))}
          </div>
        )}

        {/* Price + qty */}
        <div className="flex items-center justify-between mt-auto gap-2">
          <div className="flex items-baseline gap-1.5">
            <span className="text-lg font-bold text-foreground">{formatCurrency(product.price)}</span>
            {product.originalPrice && (
              <span className="text-sm text-muted-foreground line-through">{formatCurrency(product.originalPrice)}</span>
            )}
          </div>
          <QtySelector qty={qty} onChange={setQty} size="sm" />
        </div>

        {/* Add to cart */}
        <button
          onClick={handleAdd}
          disabled={!product.inStock || adding}
          className={cn(
            "w-full flex items-center justify-center gap-2 h-10 rounded-xl font-medium text-sm transition-all",
            product.inStock
              ? adding
                ? "bg-[var(--green-light)] text-[var(--green)]"
                : "bg-primary text-primary-foreground hover:bg-[var(--green-dark)] active:scale-[0.98]"
              : "bg-muted text-muted-foreground cursor-not-allowed"
          )}
        >
          {adding ? (
            <>
              <span className="w-4 h-4 rounded-full border-2 border-[var(--green)] border-t-transparent animate-spin" />
              Added!
            </>
          ) : (
            <>
              <ShoppingCart size={15} />
              {product.inStock ? "Add to Cart" : "Out of Stock"}
            </>
          )}
        </button>
      </div>
    </div>
  );
}
