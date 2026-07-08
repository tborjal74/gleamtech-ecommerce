import React, { useEffect, useMemo, useRef, useState } from "react";
import { Activity, BarChart3, ClipboardList, Download, Image, LogOut, PackageSearch, Search, ShieldCheck, ShoppingCart, Tags, User, Users, X, Menu, Store, Minus, Plus, Trash2 } from "lucide-react";
import { cn } from "../components/ui/utils";
import type { PublicUser } from "../api";
import type { CartItem, Page, Product } from "./types";
import { formatCurrency } from "./currency";

const logoUrl = new URL("../../../assets/gleamtech-main-logo.png", import.meta.url).href;

interface StoreHeaderProps {
  cartItems: CartItem[];
  onNavigate: (page: Page) => void;
  onRemoveFromCart: (productId: string) => void;
  onUpdateCartQty: (productId: string, qty: number) => void;
  products: Product[];
  onViewProduct: (product: Product) => void;
  user: PublicUser | null;
  onAccount: () => void;
  onLogout: () => void;
}

function SearchResultsPanel({
  products,
  suggestions,
  query,
  onProductClick,
  onSuggestionClick,
  compact = false,
}: {
  products: Product[];
  suggestions: string[];
  query: string;
  onProductClick: (product: Product) => void;
  onSuggestionClick: (suggestion: string) => void;
  compact?: boolean;
}) {
  return (
    <div
      className={cn(
        "rounded-2xl border border-border bg-card shadow-2xl",
        compact ? "mt-2 overflow-hidden" : "absolute left-0 right-0 top-full z-50 mt-2 max-h-[440px] overflow-y-auto",
      )}
    >
      <div className="border-b border-border px-3 py-2 text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
        Products
      </div>
      {products.length > 0 ? (
        <div className="py-1">
          {products.map(product => (
            <button
              key={product.id}
              onMouseDown={event => event.preventDefault()}
              onClick={() => onProductClick(product)}
              className="flex w-full items-center gap-3 px-3 py-2.5 text-left hover:bg-secondary"
            >
              <span className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-border bg-white p-1">
                <img src={product.image} alt={product.name} className="h-full w-full object-contain" />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-semibold text-foreground">{product.name}</span>
                <span className="block truncate text-xs text-muted-foreground">
                  {product.sku ?? product.category} · {product.category}
                </span>
              </span>
              <span className="shrink-0 text-sm font-bold text-foreground">{formatCurrency(product.price)}</span>
            </button>
          ))}
        </div>
      ) : (
        <div className="px-3 py-4 text-sm text-muted-foreground">No products found for "{query}".</div>
      )}

      <div className="border-t border-border px-3 py-2 text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
        Popular suggestions
      </div>
      <div className="flex flex-wrap gap-2 px-3 py-3">
        {suggestions.map(suggestion => (
          <button
            key={suggestion}
            onMouseDown={event => event.preventDefault()}
            onClick={() => onSuggestionClick(suggestion)}
            className="rounded-full border border-border bg-background px-3 py-1.5 text-xs font-semibold text-foreground hover:border-[var(--green-mid)] hover:bg-[var(--green-light)] hover:text-[var(--green)]"
          >
            {suggestion}
          </button>
        ))}
      </div>
    </div>
  );
}

