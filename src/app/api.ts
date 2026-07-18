import type { CartItem, Product } from "./store/types";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? "";
const asset = (filename: string) => new URL(`../../assets/${filename}`, import.meta.url).href;
const SESSION_TOKEN_STORAGE_KEY = "gleamtech_session_token";
const ENABLE_BEARER_SESSION_FALLBACK = import.meta.env.VITE_ENABLE_BEARER_SESSION_FALLBACK === "true";

const BUNDLED_WEBP_ASSETS = [
  "blissbright.webp",
  "gleamfresh.webp",
  "gleamglow.webp",
  "gleamhush.webp",
  "gleamkiss.webp",
  "gleamtech-main-logo.webp",
  "gleamwhite.webp",
  "hero-image-1.webp",
  "puregleam-kalamansi.webp",
  "puregleam-lemon.webp",
  "sub-hero-image-2.webp",
  "sub-hero-image-3.webp",
  "ultrabright.webp",
  "whitelush.webp",
] as const;

function canonicalBundledAssetName(image: string): string | null {
  let pathname = image;
  try {
    pathname = new URL(image, "https://gleamtech.local").pathname;
  } catch {
    undefined;
  }
  if (!pathname.startsWith("/assets/")) return null;
  let filename = pathname.split("/").pop() ?? "";
  try {
    filename = decodeURIComponent(filename);
  } catch {
    return null;
  }
  for (const canonicalName of BUNDLED_WEBP_ASSETS) {
    const stem = canonicalName.slice(0, -".webp".length);
    const isExactLegacyName = filename === `${stem}.png`;
    const isCanonicalName = filename === canonicalName;
    const isViteHashedName = filename.startsWith(`${stem}-`) && (filename.endsWith(".png") || filename.endsWith(".webp"));
    if (isExactLegacyName || isCanonicalName || isViteHashedName) return canonicalName;
  }
  return null;
}

export interface PublicUser {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: string;
  twoFactorEnabled: boolean;
}

export interface AuthSuccess {
  user: PublicUser;
  csrfToken: string;
  sessionToken?: string;
}

export interface TwoFactorChallenge {
  twoFactorRequired: true;
  challengeToken: string;
  email: string;
}

export type AuthResponse = AuthSuccess | TwoFactorChallenge;

export interface AdminProduct {
  id: string;
  sku: string;
  slug: string;
  name: string;
  shortDescription: string;
  description: string;
  priceCents: number;
  weightGrams?: number | null;
  stockQuantity: number;
  isActive: boolean;
  isPublished: boolean;
  category: string;
  scent?: string | null;
  isEco: boolean;
  primaryImageUrl: string;
  sizes: string[];
  tags: string[];
  createdAt: string;
  updatedAt: string;
  hasOrderHistory: boolean;
  hasReferences: boolean;
  images: Array<{ id: string; url: string; isPrimary: boolean; sortOrder: number; mimeType: string; sizeBytes: number; storageProvider?: string; publicId?: string | null; createdAt: string }>;
}

export interface HomepageContent {
  eyebrow: string;
  headline: string;
  subheadline: string;
  primaryCta: string;
  secondaryCta: string;
  heroImage: string;
  subHeroImageLeft: string;
  subHeroImageRight: string;
  promoLabel: string;
  promoHeadline: string;
  promoText: string;
  promiseOneTitle: string;
  promiseOneText: string;
  promiseTwoTitle: string;
  promiseTwoText: string;
  updatedAt: string;
}

export type HomepageContentInput = Omit<HomepageContent, "updatedAt">;

export interface StorefrontReview {
  id: string;
  rating: number;
  comment: string;
  createdAt: string;
  verified: boolean;
  customerName: string;
  productName: string;
}

export interface ReviewSummary {
  average: number;
  count: number;
}

export interface PromoCode {
  id: string;
  code: string;
  name: string;
  description: string;
  percentOff: number;
  active: boolean;
  startsAt: string | null;
  endsAt: string | null;
  createdAt?: string;
  updatedAt?: string;
}

export type PromoCodeInput = Omit<PromoCode, "id" | "createdAt" | "updatedAt">;

export interface AdminOrderSummary {
  orderId: string;
  orderNumber: string;
  createdAt: string;
  customerName: string;
  customerEmail: string;
  itemCount: number;
  subtotalCents: number;
  shippingCents: number;
  discountCents: number;
  totalCents: number;
  subtotal: number;
  shipping: number;
  discount: number;
  total: number;
  paymentStatus: string;
  orderStatus: string;
  paymentMethod: "GCASH" | "BANK_TRANSFER";
  promoCode?: string | null;
  promoPercentOff?: number | null;
  paidConfirmationEmailSentAt?: string | null;
  paidConfirmationEmailLastError?: string | null;
}

