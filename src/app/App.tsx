import { lazy, Suspense, useCallback, useEffect, useRef, useState } from "react";
import { Eye, EyeOff } from "lucide-react";
import { Toaster, toast } from "sonner";
import {
  api,
  ApiClientError,
  isAuthRequiredError,
  type HomepageContent,
  type PromoCode,
  type PublicUser,
  type ReviewSummary,
  type StorefrontReview,
} from "./api";
import { StoreHeader } from "./store/StoreHeader";
import { StoreFooter } from "./store/StoreFooter";
import { CookieConsent, type CookieConsentChoice } from "./store/CookieConsent";
import { HomePage } from "./store/pages/HomePage";
import type { InfoPageKind } from "./store/pages/InfoPage";
import type { AdminOperationsSection } from "./store/pages/AdminOperationsPage";
import type { CartItem, Page, Product } from "./store/types";

const ListingPage = lazy(() =>
  import("./store/pages/ListingPage").then(({ ListingPage }) => ({ default: ListingPage })),
);
const ProductPage = lazy(() =>
  import("./store/pages/ProductPage").then(({ ProductPage }) => ({ default: ProductPage })),
);
const CartPage = lazy(() =>
  import("./store/pages/CartPage").then(({ CartPage }) => ({ default: CartPage })),
);
const CheckoutPage = lazy(() =>
  import("./store/pages/CheckoutPage").then(({ CheckoutPage }) => ({ default: CheckoutPage })),
);
const ProfilePage = lazy(() =>
  import("./store/pages/ProfilePage").then(({ ProfilePage }) => ({ default: ProfilePage })),
);
const OrdersPage = lazy(() =>
  import("./store/pages/OrdersPage").then(({ OrdersPage }) => ({ default: OrdersPage })),
);
const WishlistPage = lazy(() =>
  import("./store/pages/WishlistPage").then(({ WishlistPage }) => ({ default: WishlistPage })),
);
const SupportPage = lazy(() =>
  import("./store/pages/SupportPage").then(({ SupportPage }) => ({ default: SupportPage })),
);
const InfoPage = lazy(() =>
  import("./store/pages/InfoPage").then(({ InfoPage }) => ({ default: InfoPage })),
);
const AdminAnalyticsPage = lazy(() =>
  import("./store/pages/AdminAnalyticsPage").then(({ AdminAnalyticsPage }) => ({ default: AdminAnalyticsPage })),
);
const AdminOperationsPage = lazy(() =>
  import("./store/pages/AdminOperationsPage").then(({ AdminOperationsPage }) => ({ default: AdminOperationsPage })),
);
const AdminListingsPage = lazy(() =>
  import("./store/pages/AdminListingsPage").then(({ AdminListingsPage }) => ({ default: AdminListingsPage })),
);
const AdminOrdersPage = lazy(() =>
  import("./store/pages/AdminOrdersPage").then(({ AdminOrdersPage }) => ({ default: AdminOrdersPage })),
);
const AdminWholesalePage = lazy(() =>
  import("./store/pages/AdminWholesalePage").then(({ AdminWholesalePage }) => ({ default: AdminWholesalePage })),
);
const WholesalePage = lazy(() =>
  import("./store/pages/WholesalePage").then(({ WholesalePage }) => ({ default: WholesalePage })),
);

const GOOGLE_GSI_SCRIPT_SRC = "https://accounts.google.com/gsi/client?hl=en";
const AUTH_STORAGE_KEY = "gleamtech_auth";
const COOKIE_CONSENT_STORAGE_KEY = "gleamtech_cookie_consent";
const SUPPORT_PAGES = ["delivery-info", "returns-refunds", "track-order", "faq", "contact-us"] as const;
const INFO_PAGES = ["about-us", "sustainability", "sitemap", "privacy-policy", "terms-conditions", "cookie-settings"] as const;
const ADMIN_OPERATION_PAGES = ["admin-activity", "admin-payments", "admin-inventory", "admin-customers", "admin-reports", "admin-promos", "admin-homepage"] as const;

const ADMIN_OPERATION_SECTION_BY_PAGE = {
  "admin-activity": "activity",
  "admin-payments": "payments",
  "admin-inventory": "inventory",
  "admin-customers": "customers",
  "admin-reports": "reports",
  "admin-promos": "promos",
  "admin-homepage": "homepage",
} satisfies Record<typeof ADMIN_OPERATION_PAGES[number], AdminOperationsSection>;

const EMPTY_AUTH_FORM = {
  email: "",
  password: "",
  firstName: "",
  lastName: "",
};