export function StoreHeader({ cartItems, onNavigate, onRemoveFromCart, onUpdateCartQty, products, onViewProduct, user, onAccount, onLogout }: StoreHeaderProps) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [cartOpen, setCartOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchOpen, setSearchOpen] = useState(false);
  const searchContainerRef = useRef<HTMLDivElement | null>(null);

  const cartCount = cartItems.reduce((s, i) => s + i.qty, 0);
  const cartTotal = cartItems.reduce((s, i) => s + i.product.price * i.qty, 0);
  const isAdmin = user?.role === "ADMIN";
  const normalizedSearch = searchQuery.trim().toLowerCase();
  const searchResults = useMemo(() => {
    if (!normalizedSearch) return [];
    return products
      .filter(product => {
        const searchable = [
          product.name,
          product.sku ?? "",
          product.shortDesc,
          product.category,
          product.scent ?? "",
          ...product.tags,
        ].join(" ").toLowerCase();
        return searchable.includes(normalizedSearch);
      })
      .slice(0, 6);
  }, [normalizedSearch, products]);
  const popularSuggestions = useMemo(() => {
    const counts = new Map<string, number>();
    for (const product of products) {
      [product.category, product.scent, ...product.tags].filter(Boolean).forEach(value => {
        const suggestion = String(value);
        counts.set(suggestion, (counts.get(suggestion) ?? 0) + 1);
      });
    }
    return Array.from(counts.entries())
      .filter(([suggestion]) => !normalizedSearch || suggestion.toLowerCase().includes(normalizedSearch) || normalizedSearch.includes(suggestion.toLowerCase()))
      .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
      .map(([suggestion]) => suggestion)
      .slice(0, 6);
  }, [normalizedSearch, products]);
  const fallbackSuggestions = ["Kitchen", "Laundry", "Bathroom", "Dishwashing"];
  const showSearchPanel = searchOpen && normalizedSearch.length > 0;

  useEffect(() => {
    const onPointerDown = (event: PointerEvent) => {
      if (!searchContainerRef.current?.contains(event.target as Node)) setSearchOpen(false);
    };
    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, []);

  const openProductFromSearch = (product: Product) => {
    setSearchOpen(false);
    setSearchQuery("");
    setMobileOpen(false);
    onViewProduct(product);
  };

  const openSuggestion = (suggestion: string) => {
    setSearchQuery(suggestion);
    setSearchOpen(false);
    setMobileOpen(false);
    onNavigate("listing");
  };

  return (
    <>
      {/* Main header */}
      <header className="sticky top-0 z-40 bg-card border-b border-border shadow-sm">
        <div className={cn(
          "mx-auto px-4 sm:px-6 h-16 flex items-center",
          isAdmin ? "max-w-none gap-2 xl:gap-3" : "max-w-7xl gap-4",
        )}>
          {/* Logo */}
          <button
            onClick={() => onNavigate("home")}
            className={cn(
              "flex items-center shrink-0 transition-transform duration-150 hover:scale-[1.02] active:scale-[0.98]",
              isAdmin ? "mr-1" : "mr-2",
            )}
            aria-label="Gleamtech - go to homepage"
          >
            <img
              src={logoUrl}
              alt="Gleamtech"
              className={cn(
                "h-14 object-cover object-center",
                isAdmin ? "w-32 sm:w-36 xl:w-40" : "w-40 sm:w-48",
              )}
            />
          </button>

          {/* Nav links (desktop) */}
          <nav
            className={cn(
              "shrink-0 items-center gap-0.5",
              isAdmin
                ? "hidden min-w-0 flex-1 overflow-x-auto whitespace-nowrap md:flex"
                : "hidden lg:flex",
            )}
            aria-label="Store navigation"
          >
            {isAdmin ? (
              <>
                <button
                  onClick={() => onNavigate("admin-analytics")}
                  className="flex shrink-0 items-center gap-1.5 rounded-lg px-2.5 py-2 text-sm font-medium text-muted-foreground transition-all duration-150 hover:scale-[1.02] hover:bg-secondary hover:text-foreground active:scale-[0.98] xl:px-3"
                >
                  <BarChart3 size={15} />
                  Analytics
                </button>
                <button
                  onClick={() => onNavigate("listing")}
                  className="flex shrink-0 items-center gap-1.5 rounded-lg px-2.5 py-2 text-sm font-medium text-muted-foreground transition-all duration-150 hover:scale-[1.02] hover:bg-secondary hover:text-foreground active:scale-[0.98] xl:px-3"
                >
                  <Store size={15} />
                  Store View
                </button>
                <button
                  onClick={() => onNavigate("admin-listings")}
                  className="flex shrink-0 items-center gap-1.5 rounded-lg px-2.5 py-2 text-sm font-medium text-muted-foreground transition-all duration-150 hover:scale-[1.02] hover:bg-secondary hover:text-foreground active:scale-[0.98] xl:px-3"
                >
                  <PackageSearch size={15} />
                  Listings
                </button>
                <button
                  onClick={() => onNavigate("admin-orders")}
                  className="flex shrink-0 items-center gap-1.5 rounded-lg px-2.5 py-2 text-sm font-medium text-muted-foreground transition-all duration-150 hover:scale-[1.02] hover:bg-secondary hover:text-foreground active:scale-[0.98] xl:px-3"
                >
                  <ClipboardList size={15} />
                  Orders
                </button>
                <button
                  onClick={() => onNavigate("admin-payments")}
                  className="flex shrink-0 items-center gap-1.5 rounded-lg px-2.5 py-2 text-sm font-medium text-muted-foreground transition-all duration-150 hover:scale-[1.02] hover:bg-secondary hover:text-foreground active:scale-[0.98] xl:px-3"
                >
                  <ShieldCheck size={15} />
                  Payments
                </button>
                <button
                  onClick={() => onNavigate("admin-inventory")}
                  className="flex shrink-0 items-center gap-1.5 rounded-lg px-2.5 py-2 text-sm font-medium text-muted-foreground transition-all duration-150 hover:scale-[1.02] hover:bg-secondary hover:text-foreground active:scale-[0.98] xl:px-3"
                >
                  <PackageSearch size={15} />
                  Inventory
                </button>
                <button
                  onClick={() => onNavigate("admin-promos")}
                  className="flex shrink-0 items-center gap-1.5 rounded-lg px-2.5 py-2 text-sm font-medium text-muted-foreground transition-all duration-150 hover:scale-[1.02] hover:bg-secondary hover:text-foreground active:scale-[0.98] xl:px-3"
                >
                  <Tags size={15} />
                  Promos
                </button>
                <button
                  onClick={() => onNavigate("admin-homepage")}
                  className="flex shrink-0 items-center gap-1.5 rounded-lg px-2.5 py-2 text-sm font-medium text-muted-foreground transition-all duration-150 hover:scale-[1.02] hover:bg-secondary hover:text-foreground active:scale-[0.98] xl:px-3"
                >
                  <Image size={15} />
                  Homepage
                </button>
                <button
                  onClick={() => onNavigate("admin-customers")}
                  className="flex shrink-0 items-center gap-1.5 rounded-lg px-2.5 py-2 text-sm font-medium text-muted-foreground transition-all duration-150 hover:scale-[1.02] hover:bg-secondary hover:text-foreground active:scale-[0.98] xl:px-3"
                >
                  <Users size={15} />
                  Customers
                </button>
                <button
                  onClick={() => onNavigate("admin-activity")}
                  className="flex shrink-0 items-center gap-1.5 rounded-lg px-2.5 py-2 text-sm font-medium text-muted-foreground transition-all duration-150 hover:scale-[1.02] hover:bg-secondary hover:text-foreground active:scale-[0.98] xl:px-3"
                >
                  <Activity size={15} />
                  Activity
                </button>
                <button
                  onClick={() => onNavigate("admin-reports")}
                  className="flex shrink-0 items-center gap-1.5 rounded-lg px-2.5 py-2 text-sm font-medium text-muted-foreground transition-all duration-150 hover:scale-[1.02] hover:bg-secondary hover:text-foreground active:scale-[0.98] xl:px-3"
                >
                  <Download size={15} />
                  Reports
                </button>
              </>
            ) : (
              <button
                onClick={() => onNavigate("listing")}
                className="flex shrink-0 items-center gap-1.5 rounded-lg px-2.5 py-2 text-sm font-medium text-muted-foreground transition-all duration-150 hover:scale-[1.02] hover:bg-secondary hover:text-foreground active:scale-[0.98] xl:px-3"
              >
                <Store size={15} />
                Store
              </button>
            )}
          </nav>

          {/* Search */}
          <div
            ref={searchContainerRef}
            className={cn(
              "relative hidden sm:block",
              isAdmin ? "ml-1 w-40 flex-none md:w-44 xl:w-72 2xl:w-96" : "mx-auto max-w-lg flex-1",
            )}
          >
            <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
            <input
              type="search"
              placeholder="Search cleaning products…"
              value={searchQuery}
              onChange={e => { setSearchQuery(e.target.value); setSearchOpen(true); }}
              onFocus={() => setSearchOpen(true)}
              onKeyDown={event => {
                if (event.key === "Enter" && searchResults[0]) openProductFromSearch(searchResults[0]);
                if (event.key === "Escape") setSearchOpen(false);
              }}
              className="w-full h-10 pl-10 pr-4 rounded-xl border border-border bg-input-background text-foreground placeholder:text-muted-foreground outline-none focus:ring-2 focus:ring-ring/30 focus:border-ring transition-all text-sm"
              aria-label="Search products"
            />
            {showSearchPanel && (
              <SearchResultsPanel
                products={searchResults}
                suggestions={popularSuggestions.length ? popularSuggestions : fallbackSuggestions}
                query={searchQuery}
                onProductClick={openProductFromSearch}
                onSuggestionClick={openSuggestion}
              />
            )}
          </div>

          {/* Right icons */}
          <div className={cn("flex items-center gap-1", isAdmin ? "ml-auto shrink-0" : "ml-auto")}>
            {/* Search mobile */}
            <button className="sm:hidden w-9 h-9 flex items-center justify-center rounded-lg text-muted-foreground hover:bg-secondary transition-all duration-150 hover:scale-105 active:scale-95" aria-label="Search">
              <Search size={18} />
            </button>

            {/* Account */}
            <button
              onClick={onAccount}
              className="hidden sm:flex w-9 h-9 items-center justify-center rounded-lg text-muted-foreground hover:bg-secondary hover:text-foreground transition-all duration-150 hover:scale-105 active:scale-95"
              aria-label={user ? `Account for ${user.email}` : "Account"}
              title={user ? user.email : "Account"}
            >
              <User size={18} />
            </button>

            {/* Logout */}
            {user && (
              <button
                onClick={onLogout}
                className="hidden sm:flex w-9 h-9 items-center justify-center rounded-lg text-muted-foreground hover:bg-secondary hover:text-foreground transition-all duration-150 hover:scale-105 active:scale-95"
                aria-label="Sign out"
                title="Sign out"
              >
                <LogOut size={17} />
              </button>
            )}

            {/* Cart */}
            <button
              onClick={() => setCartOpen(true)}
              className="relative flex w-9 h-9 items-center justify-center rounded-lg text-muted-foreground hover:bg-secondary hover:text-foreground transition-all duration-150 hover:scale-105 active:scale-95"
              aria-label={`Cart, ${cartCount} items`}
            >
              <ShoppingCart size={18} />
              {cartCount > 0 && (
                <span
                  className="absolute -top-0.5 -right-0.5 w-4 h-4 rounded-full text-white text-[9px] font-bold flex items-center justify-center"
                  style={{ background: "var(--green)" }}
                >
                  {cartCount}
                </span>
              )}
            </button>

            {/* Mobile menu */}
            <button
              onClick={() => setMobileOpen(true)}
              className={cn(
                "w-9 h-9 items-center justify-center rounded-lg text-muted-foreground hover:bg-secondary transition-all duration-150 hover:scale-105 active:scale-95",
                isAdmin ? "flex md:hidden" : "flex lg:hidden",
              )}
              aria-label="Open menu"
            >
              <Menu size={18} />
            </button>
          </div>
        </div>
      </header>

      {/* Mobile nav drawer */}
      {mobileOpen && (
        <>
          <div className="fixed inset-0 bg-black/40 z-50 backdrop-blur-sm" onClick={() => setMobileOpen(false)} />
          <div className="fixed inset-y-0 left-0 w-72 bg-card z-50 flex flex-col shadow-2xl">
            <div className="flex items-center justify-between px-5 py-4 border-b border-border">
              <div className="flex items-center gap-2">
                <img src={logoUrl} alt="Gleamtech" className="h-12 w-40 object-cover object-center" />
              </div>
              <button onClick={() => setMobileOpen(false)} className="w-8 h-8 flex items-center justify-center rounded-lg text-muted-foreground hover:bg-secondary">
                <X size={16} />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto py-3">
              <div ref={searchContainerRef} className="px-4 mb-3">
                <input
                  type="search"
                  placeholder="Search products…"
                  value={searchQuery}
                  onChange={event => { setSearchQuery(event.target.value); setSearchOpen(true); }}
                  onFocus={() => setSearchOpen(true)}
                  className="w-full h-10 px-4 rounded-xl border border-border bg-input-background text-foreground placeholder:text-muted-foreground outline-none text-sm"
                />
                {showSearchPanel && (
                  <SearchResultsPanel
                    products={searchResults}
                    suggestions={popularSuggestions.length ? popularSuggestions : fallbackSuggestions}
                    query={searchQuery}
                    onProductClick={openProductFromSearch}
                    onSuggestionClick={openSuggestion}
                    compact
                  />
                )}
              </div>
              <nav className="px-2">
                {isAdmin ? (
                  <>
                    <button
                      onClick={() => { onNavigate("admin-analytics"); setMobileOpen(false); }}
                      className="w-full text-left px-4 py-3 text-sm font-medium text-foreground hover:bg-secondary rounded-xl transition-colors flex items-center gap-3"
                    >
                      <BarChart3 size={16} className="text-muted-foreground" />
                      Analytics
                    </button>
                    <button
                      onClick={() => { onNavigate("listing"); setMobileOpen(false); }}
                      className="w-full text-left px-4 py-3 text-sm font-medium text-foreground hover:bg-secondary rounded-xl transition-colors flex items-center gap-3"
                    >
                      <Store size={16} className="text-muted-foreground" />
                      Store View
                    </button>
                    <button
                      onClick={() => { onNavigate("admin-listings"); setMobileOpen(false); }}
                      className="w-full text-left px-4 py-3 text-sm font-medium text-foreground hover:bg-secondary rounded-xl transition-colors flex items-center gap-3"
                    >
                      <PackageSearch size={16} className="text-muted-foreground" />
                      Listings
                    </button>
                    <button
                      onClick={() => { onNavigate("admin-orders"); setMobileOpen(false); }}
                      className="w-full text-left px-4 py-3 text-sm font-medium text-foreground hover:bg-secondary rounded-xl transition-colors flex items-center gap-3"
                    >
                      <ClipboardList size={16} className="text-muted-foreground" />
                      Orders
                    </button>
                    <button
                      onClick={() => { onNavigate("admin-payments"); setMobileOpen(false); }}
                      className="w-full text-left px-4 py-3 text-sm font-medium text-foreground hover:bg-secondary rounded-xl transition-colors flex items-center gap-3"
                    >
                      <ShieldCheck size={16} className="text-muted-foreground" />
                      Payments
                    </button>
                    <button
                      onClick={() => { onNavigate("admin-inventory"); setMobileOpen(false); }}
                      className="w-full text-left px-4 py-3 text-sm font-medium text-foreground hover:bg-secondary rounded-xl transition-colors flex items-center gap-3"
                    >
                      <PackageSearch size={16} className="text-muted-foreground" />
                      Inventory
                    </button>
                    <button
                      onClick={() => { onNavigate("admin-promos"); setMobileOpen(false); }}
                      className="w-full text-left px-4 py-3 text-sm font-medium text-foreground hover:bg-secondary rounded-xl transition-colors flex items-center gap-3"
                    >
                      <Tags size={16} className="text-muted-foreground" />
                      Promos
                    </button>
                    <button
                      onClick={() => { onNavigate("admin-homepage"); setMobileOpen(false); }}
                      className="w-full text-left px-4 py-3 text-sm font-medium text-foreground hover:bg-secondary rounded-xl transition-colors flex items-center gap-3"
                    >
                      <Image size={16} className="text-muted-foreground" />
                      Homepage
                    </button>
                    <button
                      onClick={() => { onNavigate("admin-customers"); setMobileOpen(false); }}
                      className="w-full text-left px-4 py-3 text-sm font-medium text-foreground hover:bg-secondary rounded-xl transition-colors flex items-center gap-3"
                    >
                      <Users size={16} className="text-muted-foreground" />
                      Customers
                    </button>
                    <button
                      onClick={() => { onNavigate("admin-activity"); setMobileOpen(false); }}
                      className="w-full text-left px-4 py-3 text-sm font-medium text-foreground hover:bg-secondary rounded-xl transition-colors flex items-center gap-3"
                    >
                      <Activity size={16} className="text-muted-foreground" />
                      Activity
                    </button>
                    <button
                      onClick={() => { onNavigate("admin-reports"); setMobileOpen(false); }}
                      className="w-full text-left px-4 py-3 text-sm font-medium text-foreground hover:bg-secondary rounded-xl transition-colors flex items-center gap-3"
                    >
                      <Download size={16} className="text-muted-foreground" />
                      Reports
                    </button>
                  </>
                ) : (
                  <button
                    onClick={() => { onNavigate("listing"); setMobileOpen(false); }}
                    className="w-full text-left px-4 py-3 text-sm font-medium text-foreground hover:bg-secondary rounded-xl transition-colors flex items-center gap-3"
                  >
                    <Store size={16} className="text-muted-foreground" />
                    Store
                  </button>
                )}
              </nav>
              <div className="border-t border-border mt-3 pt-3 px-2">
                <button onClick={() => { onAccount(); setMobileOpen(false); }} className="w-full text-left px-4 py-3 text-sm font-medium text-foreground hover:bg-secondary rounded-xl flex items-center gap-3">
                  <User size={16} className="text-muted-foreground" /> {user ? "My Account" : "Sign in"}
                </button>
                {user && (
                  <button onClick={() => { onLogout(); setMobileOpen(false); }} className="w-full text-left px-4 py-3 text-sm font-medium text-foreground hover:bg-secondary rounded-xl flex items-center gap-3">
                    <LogOut size={16} className="text-muted-foreground" /> Sign out
                  </button>
                )}
              </div>
            </div>
          </div>
        </>
      )}

      {/* Cart Drawer */}
      {cartOpen && (
        <>
          <div className="fixed inset-0 bg-black/40 z-50 backdrop-blur-sm" onClick={() => setCartOpen(false)} />
          <div className="fixed inset-y-0 right-0 w-full sm:w-[400px] bg-card z-50 flex flex-col shadow-2xl">
            <div className="flex items-center justify-between px-5 py-4 border-b border-border">
              <div>
                <h2 className="font-bold text-foreground text-lg">Your Cart</h2>
                <p className="text-muted-foreground text-sm">{cartCount} {cartCount === 1 ? "item" : "items"}</p>
              </div>
              <button onClick={() => setCartOpen(false)} className="w-9 h-9 flex items-center justify-center rounded-xl text-muted-foreground hover:bg-secondary">
                <X size={18} />
              </button>
            </div>

            {/* Cart items */}
            <div className="flex-1 overflow-y-auto py-4 px-5 space-y-4">
              {cartItems.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-center py-16">
                  <ShoppingCart size={40} className="text-muted-foreground/30 mb-3" />
                  <p className="font-semibold text-foreground mb-1">Your cart is empty</p>
                  <p className="text-sm text-muted-foreground mb-4">Add some cleaning products to get started!</p>
                  <button
                    onClick={() => { setCartOpen(false); onNavigate("listing"); }}
                    className="px-5 py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-medium hover:bg-[var(--green-dark)] transition-colors"
                  >
                    Browse Products
                  </button>
                </div>
              ) : (
                cartItems.map(item => (
                  <div key={`${item.product.id}-${item.size}`} className="flex gap-3">
                    <div className="w-18 h-18 rounded-xl overflow-hidden bg-secondary shrink-0" style={{ width: "72px", height: "72px" }}>
                      <img src={item.product.image} alt={item.product.name} className="w-full h-full object-cover" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-foreground text-sm leading-snug">{item.product.name}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">{item.size}</p>
                      <div className="flex items-center justify-between mt-2">
                        <div className="flex items-center border border-border rounded-lg overflow-hidden">
                          <button
                            onClick={() => item.qty <= 1 ? onRemoveFromCart(item.product.id) : onUpdateCartQty(item.product.id, item.qty - 1)}
                            className="w-7 h-7 flex items-center justify-center text-muted-foreground hover:bg-secondary transition-colors"
                          >
                            <Minus size={12} />
                          </button>
                          <span className="px-2 text-sm font-medium">{item.qty}</span>
                          <button
                            onClick={() => onUpdateCartQty(item.product.id, item.qty + 1)}
                            className="w-7 h-7 flex items-center justify-center text-muted-foreground hover:bg-secondary transition-colors"
                          >
                            <Plus size={12} />
                          </button>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-foreground text-sm">{formatCurrency(item.product.price * item.qty)}</span>
                          <button
                            onClick={() => onRemoveFromCart(item.product.id)}
                            className="text-muted-foreground hover:text-destructive transition-colors"
                            aria-label="Remove item"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Cart footer */}
            {cartItems.length > 0 && (
              <div className="border-t border-border p-5 space-y-3">
                {/* Promo */}
                <div className="flex gap-2">
                  <input
                    placeholder="Promo code"
                    className="flex-1 h-10 px-3.5 rounded-xl border border-border bg-input-background text-sm text-foreground placeholder:text-muted-foreground outline-none focus:ring-2 focus:ring-ring/30 focus:border-ring"
                  />
                  <button className="px-4 h-10 rounded-xl border border-border text-sm font-medium text-foreground hover:bg-secondary transition-colors">
                    Apply
                  </button>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Subtotal</span>
                  <span className="font-semibold">{formatCurrency(cartTotal)}</span>
                </div>
                <div className="flex justify-between font-bold text-base border-t border-border pt-3">
                  <span>Total</span>
                  <span>{formatCurrency(cartTotal)}</span>
                </div>
                <button
                  onClick={() => { setCartOpen(false); onNavigate("checkout"); }}
                  className="w-full h-12 rounded-xl bg-primary text-primary-foreground font-semibold text-sm hover:bg-[var(--green-dark)] active:scale-[0.98] transition-all"
                >
                  Proceed to Checkout →
                </button>
                <button
                  onClick={() => { setCartOpen(false); onNavigate("cart"); }}
                  className="w-full h-10 rounded-xl border border-border text-sm font-medium text-foreground hover:bg-secondary transition-colors"
                >
                  View Full Cart
                </button>
              </div>
            )}
          </div>
        </>
      )}
    </>
  );
}