export interface AdminOrderDetail extends AdminOrderSummary {
  paymentReference?: string | null;
  paymentSubmission?: PaymentSubmissionSummary | null;
  shippingAddress: { name: string; phone: string; line1: string; line2: string; city: string; region: string; postal: string; country: string };
  customer: { id: string; firstName: string; lastName: string; email: string; role: string };
  customerNote: string;
  requests: Array<{ id: string; type: string; status: string; reason: string; adminNote: string; createdAt: string; reviewedAt: string | null }>;
  items: Array<{
    id: string;
    productId: string;
    productName: string;
    productSku: string;
    unitPriceCents: number;
    unitPrice: number;
    quantity: number;
    lineTotalCents: number;
    lineTotal: number;
    image: string;
  }>;
  statusHistory: Array<{ id: string; previousStatus: string; newStatus: string; createdAt: string; changedBy: null | { id: string; email: string; name: string } }>;
  allowedNextStatuses: string[];
}

export interface AdminAnalyticsProduct {
  productId: string;
  productName: string;
  productSku: string;
  quantitySold: number;
  orderCount: number;
  revenueCents: number;
  revenue: number;
  currentPriceCents: number;
  currentPrice: number;
  currentStock: number;
  active: boolean;
  isPublished: boolean;
  image: string;
}

export interface AdminAnalytics {
  range: { preset: string; from: string; to: string };
  summary: {
    totalPaidSalesCents: number;
    totalPaidSales: number;
    totalPaidOrders: number;
    totalOrdersPlaced: number;
    averageOrderValueCents: number;
    averageOrderValue: number;
    pendingPaymentOrders: number;
    cancelledOrders: number;
    refundedOrders: number;
  };
  products: {
    mostOrderedProduct: AdminAnalyticsProduct | null;
    highestQuantityProduct: AdminAnalyticsProduct | null;
    leastOrderedProduct: AdminAnalyticsProduct | null;
    totalQuantitySold: number;
    topByRevenue: AdminAnalyticsProduct[];
    topByQuantity: AdminAnalyticsProduct[];
    performance: AdminAnalyticsProduct[];
    zeroSalesCount: number;
    lowStockProducts: Array<{ productId: string; sku: string; name: string; image: string; currentStock: number; active: boolean; isPublished: boolean }>;
    deactivatedListings: number;
    unpublishedListings: number;
  };
  customers: {
    totalCustomerAccounts: number;
    newCustomers: number;
    customersWithPaidOrders: number;
    repeatCustomers: number;
    averageOrdersPerCustomer: number;
  };
  charts: {
    salesOverTime: Array<{ date: string; sales: number; salesCents: number }>;
    ordersOverTime: Array<{ date: string; orders: number }>;
    orderStatusBreakdown: Array<{ status: string; count: number }>;
    paymentStatusBreakdown: Array<{ status: string; count: number }>;
  };
}

export interface AdminActivityLog {
  id: string;
  action: string;
  entityType: string;
  entityId?: string | null;
  description: string;
  metadata?: unknown;
  createdAt: string;
  admin: null | { id: string; email: string; name: string };
}

export interface AdminPaymentQueueOrder {
  orderId: string;
  orderNumber: string;
  createdAt: string;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  itemCount: number;
  total: number;
  totalCents: number;
  paymentStatus: string;
  orderStatus: string;
  paymentMethod: "GCASH" | "BANK_TRANSFER";
  paymentReference: string | null;
  paymentSubmittedAt: string | null;
  paymentProofMimeType: string | null;
  paymentProofSizeBytes: number | null;
  hasPaymentProof: boolean;
}

export interface AdminCustomer {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  active: boolean;
  createdAt: string;
  updatedAt: string;
  phone: string;
  totalOrders: number;
  paidOrders: number;
  paidSales: number;
  latestOrderAt: string | null;
}

export interface AdminInventoryProduct {
  id: string;
  sku: string;
  name: string;
  image: string;
  stockQuantity: number;
  active: boolean;
  isPublished: boolean;
  price: number;
  orderItemCount: number;
  updatedAt: string;
}

