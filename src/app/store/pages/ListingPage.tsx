import React, { useState } from "react";
import { SlidersHorizontal, ChevronDown, ChevronRight, X, Leaf } from "lucide-react";
import { ProductCard } from "../ProductCard";
import { RatingStars } from "../ui";
import { cn } from "../../components/ui/utils";
import type { Product, Page } from "../types";
import { formatCurrency } from "../currency";

interface ListingPageProps {
  onAddToCart: (p: Product, qty: number, size: string) => void;
  onViewProduct: (p: Product) => void;
  onNavigate: (page: Page) => void;
  wishlist: Set<string>;
  onToggleWishlist: (id: string) => void;
  products: Product[];
  productLoading: boolean;
  productError: string;
  onRefreshProducts: () => Promise<void>;
}

const CATEGORIES = ["All", "Kitchen", "Bathroom", "Laundry", "Floor", "Others"];
const SCENTS = ["Citrus", "Lemon", "Lavender", "Pine Fresh", "Mint", "Eucalyptus", "Ocean Breeze", "Unscented"];
const SORT_OPTIONS = [
  { value: "popular", label: "Most Popular" },
  { value: "price-asc", label: "Price: Low to High" },
  { value: "price-desc", label: "Price: High to Low" },
  { value: "rating", label: "Highest Rated" },
  { value: "newest", label: "Newest First" },
];

function FilterSection({ title, children, defaultOpen = true }: { title: string; children: React.ReactNode; defaultOpen?: boolean }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="border-b border-border pb-4 mb-4 last:border-0">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between text-sm font-semibold text-foreground mb-3"
      >
        {title}
        <ChevronDown size={14} className={cn("transition-transform", open && "rotate-180")} />
      </button>
      {open && children}
    </div>
  );
}

function CatalogState({ text, actionLabel, onAction }: { text: string; actionLabel?: string; onAction?: () => Promise<void> }) {
  const [busy, setBusy] = useState(false);
  return (
    <div className="rounded-2xl border border-border bg-card p-10 text-center">
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
          {busy ? "Syncing..." : actionLabel}
        </button>
      )}
    </div>
  );
}

