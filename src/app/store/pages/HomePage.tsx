import React, { useState } from "react";
import { ArrowRight, Leaf, Truck, ShieldCheck, Star, Package, ChevronRight } from "lucide-react";
import { ProductCard } from "../ProductCard";
import { RatingStars, Badge, SectionHeader } from "../ui";
import { fallbackProductImage } from "../productImages";
import type { Product, Page } from "../types";
import type { HomepageContent, ReviewSummary, StorefrontReview } from "../../api";

const heroAsset = (filename: string) => new URL(`../../../../assets/${filename}`, import.meta.url).href;

interface HomePageProps {
  onAddToCart: (p: Product, qty: number, size: string) => void;
  onViewProduct: (p: Product) => void;
  onNavigate: (page: Page) => void;
  wishlist: Set<string>;
  onToggleWishlist: (id: string) => void;
  products: Product[];
  productLoading: boolean;
  productError: string;
  onRefreshProducts: () => Promise<void>;
  content: HomepageContent | null | undefined;
  reviews: StorefrontReview[];
  reviewSummary: ReviewSummary;
}

const DEFAULT_HOME_CONTENT = {
  eyebrow: "Gleamtech Essentials",
  headline: "Reliable, Safe and Efficient",
  subheadline: "Powerful cleaning products for every room, backed by secure checkout and fast Gleamtech delivery.",
  primaryCta: "Shop Now",
  secondaryCta: "View Bundles",
  heroImage: heroAsset("hero-image-1.webp"),
  subHeroImageLeft: heroAsset("sub-hero-image-2.webp"),
  subHeroImageRight: heroAsset("sub-hero-image-3.webp"),
  promoLabel: "Limited Time",
  promoHeadline: "Save with verified promo codes",
  promoText: "Apply an eligible promo code in your cart. Your discount is verified again when the order is placed.",
  promiseOneTitle: "Powerful Clean, Naturally",
  promiseOneText: "Plant-powered formulas that tackle grease, grime, and everyday messes without harsh chemicals",
  promiseTwoTitle: "Satisfaction Guaranteed",
  promiseTwoText: "Love your Gleamtech clean, or we'll make it right with friendly support and easy resolutions",
};

const BASE_BENEFITS = [
  { icon: Leaf, title: "Safe Ingredients", desc: "Plant-derived formulas safe for kids, pets, and the planet", color: "var(--green-light)", accent: "var(--green)" },
  { icon: Truck, title: "Delivery Support", desc: "Delivery coordination is provided after payment confirmation", color: "var(--blue-light)", accent: "var(--blue)" },
];

const CATEGORY_COLORS = ["#EAF7E7", "#E8F7FA", "#EAF4FD", "#FFF6D8", "#F6EEFF", "#FFF0EA"];

