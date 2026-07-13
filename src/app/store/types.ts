export interface Product {
  id: string;
  sku?: string;
  name: string;
  shortDesc: string;
  price: number;
  originalPrice?: number;
  weightGrams?: number;
  rating: number;
  reviewCount: number;
  category: string;
  brand: string;
  scent?: string;
  isEco: boolean;
  inStock: boolean;
  availableQuantity?: number;
  image: string;
  badge?: string;
  sizes: string[];
  tags: string[];
}

export interface CartItem {
  product: Product;
  qty: number;
  size: string;
}

export type Page =
  | "home"
  | "listing"
  | "product"
  | "cart"
  | "checkout"
  | "profile"
  | "orders"
  | "wholesale"
  | "wishlist"
  | "admin-analytics"
  | "admin-activity"
  | "admin-payments"
  | "admin-inventory"
  | "admin-customers"
  | "admin-reports"
  | "admin-promos"
  | "admin-homepage"
  | "delivery-info"
  | "returns-refunds"
  | "track-order"
  | "faq"
  | "contact-us"
  | "about-us"
  | "sustainability"
  | "sitemap"
  | "privacy-policy"
  | "terms-conditions"
  | "cookie-settings"
  | "admin-listings"
  | "admin-orders"
  | "admin-wholesale";

export interface StoreState {
  page: Page;
  cartItems: CartItem[];
  cartOpen: boolean;
  selectedProduct: Product | null;
  wishlist: Set<string>;
}