export function ListingPage({ onAddToCart, onViewProduct, onNavigate, wishlist, onToggleWishlist, products, productLoading, productError, onRefreshProducts }: ListingPageProps) {
  const [activeCategory, setActiveCategory] = useState("All");
  const [selectedScents, setSelectedScents] = useState<Set<string>>(new Set());
  const [priceMax, setPriceMax] = useState(500);
  const [ecoOnly, setEcoOnly] = useState(false);
  const [minRating, setMinRating] = useState(0);
  const [sortBy, setSortBy] = useState("popular");
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [page, setPage] = useState(1);

  const PER_PAGE = 6;

  const toggleSet = (set: Set<string>, val: string) => {
    const next = new Set(set);
    if (next.has(val)) next.delete(val); else next.add(val);
    return next;
  };

  const filtered = products.filter(p => {
    if (activeCategory !== "All" && p.category !== activeCategory && !(activeCategory === "Floor" && p.category === "Floors")) return false;
    if (selectedScents.size > 0 && p.scent && !selectedScents.has(p.scent)) return false;
    if (p.price > priceMax) return false;
    if (ecoOnly && !p.isEco) return false;
    if (p.rating < minRating) return false;
    return true;
  });

  const sorted = [...filtered].sort((a, b) => {
    if (sortBy === "price-asc") return a.price - b.price;
    if (sortBy === "price-desc") return b.price - a.price;
    if (sortBy === "rating") return b.rating - a.rating;
    return b.reviewCount - a.reviewCount;
  });

  const paginated = sorted.slice(0, page * PER_PAGE);
  const hasMore = paginated.length < sorted.length;

  const activeFilters = [
    activeCategory !== "All" && activeCategory,
    ecoOnly && "Eco-Friendly",
    minRating > 0 && `${minRating}+ stars`,
    priceMax < 500 && `Under ${formatCurrency(priceMax)}`,
  ].filter(Boolean) as string[];

  const FilterPanel = () => (
    <div className="space-y-0">
      <FilterSection title="Category">
        <div className="space-y-1.5">
          {CATEGORIES.map(c => (
            <button
              key={c}
              onClick={() => setActiveCategory(c)}
              className={cn(
                "w-full text-left text-sm px-3 py-2 rounded-xl transition-colors flex items-center justify-between",
                activeCategory === c
                  ? "bg-[var(--green-light)] text-[var(--green)] font-medium"
                  : "text-muted-foreground hover:bg-secondary"
              )}
            >
              {c}
              <span className="text-xs opacity-60">
                {c === "All" ? products.length : products.filter(p => p.category === c || (c === "Floor" && p.category === "Floors")).length}
              </span>
            </button>
          ))}
        </div>
      </FilterSection>

      <FilterSection title="Price Range">
        <div className="px-1">
          <div className="flex justify-between text-xs text-muted-foreground mb-2">
            <span>{formatCurrency(0)}</span>
            <span className="font-medium text-foreground">Up to {formatCurrency(priceMax)}</span>
          </div>
          <input
            type="range"
            min={50}
            max={500}
            value={priceMax}
            onChange={e => setPriceMax(Number(e.target.value))}
            className="w-full accent-[var(--green)]"
            aria-label="Maximum price filter"
          />
        </div>
      </FilterSection>

      <FilterSection title="Scent" defaultOpen={false}>
        <div className="flex flex-wrap gap-2">
          {SCENTS.map(s => (
            <button
              key={s}
              onClick={() => setSelectedScents(toggleSet(selectedScents, s))}
              className={cn(
                "px-3 py-1.5 rounded-xl border text-xs font-medium transition-all",
                selectedScents.has(s)
                  ? "border-[var(--green)] bg-[var(--green-light)] text-[var(--green)]"
                  : "border-border text-muted-foreground hover:border-[var(--green-mid)]"
              )}
            >
              {s}
            </button>
          ))}
        </div>
      </FilterSection>

      <FilterSection title="Rating" defaultOpen={false}>
        <div className="space-y-2">
          {[4, 3, 2, 0].map(r => (
            <button
              key={r}
              onClick={() => setMinRating(r)}
              className={cn(
                "w-full flex items-center gap-2 px-3 py-1.5 rounded-xl text-sm transition-colors",
                minRating === r
                  ? "bg-[var(--green-light)] text-[var(--green)]"
                  : "text-muted-foreground hover:bg-secondary"
              )}
            >
              {r === 0 ? "All ratings" : (
                <>
                  <RatingStars rating={r} size={12} />
                  <span>{r}+ stars</span>
                </>
              )}
            </button>
          ))}
        </div>
      </FilterSection>

      <FilterSection title="Eco-Friendly" defaultOpen={false}>
        <label className="flex items-center gap-3 cursor-pointer">
          <div
            onClick={() => setEcoOnly(!ecoOnly)}
            className={cn(
              "w-11 h-6 rounded-full transition-all relative cursor-pointer",
              ecoOnly ? "bg-[var(--green)]" : "bg-muted"
            )}
          >
            <div
              className={cn(
                "absolute top-1 w-4 h-4 rounded-full bg-white shadow transition-all",
                ecoOnly ? "left-6" : "left-1"
              )}
            />
          </div>
          <span className="text-sm text-foreground flex items-center gap-1">
            <Leaf size={13} style={{ color: "var(--green)" }} /> Eco-friendly only
          </span>
        </label>
      </FilterSection>
    </div>
  );

  return (
    <main className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
      {/* Breadcrumb */}
      <nav className="flex items-center gap-1.5 text-sm text-muted-foreground mb-6" aria-label="Breadcrumb">
        <button onClick={() => onNavigate("home")} className="hover:text-foreground transition-colors">Home</button>
        <ChevronRight size={13} />
        <span className="text-foreground font-medium">{activeCategory === "All" ? "All Products" : activeCategory}</span>
      </nav>

      {/* Page header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-foreground">
            {activeCategory === "All" ? "All Products" : activeCategory}
          </h1>
          <p className="text-muted-foreground text-sm mt-0.5">
            {sorted.length} {sorted.length === 1 ? "product" : "products"} found
          </p>
        </div>
        <div className="flex items-center gap-3">
          {/* Mobile filter toggle */}
          <button
            onClick={() => setFiltersOpen(true)}
            className="lg:hidden flex items-center gap-2 h-10 px-4 rounded-xl border border-border bg-card text-sm font-medium text-foreground hover:bg-secondary transition-colors"
          >
            <SlidersHorizontal size={15} />
            Filters
            {activeFilters.length > 0 && (
              <span className="w-5 h-5 rounded-full bg-primary text-primary-foreground text-xs flex items-center justify-center">
                {activeFilters.length}
              </span>
            )}
          </button>
          {/* Sort */}
          <div className="relative">
            <select
              value={sortBy}
              onChange={e => setSortBy(e.target.value)}
              className="h-10 pl-3 pr-9 rounded-xl border border-border bg-card text-sm text-foreground outline-none focus:ring-2 focus:ring-ring/30 appearance-none cursor-pointer"
              aria-label="Sort products"
            >
              {SORT_OPTIONS.map(o => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
            <ChevronDown size={13} className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-muted-foreground" />
          </div>
        </div>
      </div>

      {/* Active filters */}
      {activeFilters.length > 0 && (
        <div className="flex flex-wrap items-center gap-2 mb-5">
          <span className="text-sm text-muted-foreground">Active filters:</span>
          {activeFilters.map(f => (
            <span
              key={f}
              className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-[var(--green-light)] text-[var(--green)] text-xs font-medium"
            >
              {f}
              <button
                onClick={() => {
                  if (f === activeCategory) setActiveCategory("All");
                  else if (f === "Eco-Friendly") setEcoOnly(false);
                  else if (f.includes("stars")) setMinRating(0);
                  else if (f.includes("Under")) setPriceMax(500);
                }}
                className="hover:opacity-60 transition-opacity"
                aria-label={`Remove filter ${f}`}
              >
                <X size={11} />
              </button>
            </span>
          ))}
          <button
            onClick={() => { setActiveCategory("All"); setSelectedScents(new Set()); setEcoOnly(false); setMinRating(0); setPriceMax(500); }}
            className="text-xs text-muted-foreground hover:text-foreground transition-colors"
          >
            Clear all
          </button>
        </div>
      )}

      <div className="flex gap-6">
        {/* Sidebar filters (desktop) */}
        <aside className="hidden lg:block w-56 shrink-0">
          <div className="bg-card rounded-2xl border border-border p-5 sticky top-24">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-semibold text-foreground text-sm">Filters</h2>
              {activeFilters.length > 0 && (
                <button
                  onClick={() => { setActiveCategory("All"); setSelectedScents(new Set()); setEcoOnly(false); setMinRating(0); setPriceMax(500); }}
                  className="text-xs text-[var(--green)] hover:underline"
                >
                  Reset
                </button>
              )}
            </div>
            <FilterPanel />
          </div>
        </aside>

        {/* Product grid */}
        <div className="flex-1 min-w-0">
          {productLoading ? (
            <CatalogState text="Loading live products..." />
          ) : productError ? (
            <CatalogState text="Product catalog is unavailable." actionLabel="Retry sync" onAction={onRefreshProducts} />
          ) : sorted.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <div className="text-5xl mb-4">🔍</div>
              <h3 className="text-lg font-semibold text-foreground mb-1">No products found</h3>
              <p className="text-sm text-muted-foreground mb-4">Try adjusting your filters</p>
              <button
                onClick={() => { setActiveCategory("All"); setSelectedScents(new Set()); setEcoOnly(false); setMinRating(0); setPriceMax(500); }}
                className="px-5 py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-medium hover:bg-[var(--green-dark)]"
              >
                Reset all filters
              </button>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-5">
                {paginated.map(p => (
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

              {/* Load more */}
              <div className="flex flex-col items-center mt-10 gap-3">
                {hasMore && (
                  <button
                    onClick={() => setPage(p => p + 1)}
                    className="flex items-center gap-2 px-8 py-3 rounded-xl border border-border bg-card text-sm font-medium text-foreground hover:bg-secondary hover:border-[var(--green-mid)] transition-all"
                  >
                    Load More Products
                    <ChevronDown size={15} />
                  </button>
                )}
                <p className="text-xs text-muted-foreground">
                  Showing {paginated.length} of {sorted.length} products
                </p>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Mobile filter drawer */}
      {filtersOpen && (
        <>
          <div className="fixed inset-0 bg-black/40 z-50 backdrop-blur-sm" onClick={() => setFiltersOpen(false)} />
          <div className="fixed inset-y-0 left-0 w-72 bg-card z-50 flex flex-col shadow-2xl">
            <div className="flex items-center justify-between px-5 py-4 border-b border-border">
              <h2 className="font-bold text-foreground">Filters</h2>
              <button onClick={() => setFiltersOpen(false)} className="w-8 h-8 flex items-center justify-center rounded-lg text-muted-foreground hover:bg-secondary">
                <X size={16} />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-5">
              <FilterPanel />
            </div>
            <div className="p-4 border-t border-border">
              <button
                onClick={() => setFiltersOpen(false)}
                className="w-full h-11 rounded-xl bg-primary text-primary-foreground font-medium text-sm hover:bg-[var(--green-dark)]"
              >
                Show {sorted.length} Products
              </button>
            </div>
          </div>
        </>
      )}
    </main>
  );
}