export interface WholesaleDashboard { activeAccounts: number; openOrders: number; unpaidOrders: number; overdueOrders: number; totalOrderValue: number; totalOrderValueMinor: number }
export interface WholesaleAccount {
  id: string; companyName: string; contactName: string; email: string; phone: string; taxId?: string | null;
  billingAddress: string; shippingAddress: string; priceTier: string; discountPercent: number; paymentTermDays: number;
  creditLimitMinor: number; minimumOrderMinor: number; creditLimit: number; minimumOrder: number;
  status: "ACTIVE" | "ON_HOLD" | "CLOSED"; notes?: string | null; orderCount: number; outstanding: number; createdAt: string; updatedAt: string;
}
export interface WholesaleApplication { id: string; companyName: string; contactName: string; email?: string; phone: string; taxId?: string | null; billingAddress: string; shippingAddress: string; businessType: string; estimatedMonthlySpendMinor: number; estimatedMonthlySpend?: number; message?: string | null; status: "PENDING" | "APPROVED" | "REJECTED"; adminNote?: string | null; createdAt: string; reviewedAt?: string | null }
export interface CustomerWholesaleProduct { id: string; sku: string; name: string; image: string; retailPrice: number; wholesalePrice: number; wholesalePriceMinor: number; availableQuantity: number }
export interface CustomerWholesalePortal { application: WholesaleApplication | null; account: WholesaleAccount | null; orders: WholesaleOrder[]; products: CustomerWholesaleProduct[] }
export type WholesaleAccountInput = Omit<WholesaleAccount, "id" | "creditLimit" | "minimumOrder" | "orderCount" | "outstanding" | "createdAt" | "updatedAt">;
export interface WholesaleOrder {
  id: string; orderNumber: string; purchaseOrderNumber?: string | null; status: string; paymentStatus: string;
  paymentDueAt?: string | null; subtotal: number; discount: number; total: number; itemCount: number; notes?: string | null; createdAt: string;
  account: WholesaleAccount; items: Array<{ id: string; productId: string; productName: string; productSku: string; quantity: number; unitPriceMinor: number; unitPrice: number; lineTotal: number }>;
}

export interface CustomerAddress {
  id: string;
  label: string;
  name: string;
  phone: string;
  line1: string;
  line2: string;
  city: string;
  region: string;
  postal: string;
  country: string;
  isDefault: boolean;
}

export interface ProductReview {
  id: string;
  rating: number;
  title: string;
  comment: string;
  createdAt: string;
  verified: boolean;
  customerName: string;
}

export interface CustomerOrder {
  id: string;
  orderNumber: string;
  status: string;
  paymentStatus: string;
  paymentMethod: "GCASH" | "BANK_TRANSFER";
  subtotal: number;
  discount: number;
  promoCode: string | null;
  promoPercentOff: number | null;
  shipping: number;
  total: number;
  shippingAddress: { name: string; phone: string; line1: string; line2: string; city: string; region: string; postal: string; country: string };
  customerNote: string;
  createdAt: string;
  paymentSubmission: PaymentSubmissionSummary | null;
  requests: Array<{ id: string; type: string; status: string; reason: string; adminNote: string; createdAt: string; reviewedAt: string | null }>;
  items: Array<{
    productId: string;
    productName: string;
    productSku: string;
    unitPrice: number;
    quantity: number;
    lineTotal: number;
  }>;
}

export interface PaymentSubmissionSummary {
  method: "GCASH" | "BANK_TRANSFER";
  reference: string;
  proofMimeType: string;
  proofSizeBytes: number;
  submittedAt: string;
  hasProof: boolean;
}

export interface Pagination {
  page: number;
  pageSize: number;
  total: number;
  pageCount: number;
}

export interface AdminProductInput {
  sku: string;
  name: string;
  shortDescription: string;
  description: string;
  priceCents: number;
  weightGrams?: number | null;
  stockQuantity: number;
  category: string;
  scent?: string;
  isEco: boolean;
  isActive: boolean;
  isPublished: boolean;
  sizes: string[];
  tags: string[];
}

export interface ApiErrorBody {
  statusCode: number;
  code: string;
  message: string;
  details?: Record<string, unknown>;
  requestId?: string;
}

export class ApiClientError extends Error {
  constructor(public readonly body: ApiErrorBody) {
    super(body.message);
  }
}

let csrfToken = "";

function readStoredSessionToken() {
  if (!ENABLE_BEARER_SESSION_FALLBACK) return "";
  try {
    return localStorage.getItem(SESSION_TOKEN_STORAGE_KEY) ?? "";
  } catch {
    return "";
  }
}

function rememberSessionToken(token?: string) {
  if (!ENABLE_BEARER_SESSION_FALLBACK) return;
  if (!token) return;
  try {
    localStorage.setItem(SESSION_TOKEN_STORAGE_KEY, token);
  } catch {
    undefined;
  }
}

function clearSessionToken() {
  try {
    localStorage.removeItem(SESSION_TOKEN_STORAGE_KEY);
  } catch {
    undefined;
  }
}

export function resolveImageUrl(image: string): string {
  if (!image) return image;
  const bundledAssetName = canonicalBundledAssetName(image);
  if (bundledAssetName) return asset(bundledAssetName);
  if (image.startsWith("assets/")) return asset(image.replace("assets/", ""));
  if (image.startsWith("/assets/")) return asset(image.replace("/assets/", ""));
  const uploadedProductImage = image.match(/^\/uploads\/products\/([^/]+)$/);
  if (uploadedProductImage) return `${API_BASE_URL}/api/uploads/products/${uploadedProductImage[1]}`;
  if (image.startsWith("/api/")) return `${API_BASE_URL}${image}`;
  try {
    const url = new URL(image);
    const uploadedAbsoluteImage = url.pathname.match(/^\/uploads\/products\/([^/]+)$/);
    if (uploadedAbsoluteImage) return `${API_BASE_URL}/api/uploads/products/${uploadedAbsoluteImage[1]}`;
    if (url.pathname.startsWith("/uploads/")) return `${API_BASE_URL}${url.pathname}`;
  } catch {
    undefined;
  }
  return image;
}

