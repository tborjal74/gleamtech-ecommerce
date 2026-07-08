import React, { useEffect, useState } from "react";
import { Bell, ChevronRight, Heart, ShoppingCart, Share2, Check, Truck, RotateCcw, Shield, Leaf } from "lucide-react";
import { toast } from "sonner";
import { RatingStars, Badge, QtySelector } from "../ui";
import { ProductCard } from "../ProductCard";
import { REVIEWS } from "../data";
import { cn } from "../../components/ui/utils";
import type { Product, Page } from "../types";
import { formatCurrency } from "../currency";
import { api, ApiClientError, type ProductReview, type PublicUser } from "../../api";
import { fallbackProductImage } from "../productImages";

interface ProductPageProps {
  product: Product;
  onAddToCart: (p: Product, qty: number, size: string) => void;
  onViewProduct: (p: Product) => void;
  onNavigate: (page: Page) => void;
  user: PublicUser | null;
  onSignIn: () => void;
  wishlist: Set<string>;
  onToggleWishlist: (id: string) => void;
  products: Product[];
}

const TABS = ["Description", "Ingredients & Safety", "Delivery & Returns", "Reviews"];

function apiMessage(error: unknown) {
  return error instanceof ApiClientError
    ? error.body.message
    : error instanceof Error
      ? error.message
      : "Request failed.";
}