export function HomePage({ onAddToCart, onViewProduct, onNavigate, wishlist, onToggleWishlist, products, productLoading, productError, onRefreshProducts, content, reviews, reviewSummary }: HomePageProps) {
  const bestSellers = products.filter(p => p.inStock).slice(0, 4);
  const home = content ?? DEFAULT_HOME_CONTENT;
  const headlineParts = home.headline.split(",");
  const categories = Array.from(
    products.reduce((items, product) => {
      const current = items.get(product.category);
      items.set(product.category, {
        name: product.category,
        count: (current?.count ?? 0) + 1,
        image: current?.image || product.image,
        fallbackImage: current?.fallbackImage || fallbackProductImage(product),
      });
      return items;
    }, new Map<string, { name: string; count: number; image: string; fallbackImage: string }>()),
  ).map(([id, category], index) => ({ ...category, id, color: CATEGORY_COLORS[index % CATEGORY_COLORS.length] }));
  const benefits = [
    ...BASE_BENEFITS,
    { icon: Package, title: home.promiseOneTitle, desc: home.promiseOneText, color: "var(--yellow-light)", accent: "var(--yellow)" },
    { icon: ShieldCheck, title: home.promiseTwoTitle, desc: home.promiseTwoText, color: "var(--teal-light)", accent: "var(--teal)" },
  ];

  return (
    <main>
      {/* ── Hero ─────────────────────────────────────────────── */}
      <section
        className="relative overflow-hidden"
        style={{ background: "linear-gradient(135deg, var(--green-light) 0%, #fff 48%, var(--blue-light) 100%)" }}
      >
        <div className="max-w-7xl mx-auto px-6 py-16 lg:py-24 grid lg:grid-cols-2 gap-12 items-center">
          <div>
            <Badge label={home.eyebrow} color="green" className="mb-4 text-xs" />
            <h1
              className="text-4xl sm:text-5xl lg:text-6xl font-bold text-foreground leading-[1.1] mb-5"
              aria-live="polite"
            >
              {content === undefined ? (
                <span className="inline-block min-h-[1.1em] min-w-[9ch] animate-pulse rounded-lg bg-foreground/10 text-transparent" aria-label="Loading headline">
                  Reliable
                </span>
              ) : (
                <>
                  {headlineParts[0]}
                  {headlineParts.length > 1 ? <><br /><span style={{ color: "var(--green)" }}>{headlineParts.slice(1).join(",").trim()}</span></> : null}
                </>
              )}
            </h1>
            <p className="text-muted-foreground text-lg leading-relaxed mb-8 max-w-md">
              {home.subheadline}
            </p>
            <div className="flex flex-wrap gap-3">
              <button
                onClick={() => onNavigate("listing")}
                className="flex items-center gap-2 h-13 px-8 rounded-2xl font-semibold text-white text-base transition-all hover:bg-[var(--green-dark)] active:scale-[0.98]"
                style={{ background: "var(--green)", height: "52px" }}
              >
                {home.primaryCta} <ArrowRight size={18} />
              </button>
              <button
                onClick={() => onNavigate("listing")}
                className="flex items-center gap-2 h-13 px-8 rounded-2xl font-semibold border border-border bg-white/80 backdrop-blur-sm text-foreground text-base hover:bg-white transition-all"
                style={{ height: "52px" }}
              >
                {home.secondaryCta}
              </button>
            </div>
            {/* Trust signals */}
            <div className="flex flex-wrap items-center gap-5 mt-8 text-sm text-muted-foreground">
              {reviewSummary.count > 0 && (
                <span className="flex items-center gap-1.5"><Star size={14} fill="var(--yellow)" stroke="none" /><strong className="text-foreground">{reviewSummary.average}/5</strong> from {reviewSummary.count.toLocaleString()} review{reviewSummary.count === 1 ? "" : "s"}</span>
              )}
              <span className="flex items-center gap-1.5"><Truck size={14} /> Delivery coordinated after payment</span>
              <span className="flex items-center gap-1.5"><Leaf size={14} style={{ color: "var(--green)" }} /> Bright home essentials</span>
            </div>
          </div>

          {/* Hero images collage */}
          <div className="relative hidden lg:grid grid-cols-2 gap-3 h-[460px]">
            <div className="col-span-2 rounded-2xl overflow-hidden shadow-lg" style={{ height: "280px" }}>
              <img
                src={home.heroImage}
                alt="Gleamtech cleaning essentials"
                className="w-full h-full object-cover"
              />
            </div>
            <div className="rounded-2xl overflow-hidden shadow-md">
              <img
                src={home.subHeroImageLeft}
                alt="Gleamtech product care"
                className="w-full h-full object-cover"
              />
            </div>
            <div className="rounded-2xl overflow-hidden shadow-md">
              <img
                src={home.subHeroImageRight}
                alt="Gleamtech home cleaning products"
                className="w-full h-full object-cover"
              />
            </div>
          </div>
        </div>
      </section>

      {/* ── Categories ─────────────────────────────────────── */}
      <section className="max-w-7xl mx-auto px-6 py-16">
        <SectionHeader
          eyebrow="Browse by Room"
          title="Shop by Category"
          subtitle="Everything you need to keep every corner spotless"
          action={
            <button
              onClick={() => onNavigate("listing")}
              className="hidden sm:flex items-center gap-1 text-sm font-medium text-[var(--green)] hover:underline"
            >
              View all <ChevronRight size={15} />
            </button>
          }
        />
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
          {categories.map(cat => (
            <button
              key={cat.id}
              onClick={() => onNavigate("listing")}
              className="group flex flex-col items-center gap-3 p-4 rounded-2xl border border-border bg-card hover:border-[var(--green-mid)]/50 hover:shadow-md transition-all text-center"
            >
              <div
                className="w-full aspect-square rounded-xl overflow-hidden"
                style={{ background: cat.color }}
              >
                <CategoryThumbnail src={cat.image} fallback={cat.fallbackImage} alt={cat.name} />
              </div>
              <div>
                <p className="font-semibold text-sm text-foreground">{cat.name}</p>
                <p className="text-xs text-muted-foreground">{cat.count} products</p>
              </div>
            </button>
          ))}
        </div>
      </section>

      {/* ── Best Sellers ──────────────────────────────────── */}
      <section className="py-16" style={{ background: "var(--secondary)" }}>
        <div className="max-w-7xl mx-auto px-6">
          <SectionHeader
            eyebrow="Top Rated"
            title="Best Selling Products"
            subtitle="Our customers' most-loved cleaning essentials"
            action={
              <button
                onClick={() => onNavigate("listing")}
                className="flex items-center gap-1 text-sm font-medium text-[var(--green)] hover:underline"
              >
                View all products <ChevronRight size={15} />
              </button>
            }
          />
          {productLoading ? (
            <CatalogState text="Loading live products..." />
          ) : productError ? (
            <CatalogState text="Product catalog is unavailable." actionLabel="Retry" onAction={onRefreshProducts} />
          ) : bestSellers.length === 0 ? (
            <CatalogState text="No published products are available yet." />
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
              {bestSellers.map(p => (
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
          )}
        </div>
      </section>

      {/* ── Promo Banner ─────────────────────────────────── */}
      <section className="max-w-7xl mx-auto px-6 py-16">
        <div
          className="relative overflow-hidden rounded-3xl px-8 sm:px-12 py-12"
          style={{ background: "linear-gradient(135deg, var(--green) 0%, var(--teal) 46%, var(--blue) 100%)" }}
        >
          {/* Decorative circles */}
          <div className="absolute top-0 right-0 w-64 h-64 rounded-full opacity-10 -translate-y-1/3 translate-x-1/3"
            style={{ background: "white" }} />
          <div className="absolute bottom-0 left-16 w-40 h-40 rounded-full opacity-10 translate-y-1/3"
            style={{ background: "white" }} />

          <div className="relative flex flex-col sm:flex-row items-center justify-between gap-8">
            <div className="text-white text-center sm:text-left">
              <Badge label={home.promoLabel} color="yellow" className="mb-3" />
              <h3 className="text-3xl font-bold mb-2">{home.promoHeadline}</h3>
              <p className="text-cyan-100 text-base">
                {home.promoText}
              </p>
              <ul className="mt-4 space-y-1 text-sm text-cyan-100">
                <li>✓ Enter an eligible code in your cart</li>
                <li>✓ Discount is verified securely at checkout</li>
                <li>✓ Delivery instructions sent after payment confirmation</li>
              </ul>
            </div>
            <div className="shrink-0 text-center">
              <div className="text-white/80 text-sm mb-1">Save up to</div>
              <div className="text-5xl font-black text-white">SAVE</div>
              <div className="text-white/80 text-sm">with active offers</div>
              <button
                onClick={() => onNavigate("listing")}
                className="mt-5 flex items-center gap-2 px-7 py-3.5 rounded-xl font-semibold text-[var(--green)] bg-white hover:bg-cyan-50 transition-colors mx-auto"
              >
                Shop Bundles <ArrowRight size={16} />
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* ── Benefits ─────────────────────────────────────── */}
      <section className="py-16" style={{ background: "var(--secondary)" }}>
        <div className="max-w-7xl mx-auto px-6">
          <SectionHeader eyebrow="Why Choose Us" title="The Gleamtech Promise" />
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {benefits.map(b => (
              <div key={b.title} className="bg-card rounded-2xl border border-border p-6">
                <div
                  className="w-12 h-12 rounded-2xl flex items-center justify-center mb-4"
                  style={{ background: b.color }}
                >
                  <b.icon size={22} style={{ color: b.accent }} />
                </div>
                <h4 className="font-semibold text-foreground mb-2">{b.title}</h4>
                <p className="text-sm text-muted-foreground leading-relaxed">{b.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Reviews ──────────────────────────────────────── */}
      {reviews.length > 0 && <section className="max-w-7xl mx-auto px-6 py-16">
        <SectionHeader
          eyebrow="Customer Love"
          title="What Our Customers Say"
          subtitle="Real reviews from real households"
        />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {reviews.map(review => (
            <div key={review.id} className="bg-card rounded-2xl border border-border p-5 flex flex-col gap-3">
              <div className="flex items-center justify-between">
                <RatingStars rating={review.rating} size={14} />
                {review.verified && (
                  <span className="text-xs text-[var(--green)] font-medium">✓ Verified</span>
                )}
              </div>
              <p className="text-sm text-foreground leading-relaxed flex-1">"{review.comment}"</p>
              <div>
                <p className="text-xs text-muted-foreground">{review.productName}</p>
                <div className="flex items-center gap-2 mt-2">
                  <div
                    className="w-7 h-7 rounded-full flex items-center justify-center text-white text-xs font-bold"
                    style={{ background: "var(--green)" }}
                  >
                    {review.customerName.charAt(0)}
                  </div>
                  <div>
                    <p className="text-xs font-medium text-foreground">{review.customerName}</p>
                    <p className="text-xs text-muted-foreground">{new Date(review.createdAt).toLocaleDateString()}</p>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
        {/* Overall rating */}
        <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4 p-6 rounded-2xl border border-border bg-card">
          <div className="text-center sm:text-left">
            <div className="text-5xl font-black text-foreground">{reviewSummary.average}</div>
            <RatingStars rating={reviewSummary.average} size={20} />
            <p className="text-sm text-muted-foreground mt-1">Based on {reviewSummary.count.toLocaleString()} review{reviewSummary.count === 1 ? "" : "s"}</p>
          </div>
        </div>
      </section>}
    </main>
  );
}

function CategoryThumbnail({ src, fallback, alt }: { src: string; fallback: string; alt: string }) {
  const [imageSrc, setImageSrc] = useState(src || fallback);

  React.useEffect(() => {
    setImageSrc(src || fallback);
  }, [fallback, src]);

  return (
    <img
      src={imageSrc}
      alt={alt}
      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
      onError={() => {
        if (imageSrc !== fallback) setImageSrc(fallback);
      }}
    />
  );
}

function CatalogState({ text, actionLabel, onAction }: { text: string; actionLabel?: string; onAction?: () => Promise<void> }) {
  const [busy, setBusy] = useState(false);
  return (
    <div className="rounded-2xl border border-border bg-card p-8 text-center">
      <p className="text-sm text-muted-foreground">{text}</p>
      {actionLabel && onAction && (
        <button
          onClick={async () => {
            setBusy(true);
            try {
              await onAction();
            } finally {
              setBusy(false);
            }
          }}
          disabled={busy}
          className="mt-4 h-10 rounded-xl border border-border px-4 text-sm font-semibold hover:bg-secondary disabled:cursor-not-allowed disabled:opacity-60"
        >
          {busy ? "Loading..." : actionLabel}
        </button>
      )}
    </div>
  );
}