const normalizeImageUrl = resolveImageUrl;

function normalizeProduct(product: Product): Product {
  const image = normalizeImageUrl(product.image);
  if (image === product.image) return product;
  return {
    ...product,
    image,
  };
}

function normalizeAdminProduct(product: AdminProduct): AdminProduct {
  const primaryImageUrl = normalizeImageUrl(product.primaryImageUrl);
  return {
    ...product,
    hasReferences: product.hasReferences ?? product.hasOrderHistory,
    primaryImageUrl,
    images: product.images.map(image => ({
      ...image,
      url: normalizeImageUrl(image.url),
    })),
  };
}

function normalizeAdminOrder(order: AdminOrderDetail): AdminOrderDetail {
  return {
    ...order,
    items: order.items.map(item => ({
      ...item,
      image: normalizeImageUrl(item.image),
    })),
  };
}

function normalizeAdminAnalytics(analytics: AdminAnalytics): AdminAnalytics {
  const normalizeProduct = (product: AdminAnalyticsProduct): AdminAnalyticsProduct => ({
    ...product,
    image: product.image ? normalizeImageUrl(product.image) : product.image,
  });
  return {
    ...analytics,
    products: {
      ...analytics.products,
      mostOrderedProduct: analytics.products.mostOrderedProduct ? normalizeProduct(analytics.products.mostOrderedProduct) : null,
      highestQuantityProduct: analytics.products.highestQuantityProduct ? normalizeProduct(analytics.products.highestQuantityProduct) : null,
      leastOrderedProduct: analytics.products.leastOrderedProduct ? normalizeProduct(analytics.products.leastOrderedProduct) : null,
      topByRevenue: analytics.products.topByRevenue.map(normalizeProduct),
      topByQuantity: analytics.products.topByQuantity.map(normalizeProduct),
      performance: analytics.products.performance.map(normalizeProduct),
      lowStockProducts: analytics.products.lowStockProducts.map(product => ({
        ...product,
        image: product.image ? normalizeImageUrl(product.image) : product.image,
      })),
    },
  };
}

function normalizeHomepageContent(content: HomepageContent): HomepageContent {
  return {
    ...content,
    heroImage: normalizeImageUrl(content.heroImage),
    subHeroImageLeft: normalizeImageUrl(content.subHeroImageLeft),
    subHeroImageRight: normalizeImageUrl(content.subHeroImageRight),
  };
}

interface ApiCartItem {
  productId: string;
  quantity: number;
  qty?: number;
  size: string;
  product: Product;
}