export function ProductPage({ product, onAddToCart, onViewProduct, onNavigate, user, onSignIn, wishlist, onToggleWishlist, products }: ProductPageProps) {
  const [qty, setQty] = useState(1);
  const [selectedSize, setSelectedSize] = useState(product.sizes[0]);
  const [activeTab, setActiveTab] = useState("Description");
  const [activeImage, setActiveImage] = useState(0);
  const [imageSrc, setImageSrc] = useState(product.image || fallbackProductImage(product));
  const [adding, setAdding] = useState(false);
  const [reviews, setReviews] = useState<ProductReview[]>([]);
  const [eligibleOrderId, setEligibleOrderId] = useState("");
  const [reviewRating, setReviewRating] = useState(5);
  const [reviewComment, setReviewComment] = useState("");
  const [reviewSubmitting, setReviewSubmitting] = useState(false);
  const isWishlisted = wishlist.has(product.id);

  const related = products.filter(p => p.id !== product.id && (p.category === product.category || p.isEco === product.isEco)).slice(0, 4);
  const discount = product.originalPrice ? Math.round((1 - product.price / product.originalPrice) * 100) : null;

  const galleryImages = [imageSrc];

  useEffect(() => {
    void api.productReviews(product.id).then(result => setReviews(result.reviews)).catch(() => undefined);
  }, [product.id]);

  useEffect(() => {
    setActiveImage(0);
    setImageSrc(product.image || fallbackProductImage(product));
  }, [product]);

  useEffect(() => {
    if (!user) {
      setEligibleOrderId("");
      return;
    }
    void api.orders("?page=1&pageSize=100")
      .then(result => {
        const paidOrder = result.orders.find(order =>
          order.paymentStatus === "PAID" && order.items.some(item => item.productId === product.id),
        );
        setEligibleOrderId(paidOrder?.id ?? "");
      })
      .catch(() => undefined);
  }, [product.id, user]);

  const handleAdd = () => {
    setAdding(true);
    onAddToCart(product, qty, selectedSize);
    setTimeout(() => setAdding(false), 900);
  };

  const requestStockNotice = async () => {
    if (!user) {
      onSignIn();
      toast.info("Sign in to save a back-in-stock notice.");
      return;
    }
    try {
      const result = await api.stockNotification(product.id);
      toast.success(result.message);
    } catch (error) {
      toast.error(apiMessage(error));
    }
  };

  const submitReview = async () => {
    if (!eligibleOrderId) {
      toast.info("Reviews are available after a paid verified purchase.");
      return;
    }
    setReviewSubmitting(true);
    try {
      await api.createProductReview(product.id, { orderId: eligibleOrderId, rating: reviewRating, comment: reviewComment });
      const result = await api.productReviews(product.id);
      setReviews(result.reviews);
      setReviewComment("");
      toast.success("Review saved");
    } catch (error) {
      toast.error(apiMessage(error));
    } finally {
      setReviewSubmitting(false);
    }
  };

  return (
    <main className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
      {/* Breadcrumb */}
      <nav className="flex items-center gap-1.5 text-sm text-muted-foreground mb-8 flex-wrap" aria-label="Breadcrumb">
        <button onClick={() => onNavigate("home")} className="hover:text-foreground transition-colors">Home</button>
        <ChevronRight size={13} />
        <button onClick={() => onNavigate("listing")} className="hover:text-foreground transition-colors">{product.category}</button>
        <ChevronRight size={13} />
        <span className="text-foreground font-medium">{product.name}</span>
      </nav>

      {/* Main product section */}
      <div className="grid lg:grid-cols-2 gap-10 lg:gap-16 mb-16">
        {/* Gallery */}
        <div className="flex flex-col gap-4">
          <div className="relative aspect-square rounded-2xl overflow-hidden bg-[var(--green-light)]">
            <img
              src={galleryImages[activeImage]}
              alt={product.name}
              className="w-full h-full object-cover"
              onError={() => {
                const fallback = fallbackProductImage(product);
                if (imageSrc !== fallback) setImageSrc(fallback);
              }}
            />
            {discount && (
              <div className="absolute top-4 left-4">
                <Badge label={`-${discount}%`} color="red" />
              </div>
            )}
            {product.isEco && (
              <div className="absolute top-4 right-4 flex items-center gap-1.5 bg-white/90 backdrop-blur-sm px-2.5 py-1.5 rounded-full text-xs font-medium text-[var(--green)]">
                <Leaf size={12} /> Eco-Friendly
              </div>
            )}
          </div>
          {/* Thumbnails */}
          <div className="flex gap-3">
            {galleryImages.map((img, i) => (
              <button
                key={i}
                onClick={() => setActiveImage(i)}
                className={cn(
                  "w-20 h-20 rounded-xl overflow-hidden border-2 transition-all",
                  activeImage === i ? "border-[var(--green)] shadow-sm" : "border-border hover:border-[var(--green-mid)]"
                )}
                aria-label={`View image ${i + 1}`}
              >
                <img src={img} alt="" className="w-full h-full object-cover" onError={() => setImageSrc(fallbackProductImage(product))} />
              </button>
            ))}
          </div>
        </div>

        {/* Product info */}
        <div className="flex flex-col">
          <div className="flex items-start justify-between gap-4 mb-1">
            <p className="text-sm font-medium text-[var(--green)]">{product.brand} · {product.category}</p>
            <button
              className="text-muted-foreground hover:text-foreground transition-colors"
              aria-label="Share product"
            >
              <Share2 size={18} />
            </button>
          </div>

          <h1 className="text-2xl sm:text-3xl font-bold text-foreground mb-3">{product.name}</h1>

          {/* Rating */}
          <div className="flex items-center gap-3 mb-4">
            <RatingStars rating={product.rating} size={16} />
            <span className="text-sm text-muted-foreground">{product.rating} ({product.reviewCount} reviews)</span>
            <span className={cn("text-sm font-medium", product.inStock ? "text-[var(--green)]" : "text-destructive")}>
              {product.inStock ? "● In Stock" : "● Out of Stock"}
            </span>
            {product.inStock && product.availableQuantity !== undefined && product.availableQuantity <= 5 && (
              <span className="text-sm font-semibold text-amber-600">Only {product.availableQuantity} left</span>
            )}
          </div>

          {/* Price */}
          <div className="flex items-baseline gap-3 mb-5">
            <span className="text-3xl font-black text-foreground">{formatCurrency(product.price)}</span>
            {product.originalPrice && (
              <>
                <span className="text-lg text-muted-foreground line-through">{formatCurrency(product.originalPrice)}</span>
                <Badge label={`Save ${formatCurrency(product.originalPrice - product.price)}`} color="red" />
              </>
            )}
          </div>

          <p className="text-muted-foreground text-sm leading-relaxed mb-6">{product.shortDesc}</p>

          {/* Size selector */}
          {product.sizes.length > 1 && (
            <div className="mb-5">
              <p className="text-sm font-semibold text-foreground mb-2">
                Size: <span className="font-medium text-[var(--green)]">{selectedSize}</span>
              </p>
              <div className="flex flex-wrap gap-2.5">
                {product.sizes.map(s => (
                  <button
                    key={s}
                    onClick={() => setSelectedSize(s)}
                    className={cn(
                      "px-4 py-2.5 rounded-xl border font-medium text-sm transition-all",
                      selectedSize === s
                        ? "border-[var(--green)] bg-[var(--green-light)] text-[var(--green)]"
                        : "border-border text-muted-foreground hover:border-[var(--green-mid)] hover:bg-secondary"
                    )}
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Qty + Add to cart */}
          <div className="flex gap-3 mb-5">
            <QtySelector qty={qty} onChange={setQty} />
            <button
              onClick={handleAdd}
              disabled={!product.inStock || adding}
              className={cn(
                "flex-1 h-12 rounded-2xl font-semibold text-sm flex items-center justify-center gap-2 transition-all",
                product.inStock
                  ? adding
                    ? "bg-[var(--green-light)] text-[var(--green)]"
                    : "bg-primary text-primary-foreground hover:bg-[var(--green-dark)] active:scale-[0.98]"
                  : "bg-muted text-muted-foreground cursor-not-allowed"
              )}
            >
              {adding ? (
                <><Check size={16} /> Added to Cart!</>
              ) : (
                <><ShoppingCart size={16} /> Add to Cart</>
              )}
            </button>
            {!product.inStock && (
              <button
                onClick={requestStockNotice}
                className="w-12 h-12 rounded-2xl border border-border flex items-center justify-center text-muted-foreground hover:bg-secondary hover:text-foreground"
                aria-label="Notify me when this product is back in stock"
                title="Notify me"
              >
                <Bell size={18} />
              </button>
            )}
            <button
              onClick={() => onToggleWishlist(product.id)}
              className={cn(
                "w-12 h-12 rounded-2xl border flex items-center justify-center transition-all",
                isWishlisted
                  ? "border-red-300 bg-red-50 text-red-500"
                  : "border-border hover:border-red-300 hover:bg-red-50 hover:text-red-500 text-muted-foreground"
              )}
              aria-label={isWishlisted ? "Remove from wishlist" : "Add to wishlist"}
            >
              <Heart size={18} fill={isWishlisted ? "currentColor" : "none"} />
            </button>
          </div>

          {/* Delivery info */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-4 rounded-2xl border border-border bg-secondary/40">
            {[
              { icon: Truck, text: "Delivery support", sub: "Coordinated after payment" },
              { icon: RotateCcw, text: "30-day returns", sub: "No questions asked" },
              { icon: Shield, text: "Safe & tested", sub: "Dermatologist approved" },
            ].map(({ icon: Icon, text, sub }) => (
              <div key={text} className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-[var(--green-light)] flex items-center justify-center shrink-0">
                  <Icon size={15} style={{ color: "var(--green)" }} />
                </div>
                <div>
                  <p className="text-xs font-semibold text-foreground">{text}</p>
                  <p className="text-xs text-muted-foreground">{sub}</p>
                </div>
              </div>
            ))}
          </div>

          {/* Tags */}
          <div className="flex flex-wrap gap-2 mt-4">
            {product.tags.map(tag => (
              <span key={tag} className="px-2.5 py-1 rounded-lg bg-secondary text-xs text-muted-foreground">
                #{tag}
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="mb-12">
        <div className="flex overflow-x-auto border-b border-border gap-1 mb-6 -mb-px no-scrollbar">
          {TABS.map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={cn(
                "shrink-0 px-5 py-3 text-sm font-medium border-b-2 transition-colors",
                activeTab === tab
                  ? "border-[var(--green)] text-[var(--green)]"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              )}
            >
              {tab}
            </button>
          ))}
        </div>

        {activeTab === "Description" && (
          <div className="grid md:grid-cols-2 gap-8 max-w-4xl">
            <div>
              <h3 className="font-semibold text-foreground mb-3">Product Benefits</h3>
              <ul className="space-y-2.5">
                {[
                  "Cuts through grease and grime in seconds",
                  "Safe for use around children and pets",
                  "Pleasant long-lasting fragrance",
                  "Works on countertops, tiles, appliances and more",
                  "Biodegradable formula with minimal packaging",
                ].map(b => (
                  <li key={b} className="flex items-start gap-2.5 text-sm text-muted-foreground">
                    <Check size={14} className="shrink-0 mt-0.5" style={{ color: "var(--green)" }} />
                    {b}
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <h3 className="font-semibold text-foreground mb-3">How to Use</h3>
              <ol className="space-y-2.5">
                {[
                  "Shake bottle before use",
                  "Spray directly onto the surface",
                  "Leave for 30 seconds to work",
                  "Wipe clean with a damp cloth or sponge",
                  "For tough stains, repeat and scrub gently",
                ].map((step, i) => (
                  <li key={i} className="flex gap-3 text-sm text-muted-foreground">
                    <span className="w-5 h-5 rounded-full bg-[var(--green-light)] text-[var(--green)] text-xs flex items-center justify-center shrink-0 font-semibold mt-0.5">
                      {i + 1}
                    </span>
                    {step}
                  </li>
                ))}
              </ol>
            </div>
          </div>
        )}

        {activeTab === "Ingredients & Safety" && (
          <div className="max-w-3xl space-y-6">
            <div>
              <h3 className="font-semibold text-foreground mb-2">Key Ingredients</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Water (Aqua), Sodium Laureth Sulfate (3%), Cocamidopropyl Betaine, Citric Acid, Sodium Chloride,
                Parfum (Natural Citrus Essential Oil), Sodium Benzoate, Potassium Sorbate, Limonene.
              </p>
            </div>
            <div>
              <h3 className="font-semibold text-foreground mb-2">Safety Information</h3>
              <div className="grid sm:grid-cols-2 gap-3">
                {["Child-safe formula", "Pet-friendly", "Not tested on animals", "Biodegradable", "Free from parabens", "Free from harsh bleach"].map(s => (
                  <div key={s} className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Check size={13} style={{ color: "var(--green)" }} /> {s}
                  </div>
                ))}
              </div>
            </div>
            <div className="p-4 rounded-xl bg-[var(--yellow-light)] border border-[var(--yellow)]/30">
              <p className="text-sm text-amber-700">
                <strong>Caution:</strong> Avoid contact with eyes. If contact occurs, rinse immediately with water. Keep out of reach of children. Do not mix with other cleaning products.
              </p>
            </div>
          </div>
        )}

        {activeTab === "Delivery & Returns" && (
          <div className="max-w-2xl space-y-5">
            {[
              { title: "Delivery Coordination", detail: "Delivery instructions are sent after payment confirmation." },
              { title: "Customer-Shouldered Shipping", detail: "Shipping cost is handled separately and is not added to the store checkout total." },
              { title: "Returns Policy", detail: "30-day no-quibble returns on all unused items in original packaging" },
            ].map(({ title, detail }) => (
              <div key={title} className="flex gap-4 p-4 rounded-xl border border-border bg-card">
                <div className="w-8 h-8 rounded-lg bg-[var(--green-light)] flex items-center justify-center shrink-0">
                  <Truck size={14} style={{ color: "var(--green)" }} />
                </div>
                <div>
                  <p className="font-semibold text-foreground text-sm mb-0.5">{title}</p>
                  <p className="text-sm text-muted-foreground">{detail}</p>
                </div>
              </div>
            ))}
          </div>
        )}

        {activeTab === "Reviews" && (
          <div className="max-w-3xl">
            <div className="flex items-center gap-5 mb-8 p-5 rounded-2xl border border-border bg-secondary/30">
              <div className="text-center">
                <div className="text-5xl font-black">{product.rating}</div>
                <RatingStars rating={product.rating} size={18} />
                <p className="text-xs text-muted-foreground mt-1">{product.reviewCount} reviews</p>
              </div>
            </div>
            {eligibleOrderId && (
              <div className="mb-6 rounded-2xl border border-border bg-card p-5">
                <p className="font-semibold text-foreground">Write a verified review</p>
                <div className="mt-3 flex flex-wrap gap-2">
                  {[1, 2, 3, 4, 5].map(value => (
                    <button
                      key={value}
                      type="button"
                      onClick={() => setReviewRating(value)}
                      className={cn(
                        "rounded-lg border px-3 py-2 text-sm font-semibold",
                        reviewRating === value ? "border-[var(--green)] bg-[var(--green-light)] text-[var(--green)]" : "border-border",
                      )}
                    >
                      {value}
                    </button>
                  ))}
                </div>
                <textarea
                  value={reviewComment}
                  onChange={event => setReviewComment(event.target.value)}
                  placeholder="Share your experience with this product."
                  className="mt-3 min-h-24 w-full rounded-xl border border-border bg-card p-3 text-sm outline-none focus:ring-2 focus:ring-ring/30"
                />
                <button
                  disabled={reviewSubmitting || reviewComment.trim().length < 8}
                  onClick={submitReview}
                  className="mt-3 h-10 rounded-xl bg-primary px-4 text-sm font-semibold text-primary-foreground disabled:opacity-50"
                >
                  {reviewSubmitting ? "Saving..." : "Submit Review"}
                </button>
              </div>
            )}
            {reviews.length > 0 && (
              <div className="mb-6 space-y-4">
                {reviews.map(review => (
                  <div key={review.id} className="p-5 rounded-2xl border border-border bg-card">
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold" style={{ background: "var(--green)" }}>
                          {review.customerName.charAt(0)}
                        </div>
                        <div>
                          <p className="text-sm font-semibold text-foreground">{review.customerName}</p>
                          <p className="text-xs text-muted-foreground">{new Date(review.createdAt).toLocaleDateString()}</p>
                        </div>
                      </div>
                      <RatingStars rating={review.rating} size={13} />
                    </div>
                    <p className="text-sm text-muted-foreground leading-relaxed">"{review.comment}"</p>
                    <p className="text-xs text-[var(--green)] mt-2">Verified Purchase</p>
                  </div>
                ))}
              </div>
            )}
            <div className="space-y-4">
              {REVIEWS.slice(0, 3).map(review => (
                <div key={review.id} className="p-5 rounded-2xl border border-border bg-card">
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex items-center gap-2.5">
                      <div
                        className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold"
                        style={{ background: "var(--green)" }}
                      >
                        {review.avatar}
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-foreground">{review.name}</p>
                        <p className="text-xs text-muted-foreground">{review.date}</p>
                      </div>
                    </div>
                    <RatingStars rating={review.rating} size={13} />
                  </div>
                  <p className="text-sm text-muted-foreground leading-relaxed">"{review.text}"</p>
                  {review.verified && (
                    <p className="text-xs text-[var(--green)] mt-2">✓ Verified Purchase</p>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Related products */}
      <div>
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold text-foreground">Related Products</h2>
          <button onClick={() => onNavigate("listing")} className="text-sm text-[var(--green)] hover:underline flex items-center gap-1">
            View all <ChevronRight size={14} />
          </button>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {related.map(p => (
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
    </main>
  );
}