const EMPTY_TWO_FACTOR_CHALLENGE = {
  token: "",
  email: "",
  code: "",
};

interface GoogleCredentialResponse {
  credential?: string;
}

interface GoogleAccountsId {
  initialize: (options: { client_id: string; callback: (response: GoogleCredentialResponse) => void }) => void;
  cancel: () => void;
  renderButton: (
    parent: HTMLElement,
    options: {
      theme: "outline";
      size: "large";
      type: "standard";
      text: "signin_with" | "signup_with";
      shape: "rectangular";
      logo_alignment: "left";
      locale: "en";
      width?: number;
    },
  ) => void;
}

declare global {
  interface Window {
    google?: {
      accounts: {
        id: GoogleAccountsId;
      };
    };
  }
}

function getPasswordStrength(password: string) {
  const checks = [
    password.length >= 12,
    /[A-Z]/.test(password),
    /[a-z]/.test(password),
    /\d/.test(password),
    /[^A-Za-z0-9]/.test(password),
  ];
  const score = checks.filter(Boolean).length;
  const label = score <= 2 ? "Weak" : score <= 4 ? "Good" : "Strong";
  return { checks, score, label };
}

export default function App() {
  const [page, setPage] = useState<Page>("home");
  const [products, setProducts] = useState<Product[]>([]);
  const [productLoading, setProductLoading] = useState(true);
  const [productError, setProductError] = useState("");
  // undefined means the live homepage content is still loading; null means no
  // record exists and allows the storefront fallback to render.
  const [homepageContent, setHomepageContent] = useState<HomepageContent | null | undefined>(undefined);
  const [storefrontReviews, setStorefrontReviews] = useState<StorefrontReview[]>([]);
  const [reviewSummary, setReviewSummary] = useState<ReviewSummary>({ average: 0, count: 0 });
  const [promos, setPromos] = useState<PromoCode[]>([]);
  const [checkoutPromoCode, setCheckoutPromoCode] = useState<string | null>(null);
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [wishlist, setWishlist] = useState<Set<string>>(new Set());
  const [user, setUser] = useState<PublicUser | null>(null);
  const [authOpen, setAuthOpen] = useState(false);
  const [authMode, setAuthMode] = useState<"login" | "register" | "forgot" | "reset">("login");
  const [authForm, setAuthForm] = useState(EMPTY_AUTH_FORM);
  const [resetToken, setResetToken] = useState("");
  const [twoFactorChallenge, setTwoFactorChallenge] = useState(EMPTY_TWO_FACTOR_CHALLENGE);
  const [authSubmitting, setAuthSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [cookieConsentOpen, setCookieConsentOpen] = useState(false);
  const googleButtonRef = useRef<HTMLDivElement | null>(null);
  const googleClientId = import.meta.env.VITE_GOOGLE_CLIENT_ID ?? "";
  const passwordStrength = getPasswordStrength(authForm.password);
  const openAuthModal = useCallback((mode: "login" | "register" | "forgot" | "reset" = "login") => {
    setAuthMode(mode);
    setAuthForm(EMPTY_AUTH_FORM);
    setTwoFactorChallenge(EMPTY_TWO_FACTOR_CHALLENGE);
    setShowPassword(false);
    setAuthOpen(true);
  }, []);

  const closeAuthModal = useCallback(() => {
    setAuthOpen(false);
    setAuthForm(EMPTY_AUTH_FORM);
    setTwoFactorChallenge(EMPTY_TWO_FACTOR_CHALLENGE);
    setShowPassword(false);
  }, []);

  const saveCookieConsent = useCallback((choice: CookieConsentChoice) => {
    localStorage.setItem(COOKIE_CONSENT_STORAGE_KEY, choice);
    setCookieConsentOpen(false);
  }, []);

  const apiMessage = (error: unknown) =>
    error instanceof ApiClientError
      ? error.body.message
      : error instanceof Error
        ? error.message
        : "Request failed.";

  const navigate = useCallback((p: Page) => {
    setPage(p);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, []);

  const refreshProducts = useCallback(async (options: { silent?: boolean } = {}) => {
    if (!options.silent) setProductLoading(true);
    try {
      const result = await api.products();
      setProducts(result.products);
      setProductError("");
    } catch (error) {
      setProductError(apiMessage(error));
      throw error;
    } finally {
      if (!options.silent) setProductLoading(false);
    }
  }, []);

  const refreshStoreContent = useCallback(async () => {
    try {
      const [homepageResult, promoResult] = await Promise.all([api.homepage(), api.promos()]);
      setHomepageContent(homepageResult.content);
      setStorefrontReviews(homepageResult.reviews);
      setReviewSummary(homepageResult.reviewSummary);
      setPromos(promoResult.promos);
    } catch (error) {
      // Resolve the loading state so an API outage does not leave a permanent
      // skeleton. The fallback is only used after the live request has failed.
      setHomepageContent(null);
      throw error;
    }
  }, []);

  const loadCart = useCallback(async () => {
    const cart = await api.cart();
    setCartItems(cart.items);
  }, []);

  const loadWishlist = useCallback(async () => {
    const result = await api.wishlist();
    setWishlist(new Set(result.products.map(product => product.id)));
  }, []);

  const rememberAuthenticatedUser = useCallback((nextUser: PublicUser) => {
    setUser(nextUser);
    localStorage.setItem(AUTH_STORAGE_KEY, "1");
    if (nextUser.role === "ADMIN") {
      navigate("admin-analytics");
    }
  }, [navigate]);

  const completeSignedInState = useCallback(async (nextUser: PublicUser, message = "Signed in") => {
    rememberAuthenticatedUser(nextUser);
    closeAuthModal();
    toast.success(message);
    await Promise.all([loadCart(), loadWishlist()]);
  }, [closeAuthModal, loadCart, loadWishlist, rememberAuthenticatedUser]);

  const clearAuthenticatedUser = useCallback(() => {
    api.clearAuthState();
    setUser(null);
    setCartItems([]);
    localStorage.removeItem(AUTH_STORAGE_KEY);
  }, []);

  useEffect(() => {
    const authResult = new URLSearchParams(window.location.search).get("auth");
    if (authResult === "oauth_success") {
      toast.success("Signed in with Google");
      window.history.replaceState({}, "", window.location.pathname);
    }
    if (authResult === "oauth_error") {
      toast.error("Google sign-in was not completed. Please try again.");
      window.history.replaceState({}, "", window.location.pathname);
    }
    const incomingResetToken = new URLSearchParams(window.location.search).get("resetToken");
    if (incomingResetToken) {
      setResetToken(incomingResetToken);
      setAuthMode("reset");
      setAuthOpen(true);
      window.history.replaceState({}, "", window.location.pathname);
    }

    const hasAuthHint = authResult === "oauth_success" || localStorage.getItem(AUTH_STORAGE_KEY) === "1";

    void refreshProducts().catch(() => undefined);
    void refreshStoreContent().catch(() => undefined);
    if (!hasAuthHint) return;

    void api
      .me()
      .then(result => {
        rememberAuthenticatedUser(result.user);
        return Promise.all([loadCart(), loadWishlist()]);
      })
      .catch(error => {
        clearAuthenticatedUser();
        if (!isAuthRequiredError(error)) {
          toast.error(apiMessage(error));
        }
      });
  }, [clearAuthenticatedUser, loadCart, loadWishlist, refreshProducts, refreshStoreContent, rememberAuthenticatedUser]);

  useEffect(() => {
    if (!localStorage.getItem(COOKIE_CONSENT_STORAGE_KEY)) {
      setCookieConsentOpen(true);
    }
  }, []);

  useEffect(() => {
    if (!selectedProduct) return;
    const refreshed = products.find(product => product.id === selectedProduct.id);
    if (refreshed && refreshed !== selectedProduct) setSelectedProduct(refreshed);
  }, [products, selectedProduct]);

  useEffect(() => {
    if (!authOpen || !googleClientId || !googleButtonRef.current) return;

    let cancelled = false;
    const buttonNode = googleButtonRef.current;

    const handleGoogleCredential = async (response: GoogleCredentialResponse) => {
      if (!response.credential) {
        toast.error("Google sign-in did not return a credential.");
        return;
      }

      try {
        const result = await api.googleCredential({ credential: response.credential });
        if ("twoFactorRequired" in result) {
          setTwoFactorChallenge({ token: result.challengeToken, email: result.email, code: "" });
          setAuthMode("login");
          setAuthOpen(true);
          toast.info("Enter your authenticator code to finish signing in.");
          return;
        }
        await completeSignedInState(result.user, "Signed in with Google");
      } catch (error) {
        toast.error(apiMessage(error));
      }
    };

    const renderGoogleButton = () => {
      if (cancelled || !window.google?.accounts.id || !buttonNode) return;
      buttonNode.innerHTML = "";
      window.google.accounts.id.initialize({
        client_id: googleClientId,
        callback: handleGoogleCredential,
      });
      window.google.accounts.id.cancel();
      window.google.accounts.id.renderButton(buttonNode, {
        type: "standard",
        size: "large",
        theme: "outline",
        text: authMode === "login" ? "signin_with" : "signup_with",
        shape: "rectangular",
        logo_alignment: "left",
        locale: "en",
        width: buttonNode.clientWidth || 352,
      });
    };

    const existingDefaultScript = document.querySelector<HTMLScriptElement>('script[src="https://accounts.google.com/gsi/client"]');
    if (existingDefaultScript) {
      existingDefaultScript.remove();
      window.google = undefined;
    }

    const existingScript = document.querySelector<HTMLScriptElement>(`script[src="${GOOGLE_GSI_SCRIPT_SRC}"]`);
    if (window.google?.accounts.id) {
      renderGoogleButton();
    } else if (existingScript) {
      existingScript.addEventListener("load", renderGoogleButton, { once: true });
    } else {
      const script = document.createElement("script");
      script.src = GOOGLE_GSI_SCRIPT_SRC;
      script.async = true;
      script.defer = true;
      script.addEventListener("load", renderGoogleButton, { once: true });
      document.head.appendChild(script);
    }

    return () => {
      cancelled = true;
      if (buttonNode) buttonNode.innerHTML = "";
    };
  }, [authMode, authOpen, completeSignedInState, googleClientId]);

  const addToCart = useCallback(
    async (product: Product, qty: number, size: string) => {
      if (!user) {
        openAuthModal("login");
        toast.info("Sign in to save this item to your cart.");
        return;
      }

      try {
        const cart = await api.addCartItem({ productId: product.id, quantity: qty, size });
        setCartItems(cart.items);
        toast.success(`${product.name} added to cart`, { description: `${qty} x ${size}` });
      } catch (error) {
        if (isAuthRequiredError(error)) {
          clearAuthenticatedUser();
          openAuthModal("login");
          toast.info("Your session expired. Sign in again to add items to your cart.");
          return;
        }
        toast.error(apiMessage(error));
      }
    },
    [clearAuthenticatedUser, openAuthModal, user],
  );

  const updateCartQty = useCallback(async (productId: string, qty: number) => {
    try {
      const cart = await api.updateCartItem(productId, qty);
      setCartItems(cart.items);
    } catch (error) {
      toast.error(apiMessage(error));
    }
  }, []);

  const removeFromCart = useCallback(async (productId: string) => {
    try {
      const cart = await api.removeCartItem(productId);
      setCartItems(cart.items);
      toast.info("Item removed from cart");
    } catch (error) {
      toast.error(apiMessage(error));
    }
  }, []);

  const viewProduct = useCallback(
    (product: Product) => {
      setSelectedProduct(product);
      navigate("product");
    },
    [navigate],
  );

  const toggleWishlist = useCallback((id: string) => {
    setWishlist(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
        toast.info("Removed from wishlist");
        if (user) void api.removeWishlist(id).catch(error => toast.error(apiMessage(error)));
      } else {
        next.add(id);
        toast.success("Added to wishlist");
        if (user) void api.addWishlist(id).catch(error => toast.error(apiMessage(error)));
      }
      return next;
    });
  }, [user]);

  const handlePlaceOrder = useCallback(
    async (input: Parameters<typeof api.checkout>[0]) => {
      if (!user) {
        openAuthModal("login");
        throw new Error("Sign in to continue to checkout.");
      }

      const result = await api.checkout(input);
      setCartItems([]);
      return { orderNumber: result.order.orderNumber };
    },
    [openAuthModal, user],
  );

  const startCheckout = useCallback((promoCode: string | null) => {
    setCheckoutPromoCode(promoCode);
    navigate("checkout");
  }, [navigate]);

  const submitAuth = useCallback(async () => {
    if (authSubmitting) return;
    if (twoFactorChallenge.token) {
      if (!/^\d{6}$/.test(twoFactorChallenge.code.replace(/\s+/g, ""))) {
        toast.error("Enter the 6-digit authenticator code.");
        return;
      }
      setAuthSubmitting(true);
      try {
        const result = await api.completeTwoFactorLogin({
          challengeToken: twoFactorChallenge.token,
          code: twoFactorChallenge.code,
        });
        setTwoFactorChallenge(EMPTY_TWO_FACTOR_CHALLENGE);
        await completeSignedInState(result.user);
      } catch (error) {
        toast.error(apiMessage(error));
      } finally {
        setAuthSubmitting(false);
      }
      return;
    }
    if (authMode === "register" && passwordStrength.score < 4) {
      toast.error("Use a stronger password before creating your account.");
      return;
    }
    if (authMode === "forgot") {
      setAuthSubmitting(true);
      try {
        await api.forgotPassword({ email: authForm.email });
        toast.success("Please check your email for further instructions in resetting your password.");
        setAuthMode("login");
      } catch (error) {
        toast.error(apiMessage(error));
      } finally {
        setAuthSubmitting(false);
      }
      return;
    }
    if (authMode === "reset") {
      if (passwordStrength.score < 4) {
        toast.error("Use a stronger password before resetting your password.");
        return;
      }
      setAuthSubmitting(true);
      try {
        await api.resetPassword({ token: resetToken, password: authForm.password });
        toast.success("Password reset. Please sign in.");
        setResetToken("");
        setAuthMode("login");
        setAuthForm(EMPTY_AUTH_FORM);
      } catch (error) {
        toast.error(apiMessage(error));
      } finally {
        setAuthSubmitting(false);
      }
      return;
    }

    setAuthSubmitting(true);
    try {
      const result =
        authMode === "login"
          ? await api.login({ email: authForm.email, password: authForm.password })
          : await api.register(authForm);
      if ("twoFactorRequired" in result) {
        setTwoFactorChallenge({ token: result.challengeToken, email: result.email, code: "" });
        toast.info("Enter your authenticator code to finish signing in.");
        return;
      }
      await completeSignedInState(result.user, authMode === "login" ? "Signed in" : "Account created");
    } catch (error) {
      toast.error(apiMessage(error));
    } finally {
      setAuthSubmitting(false);
    }
  }, [authForm, authMode, authSubmitting, completeSignedInState, passwordStrength.score, resetToken, twoFactorChallenge]);

  const logout = useCallback(async () => {
    try {
      await api.logout();
    } finally {
      clearAuthenticatedUser();
      setAuthForm(EMPTY_AUTH_FORM);
      setTwoFactorChallenge(EMPTY_TWO_FACTOR_CHALLENGE);
      navigate("home");
      toast.info("Signed out");
    }
  }, [clearAuthenticatedUser, navigate]);

  return (
    <div className="min-h-screen flex flex-col bg-background" style={{ fontFamily: "var(--font-sans)" }}>
      <StoreHeader
        cartItems={cartItems}
        onNavigate={navigate}
        onRemoveFromCart={removeFromCart}
        onUpdateCartQty={updateCartQty}
        products={products}
        onViewProduct={viewProduct}
        user={user}
        onAccount={() => user ? navigate("profile") : openAuthModal("login")}
        onLogout={logout}
      />

      <div className="flex-1">
        <Suspense
          fallback={(
            <div
              className="flex min-h-[50vh] items-center justify-center px-4 text-sm text-muted-foreground"
              role="status"
              aria-live="polite"
            >
              Loading page…
            </div>
          )}
        >
          {page === "home" && (
            <HomePage
              onAddToCart={addToCart}
              onViewProduct={viewProduct}
              onNavigate={navigate}
              wishlist={wishlist}
              onToggleWishlist={toggleWishlist}
              products={products}
              productLoading={productLoading}
              productError={productError}
              onRefreshProducts={() => refreshProducts()}
              content={homepageContent}
              reviews={storefrontReviews}
              reviewSummary={reviewSummary}
            />
          )}
        {page === "listing" && (
          <ListingPage
            onAddToCart={addToCart}
            onViewProduct={viewProduct}
            onNavigate={navigate}
            wishlist={wishlist}
            onToggleWishlist={toggleWishlist}
            products={products}
            productLoading={productLoading}
            productError={productError}
            onRefreshProducts={() => refreshProducts()}
          />
        )}
        {page === "product" && selectedProduct && (
          <ProductPage
            product={selectedProduct}
            onAddToCart={addToCart}
            onViewProduct={viewProduct}
            onNavigate={navigate}
            user={user}
            onSignIn={() => openAuthModal("login")}
            wishlist={wishlist}
            onToggleWishlist={toggleWishlist}
            products={products}
          />
        )}
        {page === "cart" && (
          <CartPage
            cartItems={cartItems}
            onUpdateQty={updateCartQty}
            onRemove={removeFromCart}
            onAddToCart={addToCart}
            onViewProduct={viewProduct}
            onNavigate={navigate}
            wishlist={wishlist}
            onToggleWishlist={toggleWishlist}
            products={products}
            promos={promos}
            onCheckout={startCheckout}
          />
        )}
        {page === "checkout" && (
          user ? (
            <CheckoutPage
              cartItems={cartItems}
              promo={checkoutPromoCode ? promos.find(promo => promo.code === checkoutPromoCode) ?? null : null}
              onNavigate={navigate}
              onPlaceOrder={handlePlaceOrder}
              user={user}
            />
          ) : (
            <CheckoutSignInRequired onNavigate={navigate} onSignIn={() => openAuthModal("login")} />
          )
        )}
        {page === "profile" && user && (
          <ProfilePage user={user} onNavigate={navigate} onLogout={logout} />
        )}
        {page === "orders" && user && (
          <OrdersPage onNavigate={navigate} />
        )}
        {page === "wholesale" && (
          user ? <WholesalePage user={user} /> : <AccessDenied onNavigate={navigate} onSignIn={() => openAuthModal("login")} user={user} />
        )}
        {page === "wishlist" && user && (
          <WishlistPage
            products={products}
            wishlist={wishlist}
            onAddToCart={addToCart}
            onViewProduct={viewProduct}
            onToggleWishlist={toggleWishlist}
            onNavigate={navigate}
          />
        )}
        {SUPPORT_PAGES.includes(page as typeof SUPPORT_PAGES[number]) && (
          <SupportPage
            page={page as "delivery-info" | "returns-refunds" | "track-order" | "faq" | "contact-us"}
            onNavigate={navigate}
            onSignIn={() => openAuthModal("login")}
            isSignedIn={Boolean(user)}
          />
        )}
        {INFO_PAGES.includes(page as InfoPageKind) && (
          <InfoPage
            page={page as InfoPageKind}
            onNavigate={navigate}
            onOpenCookiePreferences={() => setCookieConsentOpen(true)}
          />
        )}
        {page === "admin-analytics" && (
          user?.role === "ADMIN" ? (
            <AdminAnalyticsPage />
          ) : (
            <AccessDenied onNavigate={navigate} onSignIn={() => openAuthModal("login")} user={user} />
          )
        )}
        {page === "admin-listings" && (
          user?.role === "ADMIN" ? (
            <AdminListingsPage onNavigate={navigate} onProductsChanged={refreshProducts} />
          ) : (
            <AccessDenied onNavigate={navigate} onSignIn={() => openAuthModal("login")} user={user} />
          )
        )}
        {page === "admin-orders" && (
          user?.role === "ADMIN" ? (
            <AdminOrdersPage />
          ) : (
            <AccessDenied onNavigate={navigate} onSignIn={() => openAuthModal("login")} user={user} />
          )
        )}
        {page === "admin-wholesale" && (
          user?.role === "ADMIN" ? (
            <AdminWholesalePage />
          ) : (
            <AccessDenied onNavigate={navigate} onSignIn={() => openAuthModal("login")} user={user} />
          )
        )}
          {ADMIN_OPERATION_PAGES.includes(page as typeof ADMIN_OPERATION_PAGES[number]) && (
            user?.role === "ADMIN" ? (
              <AdminOperationsPage
                section={ADMIN_OPERATION_SECTION_BY_PAGE[page as typeof ADMIN_OPERATION_PAGES[number]]}
                onStoreContentChanged={refreshStoreContent}
              />
            ) : (
              <AccessDenied onNavigate={navigate} onSignIn={() => openAuthModal("login")} user={user} />
            )
          )}
        </Suspense>
      </div>

      {page !== "checkout" && (
        <StoreFooter
          onNavigate={navigate}
          showNewsletter={page === "home"}
          adminCompact={user?.role === "ADMIN"}
        />
      )}

      <CookieConsent open={cookieConsentOpen} onChoose={saveCookieConsent} onNavigate={navigate} />

      {authOpen && (
        <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/40 px-4">
          <div className="w-full max-w-md rounded-2xl border border-border bg-card p-6 shadow-2xl">
            <h2 className="text-xl font-bold text-foreground mb-4">
              {twoFactorChallenge.token
                ? "Two-factor verification"
                : authMode === "forgot"
                  ? "Reset password"
                  : authMode === "reset"
                    ? "Create new password"
                    : authMode === "login" ? "Sign in" : "Create account"}
            </h2>
            <div className="space-y-3">
              {twoFactorChallenge.token ? (
                <>
                  <p className="text-sm text-muted-foreground">
                    Enter the 6-digit code from your authenticator app for {twoFactorChallenge.email}.
                  </p>
                  <input
                    className="h-12 w-full rounded-xl border border-border bg-card px-3 text-center text-lg font-semibold tracking-[0.4em]"
                    placeholder="000000"
                    inputMode="numeric"
                    autoComplete="one-time-code"
                    maxLength={6}
                    value={twoFactorChallenge.code}
                    onChange={event => setTwoFactorChallenge(prev => ({
                      ...prev,
                      code: event.target.value.replace(/\D/g, "").slice(0, 6),
                    }))}
                  />
                </>
              ) : authMode === "register" && (
                <div className="grid grid-cols-2 gap-3">
                  <input
                    className="h-11 rounded-xl border border-border bg-card px-3 text-sm"
                    placeholder="First name"
                    value={authForm.firstName}
                    onChange={event => setAuthForm(prev => ({ ...prev, firstName: event.target.value }))}
                  />
                  <input
                    className="h-11 rounded-xl border border-border bg-card px-3 text-sm"
                    placeholder="Last name"
                    value={authForm.lastName}
                    onChange={event => setAuthForm(prev => ({ ...prev, lastName: event.target.value }))}
                  />
                </div>
              )}
              {!twoFactorChallenge.token && authMode !== "reset" && (
                <input
                  className="h-11 w-full rounded-xl border border-border bg-card px-3 text-sm"
                  placeholder="Email"
                  type="email"
                  autoComplete="off"
                  name={`gleamtech-email-${authMode}`}
                  value={authForm.email}
                  onChange={event => setAuthForm(prev => ({ ...prev, email: event.target.value }))}
                />
              )}
              {!twoFactorChallenge.token && authMode !== "forgot" && <div className="relative">
                <input
                  className="h-11 w-full rounded-xl border border-border bg-card px-3 pr-11 text-sm"
                  placeholder="Password"
                  type={showPassword ? "text" : "password"}
                  autoComplete="new-password"
                  name={`gleamtech-password-${authMode}`}
                  value={authForm.password}
                  onChange={event => setAuthForm(prev => ({ ...prev, password: event.target.value }))}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(value => !value)}
                  className="absolute right-2 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-lg text-muted-foreground hover:bg-secondary hover:text-foreground"
                  aria-label={showPassword ? "Hide password" : "Show password"}
                  title={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? <EyeOff size={17} /> : <Eye size={17} />}
                </button>
              </div>}
              {!twoFactorChallenge.token && (authMode === "register" || authMode === "reset") && (
                <div className="rounded-xl border border-border bg-secondary/60 p-3">
                  <div className="mb-2 flex items-center justify-between text-xs">
                    <span className="font-medium text-foreground">Password strength</span>
                    <span className={passwordStrength.score >= 4 ? "text-[var(--green)]" : "text-muted-foreground"}>
                      {passwordStrength.label}
                    </span>
                  </div>
                  <div className="mb-3 grid grid-cols-5 gap-1">
                    {Array.from({ length: 5 }).map((_, index) => (
                      <span
                        key={index}
                        className={`h-1.5 rounded-full ${index < passwordStrength.score ? "bg-primary" : "bg-muted"}`}
                      />
                    ))}
                  </div>
                  <div className="grid gap-1 text-xs text-muted-foreground">
                    {[
                      "At least 12 characters",
                      "Uppercase letter",
                      "Lowercase letter",
                      "Number",
                      "Symbol",
                    ].map((item, index) => (
                      <span key={item} className={passwordStrength.checks[index] ? "text-[var(--green)]" : ""}>
                        {passwordStrength.checks[index] ? "✓" : "•"} {item}
                      </span>
                    ))}
                  </div>
                </div>
              )}
              <button
                onClick={submitAuth}
                disabled={authSubmitting || ((authMode === "register" || authMode === "reset") && passwordStrength.score < 4)}
                className="flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-primary font-semibold text-primary-foreground hover:bg-[var(--green-dark)] disabled:cursor-not-allowed disabled:opacity-60"
              >
                {authSubmitting && <span className="h-4 w-4 rounded-full border-2 border-white/70 border-t-transparent animate-spin" />}
                {twoFactorChallenge.token
                  ? authSubmitting ? "Verifying..." : "Verify code"
                  : authSubmitting
                  ? authMode === "login" ? "Signing in..." : authMode === "forgot" ? "Sending..." : authMode === "reset" ? "Resetting..." : "Creating account..."
                  : authMode === "login" ? "Sign in" : authMode === "forgot" ? "Reset password" : authMode === "reset" ? "Reset password" : "Create account"}
              </button>
              {!twoFactorChallenge.token && authMode !== "forgot" && authMode !== "reset" && <div className="flex items-center gap-3 text-xs text-muted-foreground">
                <span className="h-px flex-1 bg-border" />
                or
                <span className="h-px flex-1 bg-border" />
              </div>}
              {!twoFactorChallenge.token && authMode !== "forgot" && authMode !== "reset" && (googleClientId ? (
                <div ref={googleButtonRef} className="min-h-11 w-full" />
              ) : (
                <div className="rounded-xl border border-border bg-secondary/60 px-3 py-2 text-center text-xs text-muted-foreground">
                  Google sign-in needs VITE_GOOGLE_CLIENT_ID.
                </div>
              ))}
              {!twoFactorChallenge.token && authMode !== "forgot" && authMode !== "reset" && <button
                onClick={() => {
                  setAuthMode(authMode === "login" ? "register" : "login");
                  setShowPassword(false);
                }}
                className="w-full text-sm text-[var(--green)] hover:underline"
              >
                {authMode === "login" ? "Need an account? Create one" : "Already have an account? Sign in"}
              </button>}
              {!twoFactorChallenge.token && authMode === "login" && (
                <button onClick={() => setAuthMode("forgot")} className="w-full text-sm text-muted-foreground hover:text-foreground">
                  Forgot password?
                </button>
              )}
              {!twoFactorChallenge.token && (authMode === "forgot" || authMode === "reset") && (
                <button
                  onClick={() => {
                    setAuthMode("login");
                    setResetToken("");
                    setAuthForm(EMPTY_AUTH_FORM);
                  }}
                  className="w-full text-sm text-muted-foreground hover:text-foreground"
                >
                  Back to sign in
                </button>
              )}
              {twoFactorChallenge.token && (
                <button
                  onClick={() => setTwoFactorChallenge(EMPTY_TWO_FACTOR_CHALLENGE)}
                  className="w-full text-sm text-[var(--green)] hover:underline"
                >
                  Back to sign in
                </button>
              )}
              <button onClick={closeAuthModal} className="w-full text-sm text-muted-foreground hover:text-foreground">
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      <Toaster
        position="bottom-left"
        toastOptions={{
          style: {
            fontFamily: "var(--font-sans)",
            fontSize: "14px",
            borderRadius: "12px",
            border: "1px solid var(--border)",
          },
        }}
      />
    </div>
  );
}

function AccessDenied({ onNavigate, onSignIn, user }: { onNavigate: (page: Page) => void; onSignIn: () => void; user: PublicUser | null }) {
  return (
    <main className="max-w-3xl mx-auto px-4 sm:px-6 py-16 text-center">
      <div className="rounded-2xl border border-border bg-card p-8">
        <p className="text-sm font-semibold uppercase tracking-widest text-[var(--green)]">Restricted</p>
        <h1 className="mt-2 text-2xl font-bold text-foreground">Administrator access required</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          {user ? "Your account does not have permission to open this administrator area." : "Sign in with an administrator account to continue."}
        </p>
        <div className="mt-6 flex justify-center gap-3">
          <button onClick={() => onNavigate("home")} className="h-11 rounded-xl border border-border px-4 text-sm font-semibold">Go home</button>
          {!user && <button onClick={onSignIn} className="h-11 rounded-xl bg-primary px-4 text-sm font-semibold text-primary-foreground">Sign in</button>}
        </div>
      </div>
    </main>
  );
}

function CheckoutSignInRequired({ onNavigate, onSignIn }: { onNavigate: (page: Page) => void; onSignIn: () => void }) {
  return (
    <main className="max-w-3xl mx-auto px-4 sm:px-6 py-16 text-center">
      <div className="rounded-2xl border border-border bg-card p-8">
        <p className="text-sm font-semibold uppercase tracking-widest text-[var(--green)]">Secure Checkout</p>
        <h1 className="mt-2 text-2xl font-bold text-foreground">Sign in to continue</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Checkout requires an account so your cart, order details, and order history stay protected.
        </p>
        <div className="mt-6 flex justify-center gap-3">
          <button onClick={() => onNavigate("cart")} className="h-11 rounded-xl border border-border px-4 text-sm font-semibold">
            Back to cart
          </button>
          <button onClick={onSignIn} className="h-11 rounded-xl bg-primary px-4 text-sm font-semibold text-primary-foreground">
            Sign in
          </button>
        </div>
      </div>
    </main>
  );
}