function normalizeNumber(value: unknown, fallback = 0): number {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

function normalizeCartItem(item: ApiCartItem): CartItem {
  return {
    qty: normalizeNumber(item.qty ?? item.quantity, 1),
    size: item.size,
    product: normalizeProduct(item.product),
  };
}

function readCsrfCookie() {
  return document.cookie
    .split("; ")
    .find(row => row.startsWith("gleamtech_csrf="))
    ?.split("=")[1] ?? "";
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const method = options.method ?? "GET";
  const headers = new Headers(options.headers);
  if (options.body && typeof options.body === "string" && !headers.has("content-type")) {
    headers.set("content-type", "application/json");
  }
  const sessionToken = readStoredSessionToken();
  if (sessionToken && !headers.has("authorization")) {
    headers.set("authorization", `Bearer ${sessionToken}`);
  }
  if (method !== "GET") {
    const token = csrfToken || readCsrfCookie();
    if (token) headers.set("x-csrf-token", decodeURIComponent(token));
  }

  let response: Response;
  try {
    response = await fetch(`${API_BASE_URL}${path}`, {
      ...options,
      method,
      headers,
      credentials: "include",
    });
  } catch {
    throw new Error(
      "Could not reach the Gleamtech API. Check that the backend is running and VITE_API_BASE_URL points to the backend URL.",
    );
  }

  if (!response.ok) {
    const body = (await response.json().catch(() => ({
      statusCode: response.status,
      code: "HTTP_ERROR",
      message: "Request failed.",
    }))) as ApiErrorBody;
    throw new ApiClientError(body);
  }

  if (response.status === 204) return undefined as T;
  return (await response.json()) as T;
}

async function requestText(path: string, options: RequestInit = {}): Promise<string> {
  const method = options.method ?? "GET";
  const headers = new Headers(options.headers);
  const sessionToken = readStoredSessionToken();
  if (sessionToken && !headers.has("authorization")) headers.set("authorization", `Bearer ${sessionToken}`);
  if (method !== "GET") {
    const token = csrfToken || readCsrfCookie();
    if (token) headers.set("x-csrf-token", decodeURIComponent(token));
  }
  const response = await fetch(`${API_BASE_URL}${path}`, { ...options, method, headers, credentials: "include" });
  if (!response.ok) {
    const body = (await response.json().catch(() => ({
      statusCode: response.status,
      code: "HTTP_ERROR",
      message: "Request failed.",
    }))) as ApiErrorBody;
    throw new ApiClientError(body);
  }
  return response.text();
}

async function requestBlob(path: string, options: RequestInit = {}): Promise<Blob> {
  const method = options.method ?? "GET";
  const headers = new Headers(options.headers);
  const sessionToken = readStoredSessionToken();
  if (sessionToken && !headers.has("authorization")) headers.set("authorization", `Bearer ${sessionToken}`);
  if (method !== "GET") {
    const token = csrfToken || readCsrfCookie();
    if (token) headers.set("x-csrf-token", decodeURIComponent(token));
  }
  const response = await fetch(`${API_BASE_URL}${path}`, { ...options, method, headers, credentials: "include" });
  if (!response.ok) {
    const body = (await response.json().catch(() => ({
      statusCode: response.status,
      code: "HTTP_ERROR",
      message: "Request failed.",
    }))) as ApiErrorBody;
    throw new ApiClientError(body);
  }
  return response.blob();
}

function rememberAuth<T extends { csrfToken?: string; sessionToken?: string }>(response: T): T {
  if (response.csrfToken) csrfToken = response.csrfToken;
  rememberSessionToken(response.sessionToken);
  return response;
}

function isAuthSuccess(response: AuthResponse): response is AuthSuccess {
  return "user" in response;
}

export function isAuthRequiredError(error: unknown): boolean {
  return error instanceof ApiClientError && error.body.code === "AUTHENTICATION_REQUIRED";
}

export const api = {
  oauthUrl(provider: "google") {
    return `${API_BASE_URL}/api/auth/${provider}`;
  },
  async me() {
    return rememberAuth(await request<{ user: PublicUser; csrfToken: string }>("/api/accounts/me"));
  },
  async register(input: { email: string; password: string; firstName: string; lastName: string }) {
    return rememberAuth(
      await request<AuthSuccess>("/api/auth/register", {
        method: "POST",
        body: JSON.stringify(input),
      }),
    );
  },
  async login(input: { email: string; password: string }) {
    const response = await request<AuthResponse>("/api/auth/login", {
      method: "POST",
      body: JSON.stringify(input),
    });
    return isAuthSuccess(response) ? rememberAuth(response) : response;
  },
  forgotPassword(input: { email: string }) {
    return request<{ ok: true }>("/api/auth/password/forgot", {
      method: "POST",
      body: JSON.stringify(input),
    });
  },
  resetPassword(input: { token: string; password: string }) {
    return request<{ ok: true }>("/api/auth/password/reset", {
      method: "POST",
      body: JSON.stringify(input),
    });
  },
  async completeTwoFactorLogin(input: { challengeToken: string; code: string }) {
    return rememberAuth(
      await request<AuthSuccess>("/api/auth/login/2fa", {
        method: "POST",
        body: JSON.stringify(input),
      }),
    );
  },
  async googleCredential(input: { credential: string }) {
    const response = await request<AuthResponse>("/api/auth/google/credential", {
      method: "POST",
      body: JSON.stringify(input),
    });
    return isAuthSuccess(response) ? rememberAuth(response) : response;
  },
  async logout() {
    await request<{ ok: true }>("/api/auth/logout", { method: "POST" });
    csrfToken = "";
    clearSessionToken();
  },
  clearAuthState() {
    csrfToken = "";
    clearSessionToken();
  },
  async products() {
    const response = await request<{ products: Product[] }>("/api/products");
    return { products: response.products.map(normalizeProduct) };
  },
  async cart() {
    const response = await request<{ id: string; items: ApiCartItem[]; subtotal: number }>("/api/cart");
    return { ...response, items: response.items.map(normalizeCartItem) };
  },
  async addCartItem(input: { productId: string; quantity: number; size: string }) {
    const response = await request<{ id: string; items: ApiCartItem[]; subtotal: number }>(
      "/api/cart/items",
      { method: "POST", body: JSON.stringify(input) },
    );
    return { ...response, items: response.items.map(normalizeCartItem) };
  },
  async updateCartItem(productId: string, quantity: number) {
    const response = await request<{ id: string; items: ApiCartItem[]; subtotal: number }>(
      `/api/cart/items/${productId}`,
      { method: "PATCH", body: JSON.stringify({ quantity }) },
    );
    return { ...response, items: response.items.map(normalizeCartItem) };
  },
  async removeCartItem(productId: string) {
    const response = await request<{ id: string; items: ApiCartItem[]; subtotal: number }>(
      `/api/cart/items/${productId}`,
      { method: "DELETE" },
    );
    return { ...response, items: response.items.map(normalizeCartItem) };
  },
  checkout(input: {
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
  }) {
    return request<{ order: { id: string; orderNumber: string; total: number; discount: number; promoCode: string | null } }>("/api/orders/checkout", {
      method: "POST",
      body: JSON.stringify(input),
    });
  },
  submitPayment(orderId: string, input: { method: "GCASH" | "BANK_TRANSFER"; reference: string; proof: File }) {
    const formData = new FormData();
    formData.append("method", input.method);
    formData.append("reference", input.reference);
    formData.append("proof", input.proof);
    return request<{ submission: PaymentSubmissionSummary }>(`/api/orders/${orderId}/payment-submission`, {
      method: "POST",
      body: formData,
    });
  },
  orders(query = "") {
    return request<{ orders: CustomerOrder[]; pagination: Pagination }>(`/api/orders${query}`);
  },
  async homepage() {
    const response = await request<{
      content: HomepageContent | null;
      reviews: StorefrontReview[];
      reviewSummary: ReviewSummary;
    }>("/api/homepage");
    return {
      ...response,
      content: response.content ? normalizeHomepageContent(response.content) : null,
    };
  },
  promos() {
    return request<{ promos: PromoCode[] }>("/api/promos");
  },
  order(orderId: string) {
    return request<{ order: CustomerOrder }>(`/api/orders/${orderId}`);
  },
  cancelOrder(orderId: string) {
    return request<{ order: CustomerOrder }>(`/api/orders/${orderId}/cancel`, { method: "PATCH" });
  },
  requestOrderCancellation(orderId: string, reason: string) {
    return request<{ request: { id: string } }>(`/api/orders/${orderId}/cancel-request`, {
      method: "POST",
      body: JSON.stringify({ reason }),
    });
  },
  requestReturnRefund(orderId: string, reason: string) {
    return request<{ request: { id: string } }>(`/api/orders/${orderId}/return-request`, {
      method: "POST",
      body: JSON.stringify({ reason }),
    });
  },
  reorder(orderId: string) {
    return request<{ added: number; skipped: string[] }>(`/api/orders/${orderId}/reorder`, { method: "POST" });
  },
  orderReceipt(orderId: string) {
    return request<{ receipt: CustomerOrder }>(`/api/orders/${orderId}/receipt`);
  },
  orderInvoicePdf(orderId: string) {
    return requestBlob(`/api/orders/${orderId}/invoice.pdf`);
  },
  addresses() {
    return request<{ addresses: CustomerAddress[] }>("/api/accounts/addresses");
  },
  saveAddress(input: Omit<CustomerAddress, "id">) {
    return request<{ address: CustomerAddress }>("/api/accounts/addresses", {
      method: "POST",
      body: JSON.stringify(input),
    });
  },
  wishlist() {
    return request<{ products: Product[] }>("/api/accounts/wishlist");
  },
  addWishlist(productId: string) {
    return request<{ saved: boolean }>(`/api/accounts/wishlist/${productId}`, { method: "POST" });
  },
  removeWishlist(productId: string) {
    return request<{ saved: boolean }>(`/api/accounts/wishlist/${productId}`, { method: "DELETE" });
  },
  accountSecurity() {
    return request<{ twoFactor: { enabled: boolean; enabledAt: string | null } }>("/api/accounts/security");
  },
  setupTwoFactor(password: string) {
    return request<{ qrSvg: string }>("/api/accounts/2fa/setup", {
      method: "POST",
      body: JSON.stringify({ password }),
    });
  },
  confirmTwoFactor(code: string) {
    return request<{ twoFactor: { enabled: boolean } }>("/api/accounts/2fa/confirm", {
      method: "POST",
      body: JSON.stringify({ code }),
    });
  },
  disableTwoFactor(code: string, password: string) {
    return request<{ twoFactor: { enabled: boolean } }>("/api/accounts/2fa/disable", {
      method: "POST",
      body: JSON.stringify({ code, password }),
    });
  },
  productReviews(productId: string) {
    return request<{ reviews: ProductReview[] }>(`/api/products/${productId}/reviews`);
  },
  createProductReview(productId: string, input: { orderId: string; rating: number; title?: string; comment: string }) {
    return request<{ review: { id: string; rating: number; title: string; comment: string } }>(`/api/products/${productId}/reviews`, {
      method: "POST",
      body: JSON.stringify(input),
    });
  },
  stockNotification(productId: string) {
    return request<{ subscribed: boolean; message: string }>(`/api/products/${productId}/stock-notifications`, { method: "POST" });
  },
  async adminProducts(query = "") {
    const response = await request<{ products: AdminProduct[]; pagination: { page: number; pageSize: number; total: number; pageCount: number } }>(
      `/api/admin/products${query}`,
    );
    return { ...response, products: response.products.map(normalizeAdminProduct) };
  },
  async adminProduct(productId: string) {
    const response = await request<{ product: AdminProduct }>(`/api/admin/products/${productId}`);
    return { product: normalizeAdminProduct(response.product) };
  },
  async adminCreateProduct(input: AdminProductInput) {
    const response = await request<{ product: AdminProduct }>("/api/admin/products", {
      method: "POST",
      body: JSON.stringify(input),
    });
    return { product: normalizeAdminProduct(response.product) };
  },
  async adminUpdateProduct(productId: string, input: Partial<AdminProductInput>) {
    const response = await request<{ product: AdminProduct }>(`/api/admin/products/${productId}`, {
      method: "PATCH",
      body: JSON.stringify(input),
    });
    return { product: normalizeAdminProduct(response.product) };
  },
  adminDeleteProduct(productId: string) {
    return request<{ mode: "deleted" | "archived"; productId?: string; product?: AdminProduct }>(
      `/api/admin/products/${productId}`,
      { method: "DELETE" },
    );
  },
  adminUploadProductImage(productId: string, file: File, primary = true) {
    const formData = new FormData();
    formData.append("image", file);
    formData.append("primary", String(primary));
    return request<{ image: { id: string; url: string; isPrimary: boolean } }>(
      `/api/admin/products/${productId}/images`,
      { method: "POST", body: formData },
    );
  },
  adminDownloadProductImage(productId: string, imageId: string) {
    return requestBlob(`/api/admin/products/${productId}/images/${imageId}/download`);
  },
  adminDeleteProductImage(productId: string, imageId: string) {
    return request<{ ok: true }>(`/api/admin/products/${productId}/images/${imageId}`, { method: "DELETE" });
  },
  async adminSetPrimaryProductImage(productId: string, imageId: string) {
    const response = await request<{ product: AdminProduct }>(`/api/admin/products/${productId}/images/${imageId}/primary`, {
      method: "PATCH",
    });
    return { product: normalizeAdminProduct(response.product) };
  },
  async adminReorderProductImages(productId: string, imageIds: string[]) {
    const response = await request<{ product: AdminProduct }>(`/api/admin/products/${productId}/images/reorder`, {
      method: "PATCH",
      body: JSON.stringify({ imageIds }),
    });
    return { product: normalizeAdminProduct(response.product) };
  },
  adminOrders(query = "") {
    return request<{ orders: AdminOrderSummary[]; pagination: { page: number; pageSize: number; total: number; pageCount: number } }>(
      `/api/admin/orders${query}`,
    );
  },
  async adminAnalytics(query = "") {
    return normalizeAdminAnalytics(await request<AdminAnalytics>(`/api/admin/analytics${query}`));
  },
  adminActivity(query = "") {
    return request<{ logs: AdminActivityLog[]; pagination: Pagination }>(`/api/admin/activity${query}`);
  },
  adminPayments(query = "") {
    return request<{ orders: AdminPaymentQueueOrder[]; pagination: Pagination }>(`/api/admin/payments${query}`);
  },
  async adminCustomers(query = "") {
    return request<{ customers: AdminCustomer[]; pagination: Pagination }>(`/api/admin/customers${query}`);
  },
  adminSetCustomerActive(customerId: string, active: boolean) {
    return request<{ customer: { id: string; email: string; active: boolean } }>(`/api/admin/customers/${customerId}/active`, {
      method: "PATCH",
      body: JSON.stringify({ active }),
    });
  },
  async adminInventory(query = "") {
    const response = await request<{ summary: { lowStockCount: number; outOfStockCount: number }; products: AdminInventoryProduct[]; pagination: Pagination }>(`/api/admin/inventory${query}`);
    return {
      ...response,
      products: response.products.map(product => ({ ...product, image: product.image ? normalizeImageUrl(product.image) : product.image })),
    };
  },
  adminUpdateInventory(productId: string, stockQuantity: number) {
    return request<{ ok: true }>(`/api/admin/inventory/${productId}`, {
      method: "PATCH",
      body: JSON.stringify({ stockQuantity }),
    });
  },
  adminReportCsv(query = "") {
    return requestText(`/api/admin/reports.csv${query}`);
  },
  async adminHomepage() {
    return request<{ content: HomepageContent }>("/api/admin/homepage");
  },
  async adminUpdateHomepage(input: HomepageContentInput) {
    return request<{ content: HomepageContent }>("/api/admin/homepage", {
      method: "PATCH",
      body: JSON.stringify(input),
    });
  },
  async adminUploadHomepageImage(slot: "heroImage" | "subHeroImageLeft" | "subHeroImageRight", file: File) {
    const formData = new FormData();
    formData.append("image", file);
    return request<{ content: HomepageContent }>(`/api/admin/homepage/images/${slot}`, {
      method: "POST",
      body: formData,
    });
  },
  adminPromos(query = "") {
    return request<{ promos: PromoCode[]; pagination: Pagination }>(`/api/admin/promos${query}`);
  },
  adminCreatePromo(input: PromoCodeInput) {
    return request<{ promo: PromoCode }>("/api/admin/promos", { method: "POST", body: JSON.stringify(input) });
  },
  adminUpdatePromo(promoId: string, input: PromoCodeInput) {
    return request<{ promo: PromoCode }>(`/api/admin/promos/${promoId}`, { method: "PATCH", body: JSON.stringify(input) });
  },
  adminDeletePromo(promoId: string) {
    return request<{ ok: true }>(`/api/admin/promos/${promoId}`, { method: "DELETE" });
  },
  adminWholesaleDashboard() {
    return request<{ dashboard: WholesaleDashboard }>("/api/admin/wholesale/dashboard");
  },
  adminWholesaleApplications(query = "") {
    return request<{ applications: WholesaleApplication[]; pagination: Pagination }>(`/api/admin/wholesale/applications${query}`);
  },
  adminReviewWholesaleApplication(applicationId: string, input: { decision: "approve" | "reject"; adminNote?: string; priceTier?: string; discountPercent?: number; paymentTermDays?: number; creditLimitMinor?: number; minimumOrderMinor?: number }) {
    return request<{ application: WholesaleApplication; account?: WholesaleAccount }>(`/api/admin/wholesale/applications/${applicationId}`, { method: "PATCH", body: JSON.stringify(input) });
  },
  adminWholesaleAccounts(query = "") {
    return request<{ accounts: WholesaleAccount[]; pagination: Pagination }>(`/api/admin/wholesale/accounts${query}`);
  },
  adminCreateWholesaleAccount(input: WholesaleAccountInput) {
    return request<{ account: WholesaleAccount }>("/api/admin/wholesale/accounts", { method: "POST", body: JSON.stringify(input) });
  },
  adminUpdateWholesaleAccount(accountId: string, input: WholesaleAccountInput) {
    return request<{ account: WholesaleAccount }>(`/api/admin/wholesale/accounts/${accountId}`, { method: "PATCH", body: JSON.stringify(input) });
  },
  adminWholesaleOrders(query = "") {
    return request<{ orders: WholesaleOrder[]; pagination: Pagination }>(`/api/admin/wholesale/orders${query}`);
  },
  adminCreateWholesaleOrder(input: { accountId: string; purchaseOrderNumber?: string; discountMinor: number; notes?: string; items: Array<{ productId: string; quantity: number; unitPriceMinor: number }> }) {
    return request<{ order: WholesaleOrder }>("/api/admin/wholesale/orders", { method: "POST", body: JSON.stringify(input) });
  },
  adminUpdateWholesaleOrder(orderId: string, status: string, paymentStatus: string) {
    return request<{ order: WholesaleOrder }>(`/api/admin/wholesale/orders/${orderId}`, { method: "PATCH", body: JSON.stringify({ status, paymentStatus }) });
  },
  customerWholesalePortal() {
    return request<CustomerWholesalePortal>("/api/wholesale");
  },
  submitWholesaleApplication(input: { companyName: string; contactName: string; phone: string; taxId?: string; billingAddress: string; shippingAddress: string; businessType: string; estimatedMonthlySpendMinor: number; message?: string }) {
    return request<{ application: WholesaleApplication }>("/api/wholesale/applications", { method: "POST", body: JSON.stringify(input) });
  },
  createCustomerWholesaleOrder(input: { purchaseOrderNumber?: string; notes?: string; items: Array<{ productId: string; quantity: number }> }) {
    return request<{ order: WholesaleOrder }>("/api/wholesale/orders", { method: "POST", body: JSON.stringify(input) });
  },
  async adminOrder(orderId: string) {
    const response = await request<{ order: AdminOrderDetail }>(`/api/admin/orders/${orderId}`);
    return { order: normalizeAdminOrder(response.order) };
  },
  async adminUpdateOrderStatus(orderId: string, status: string) {
    const response = await request<{ order: AdminOrderDetail }>(`/api/admin/orders/${orderId}/status`, {
      method: "PATCH",
      body: JSON.stringify({ status }),
    });
    return { order: normalizeAdminOrder(response.order) };
  },
  async adminMarkOrderPaid(orderId: string) {
    const response = await request<{ order: AdminOrderDetail; emailSent: boolean }>(
      `/api/admin/orders/${orderId}/payment-status`,
      {
        method: "PATCH",
        body: JSON.stringify({ paymentStatus: "PAID" }),
      },
    );
    return { ...response, order: normalizeAdminOrder(response.order) };
  },
  adminPaymentProof(orderId: string) {
    return requestBlob(`/api/admin/orders/${orderId}/payment-proof`);
  },
  async adminReviewOrderRequest(orderId: string, requestId: string, status: "approve" | "reject", adminNote = "") {
    const response = await request<{ order: AdminOrderDetail }>(`/api/admin/orders/${orderId}/requests/${requestId}/${status}`, {
      method: "PATCH",
      body: JSON.stringify({ adminNote }),
    });
    return { order: normalizeAdminOrder(response.order) };
  },
};
