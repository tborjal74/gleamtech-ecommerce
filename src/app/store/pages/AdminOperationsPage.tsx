import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Activity, Download, Image, PackageSearch, Search, ShieldCheck, Tags, Users, X } from "lucide-react";
import { toast } from "sonner";
import {
  api,
  ApiClientError,
  resolveImageUrl,
  type AdminActivityLog,
  type AdminCustomer,
  type HomepageContent,
  type HomepageContentInput,
  type AdminInventoryProduct,
  type AdminPaymentQueueOrder,
  type PromoCode,
  type PromoCodeInput,
} from "../../api";
import { formatCurrency } from "../currency";

export type AdminOperationsSection = "activity" | "payments" | "inventory" | "customers" | "reports" | "promos" | "homepage";

function apiMessage(error: unknown) {
  return error instanceof ApiClientError
    ? error.body.message
    : error instanceof Error
      ? error.message
      : "Request failed.";
}

const sectionMeta = {
  activity: { title: "Activity Log", desc: "Review administrator actions across orders, listings, inventory, and customers.", icon: Activity },
  payments: { title: "Payment Verification", desc: "Review pending payment orders and confirm verified transactions.", icon: ShieldCheck },
  inventory: { title: "Inventory", desc: "Monitor low stock, out-of-stock products, and adjust stock counts.", icon: PackageSearch },
  customers: { title: "Customers", desc: "Manage customer account status and review order activity.", icon: Users },
  reports: { title: "Reports Export", desc: "Export operational CSV reports from live database records.", icon: Download },
  promos: { title: "Promo Manager", desc: "Create, edit, activate, and remove live cart promo codes.", icon: Tags },
  homepage: { title: "Homepage Content", desc: "Update live homepage copy, hero images, promo banner, and brand promises.", icon: Image },
} satisfies Record<AdminOperationsSection, { title: string; desc: string; icon: typeof Activity }>;

export function AdminOperationsPage({ section, onStoreContentChanged }: { section: AdminOperationsSection; onStoreContentChanged?: () => Promise<void> }) {
  const meta = sectionMeta[section];
  const Icon = meta.icon;

  return (
    <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
      <div className="mb-6">
        <p className="text-sm font-semibold uppercase tracking-widest text-[var(--green)]">Administrator</p>
        <div className="mt-1 flex items-center gap-2">
          <Icon size={24} className="text-[var(--green)]" />
          <h1 className="text-3xl font-bold text-foreground">{meta.title}</h1>
        </div>
        <p className="mt-1 text-sm text-muted-foreground">{meta.desc}</p>
      </div>

      {section === "activity" && <ActivityPanel />}
      {section === "payments" && <PaymentsPanel />}
      {section === "inventory" && <InventoryPanel />}
      {section === "customers" && <CustomersPanel />}
      {section === "reports" && <ReportsPanel />}
      {section === "promos" && <PromosPanel onStoreContentChanged={onStoreContentChanged} />}
      {section === "homepage" && <HomepagePanel onStoreContentChanged={onStoreContentChanged} />}
    </main>
  );
}

function usePagedQuery() {
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const query = useMemo(() => {
    const params = new URLSearchParams({ page: String(page), pageSize: "15" });
    if (search.trim()) params.set("search", search.trim());
    return `?${params.toString()}`;
  }, [page, search]);
  return { search, setSearch, page, setPage, query };
}

function SearchBar({ search, setSearch }: { search: string; setSearch: (value: string) => void }) {
  return (
    <label className="relative mb-4 block max-w-md">
      <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
      <input
        value={search}
        onChange={event => setSearch(event.target.value)}
        placeholder="Search..."
        className="h-11 w-full rounded-xl border border-border bg-input-background pl-10 pr-3 text-sm outline-none focus:ring-2 focus:ring-ring/30"
      />
    </label>
  );
}

function Pager({ page, setPage, pageCount }: { page: number; setPage: (next: number) => void; pageCount: number }) {
  return (
    <div className="mt-5 flex items-center justify-between">
      <button disabled={page <= 1} onClick={() => setPage(page - 1)} className="h-10 rounded-xl border border-border px-4 text-sm font-semibold transition-all duration-150 hover:scale-[1.02] hover:bg-secondary active:scale-[0.98] disabled:opacity-40 disabled:hover:scale-100">Previous</button>
      <span className="text-sm text-muted-foreground">Page {page} of {pageCount}</span>
      <button disabled={page >= pageCount} onClick={() => setPage(page + 1)} className="h-10 rounded-xl border border-border px-4 text-sm font-semibold transition-all duration-150 hover:scale-[1.02] hover:bg-secondary active:scale-[0.98] disabled:opacity-40 disabled:hover:scale-100">Next</button>
    </div>
  );
}

function ActivityPanel() {
  const { search, setSearch, page, setPage, query } = usePagedQuery();
  const [logs, setLogs] = useState<AdminActivityLog[]>([]);
  const [pageCount, setPageCount] = useState(1);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    api.adminActivity(query)
      .then(result => {
        setLogs(result.logs);
        setPageCount(result.pagination.pageCount);
      })
      .catch(error => toast.error(apiMessage(error)))
      .finally(() => setLoading(false));
  }, [query]);

  return (
    <>
      <SearchBar search={search} setSearch={value => { setSearch(value); setPage(1); }} />
      <TableShell loading={loading} empty={!logs.length} emptyText="No activity logs found.">
        {logs.map(log => (
          <div key={log.id} className="grid gap-2 px-4 py-3 lg:grid-cols-[170px_150px_1fr_220px]">
            <p className="text-sm font-semibold text-foreground">{log.action}</p>
            <p className="text-sm text-muted-foreground">{log.entityType}</p>
            <p className="text-sm text-foreground">{log.description}</p>
            <p className="text-xs text-muted-foreground">{new Date(log.createdAt).toLocaleString()} - {log.admin?.email ?? "System"}</p>
          </div>
        ))}
      </TableShell>
      <Pager page={page} setPage={setPage} pageCount={pageCount} />
    </>
  );
}

function PaymentsPanel() {
  const { search, setSearch, page, setPage, query } = usePagedQuery();
  const [orders, setOrders] = useState<AdminPaymentQueueOrder[]>([]);
  const [pageCount, setPageCount] = useState(1);
  const [loading, setLoading] = useState(true);
  const [orderToMarkPaid, setOrderToMarkPaid] = useState<AdminPaymentQueueOrder | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const load = useCallback(() => {
    setLoading(true);
    api.adminPayments(query)
      .then(result => {
        setOrders(result.orders);
        setPageCount(result.pagination.pageCount);
      })
      .catch(error => toast.error(apiMessage(error)))
      .finally(() => setLoading(false));
  }, [query]);

  useEffect(() => load(), [load]);

  const markPaid = async () => {
    if (!orderToMarkPaid) return;
    setSubmitting(true);
    try {
      await api.adminMarkOrderPaid(orderToMarkPaid.orderId);
      toast.success("Payment marked as paid");
      setOrderToMarkPaid(null);
      load();
    } catch (error) {
      toast.error(apiMessage(error));
    } finally {
      setSubmitting(false);
    }
  };

  const viewPaymentProof = async () => {
    if (!orderToMarkPaid?.hasPaymentProof) return;
    try {
      const blob = await api.adminPaymentProof(orderToMarkPaid.orderId);
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.target = "_blank";
      link.rel = "noopener";
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.setTimeout(() => URL.revokeObjectURL(url), 60_000);
    } catch (error) {
      toast.error(apiMessage(error));
    }
  };

  return (
    <>
      <SearchBar search={search} setSearch={value => { setSearch(value); setPage(1); }} />
      <TableShell loading={loading} empty={!orders.length} emptyText="No pending payments found.">
        {orders.map(order => (
          <div key={order.orderId} className="grid gap-3 px-4 py-3 lg:grid-cols-[1fr_1fr_120px_170px_120px] lg:items-center">
            <div>
              <p className="font-semibold text-foreground">{order.orderNumber}</p>
              <p className="text-xs text-muted-foreground">{new Date(order.createdAt).toLocaleString()}</p>
            </div>
            <div>
              <p className="text-sm font-medium text-foreground">{order.customerName}</p>
              <p className="text-xs text-muted-foreground">{order.customerEmail}</p>
            </div>
            <p className="font-semibold">{formatCurrency(order.total)}</p>
            <div className="text-sm text-muted-foreground">
              <p>{order.paymentStatus} · {order.paymentMethod.replace("_", " ")}</p>
              <p className="truncate text-xs">{order.paymentReference ?? "Awaiting customer proof"}</p>
            </div>
            <button
              onClick={() => setOrderToMarkPaid(order)}
              disabled={order.paymentStatus !== "SUBMITTED" || !order.hasPaymentProof || !order.paymentReference}
              className="h-9 rounded-xl bg-primary px-3 text-sm font-semibold text-primary-foreground transition-all duration-150 hover:scale-[1.02] hover:bg-[var(--green-dark)] active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-40"
            >
              Review
            </button>
          </div>
        ))}
      </TableShell>
      <Pager page={page} setPage={setPage} pageCount={pageCount} />
      <ConfirmPaymentDialog
        order={orderToMarkPaid}
        submitting={submitting}
        onClose={() => setOrderToMarkPaid(null)}
        onConfirm={markPaid}
        onViewProof={viewPaymentProof}
      />
    </>
  );
}

function InventoryPanel() {
  const { search, setSearch, page, setPage, query } = usePagedQuery();
  const [products, setProducts] = useState<AdminInventoryProduct[]>([]);
  const [summary, setSummary] = useState({ lowStockCount: 0, outOfStockCount: 0 });
  const [pageCount, setPageCount] = useState(1);
  const [loading, setLoading] = useState(true);
  const [editingProduct, setEditingProduct] = useState<AdminInventoryProduct | null>(null);
  const [stockDraft, setStockDraft] = useState("");
  const [savingStock, setSavingStock] = useState(false);

  const load = useCallback(() => {
    setLoading(true);
    api.adminInventory(query)
      .then(result => {
        setProducts(result.products);
        setSummary(result.summary);
        setPageCount(result.pagination.pageCount);
      })
      .catch(error => toast.error(apiMessage(error)))
      .finally(() => setLoading(false));
  }, [query]);

  useEffect(() => load(), [load]);

  const openStockEditor = (product: AdminInventoryProduct) => {
    setEditingProduct(product);
    setStockDraft(String(product.stockQuantity));
  };

  const updateStock = async () => {
    if (!editingProduct) return;
    const stockQuantity = Number(stockDraft);
    if (!Number.isInteger(stockQuantity) || stockQuantity < 0) {
      toast.error("Stock quantity must be a whole number.");
      return;
    }
    setSavingStock(true);
    try {
      await api.adminUpdateInventory(editingProduct.id, stockQuantity);
      toast.success("Stock updated");
      setEditingProduct(null);
      load();
    } catch (error) {
      toast.error(apiMessage(error));
    } finally {
      setSavingStock(false);
    }
  };

  return (
    <>
      <div className="mb-4 grid gap-3 sm:grid-cols-2">
        <Metric label="Low-stock products" value={summary.lowStockCount} />
        <Metric label="Out-of-stock products" value={summary.outOfStockCount} />
      </div>
      <SearchBar search={search} setSearch={value => { setSearch(value); setPage(1); }} />
      <TableShell loading={loading} empty={!products.length} emptyText="No inventory records found.">
        {products.map(product => (
          <div key={product.id} className="grid gap-3 px-4 py-3 lg:grid-cols-[1fr_120px_100px_120px_120px] lg:items-center">
            <div className="flex items-center gap-3">
              <img src={product.image} alt={product.name} className="h-12 w-12 rounded-xl border border-border bg-white object-contain p-1" />
              <div>
                <p className="font-semibold text-foreground">{product.name}</p>
                <p className="text-xs text-muted-foreground">{product.sku}</p>
              </div>
            </div>
            <p className="font-semibold">{product.stockQuantity}</p>
            <p className="text-sm text-muted-foreground">{product.active ? "Active" : "Inactive"}</p>
            <p className="text-sm text-muted-foreground">{product.isPublished ? "Published" : "Unpublished"}</p>
            <button onClick={() => openStockEditor(product)} className="h-9 rounded-xl border border-border px-3 text-sm font-semibold transition-all duration-150 hover:scale-[1.02] hover:bg-secondary active:scale-[0.98]">Adjust</button>
          </div>
        ))}
      </TableShell>
      <Pager page={page} setPage={setPage} pageCount={pageCount} />
      <StockEditorDialog
        product={editingProduct}
        stockDraft={stockDraft}
        saving={savingStock}
        onChange={setStockDraft}
        onClose={() => setEditingProduct(null)}
        onSave={updateStock}
      />
    </>
  );
}

function ConfirmPaymentDialog({
  order,
  submitting,
  onClose,
  onConfirm,
  onViewProof,
}: {
  order: AdminPaymentQueueOrder | null;
  submitting: boolean;
  onClose: () => void;
  onConfirm: () => void;
  onViewProof: () => void;
}) {
  if (!order) return null;
  return (
    <div className="fixed inset-0 z-[70] flex items-end justify-center bg-black/40 px-4 py-4 sm:items-center">
      <section className="w-full max-w-md rounded-2xl border border-border bg-card p-5 shadow-2xl">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-[var(--green)]">Payment verification</p>
            <h2 className="mt-1 text-xl font-bold text-foreground">Mark order as paid?</h2>
          </div>
          <button
            onClick={onClose}
            disabled={submitting}
            className="flex h-9 w-9 items-center justify-center rounded-xl text-muted-foreground transition-all duration-150 hover:scale-105 hover:bg-secondary hover:text-foreground active:scale-95 disabled:opacity-50"
            aria-label="Close payment confirmation"
          >
            <X size={18} />
          </button>
        </div>
        <div className="mt-4 rounded-xl border border-border bg-secondary/50 p-4">
          <p className="font-semibold text-foreground">{order.orderNumber}</p>
          <p className="mt-1 text-sm text-muted-foreground">{order.customerName} - {order.customerEmail}</p>
          <div className="mt-3 flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Amount</span>
            <span className="font-bold text-foreground">{formatCurrency(order.total)}</span>
          </div>
          <div className="mt-2 grid gap-1 border-t border-border pt-2 text-sm">
            <p><span className="text-muted-foreground">Method:</span> {order.paymentMethod.replace("_", " ")}</p>
            <p><span className="text-muted-foreground">Reference:</span> {order.paymentReference}</p>
            <p><span className="text-muted-foreground">Submitted:</span> {order.paymentSubmittedAt ? new Date(order.paymentSubmittedAt).toLocaleString() : "—"}</p>
          </div>
        </div>
        <p className="mt-3 text-sm text-muted-foreground">
          Confirm this only after checking the customer payment proof, transfer amount, and transaction reference.
        </p>
        <div className="mt-5 grid gap-3 sm:grid-cols-2">
          <button
            onClick={onViewProof}
            disabled={submitting || !order.hasPaymentProof}
            className="h-11 rounded-xl border border-border px-4 text-sm font-semibold hover:bg-secondary disabled:opacity-50"
          >
            View payment proof
          </button>
          <button
            onClick={onClose}
            disabled={submitting}
            className="h-11 rounded-xl border border-border px-4 text-sm font-semibold transition-all duration-150 hover:scale-[1.02] hover:bg-secondary active:scale-[0.98] disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            disabled={submitting}
            className="h-11 rounded-xl bg-primary px-4 text-sm font-semibold text-primary-foreground transition-all duration-150 hover:scale-[1.02] hover:bg-[var(--green-dark)] active:scale-[0.98] disabled:opacity-60"
          >
            {submitting ? "Marking paid..." : "Mark as Paid"}
          </button>
        </div>
      </section>
    </div>
  );
}

function StockEditorDialog({
  product,
  stockDraft,
  saving,
  onChange,
  onClose,
  onSave,
}: {
  product: AdminInventoryProduct | null;
  stockDraft: string;
  saving: boolean;
  onChange: (value: string) => void;
  onClose: () => void;
  onSave: () => void;
}) {
  if (!product) return null;
  const currentStock = Number(stockDraft);
  const canDecrease = Number.isFinite(currentStock) && currentStock > 0;
  return (
    <div className="fixed inset-0 z-[70] flex items-end justify-center bg-black/40 px-4 py-4 sm:items-center">
      <section className="w-full max-w-md rounded-2xl border border-border bg-card p-5 shadow-2xl">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-[var(--green)]">Inventory adjustment</p>
            <h2 className="mt-1 text-xl font-bold text-foreground">Update stock count</h2>
          </div>
          <button
            onClick={onClose}
            disabled={saving}
            className="flex h-9 w-9 items-center justify-center rounded-xl text-muted-foreground transition-all duration-150 hover:scale-105 hover:bg-secondary hover:text-foreground active:scale-95 disabled:opacity-50"
            aria-label="Close inventory adjustment"
          >
            <X size={18} />
          </button>
        </div>
        <div className="mt-4 flex items-center gap-3 rounded-xl border border-border bg-secondary/50 p-4">
          <img src={product.image} alt={product.name} className="h-14 w-14 rounded-xl border border-border bg-white object-contain p-1" />
          <div className="min-w-0">
            <p className="truncate font-semibold text-foreground">{product.name}</p>
            <p className="text-xs text-muted-foreground">{product.sku}</p>
          </div>
        </div>
        <label className="mt-4 block text-sm font-semibold text-foreground" htmlFor="admin-stock-count">
          Stock quantity
        </label>
        <div className="mt-2 grid grid-cols-[44px_1fr_44px] gap-2">
          <button
            type="button"
            disabled={!canDecrease || saving}
            onClick={() => onChange(String(Math.max(0, currentStock - 1)))}
            className="h-11 rounded-xl border border-border text-lg font-bold transition-all duration-150 hover:scale-[1.02] hover:bg-secondary active:scale-[0.98] disabled:opacity-40 disabled:hover:scale-100"
            aria-label="Decrease stock"
          >
            -
          </button>
          <input
            id="admin-stock-count"
            type="number"
            min="0"
            inputMode="numeric"
            value={stockDraft}
            onChange={event => onChange(event.target.value)}
            className="h-11 rounded-xl border border-border bg-input-background px-3 text-center text-base font-semibold outline-none focus:ring-2 focus:ring-ring/30"
          />
          <button
            type="button"
            disabled={saving}
            onClick={() => onChange(String(Number.isFinite(currentStock) ? currentStock + 1 : product.stockQuantity + 1))}
            className="h-11 rounded-xl border border-border text-lg font-bold transition-all duration-150 hover:scale-[1.02] hover:bg-secondary active:scale-[0.98] disabled:opacity-40"
            aria-label="Increase stock"
          >
            +
          </button>
        </div>
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          <button
            onClick={onClose}
            disabled={saving}
            className="h-11 rounded-xl border border-border px-4 text-sm font-semibold transition-all duration-150 hover:scale-[1.02] hover:bg-secondary active:scale-[0.98] disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={onSave}
            disabled={saving}
            className="h-11 rounded-xl bg-primary px-4 text-sm font-semibold text-primary-foreground transition-all duration-150 hover:scale-[1.02] hover:bg-[var(--green-dark)] active:scale-[0.98] disabled:opacity-60"
          >
            {saving ? "Saving..." : "Save Stock"}
          </button>
        </div>
      </section>
    </div>
  );
}

function CustomersPanel() {
  const { search, setSearch, page, setPage, query } = usePagedQuery();
  const [customers, setCustomers] = useState<AdminCustomer[]>([]);
  const [pageCount, setPageCount] = useState(1);
  const [loading, setLoading] = useState(true);

  const load = useCallback(() => {
    setLoading(true);
    api.adminCustomers(query)
      .then(result => {
        setCustomers(result.customers);
        setPageCount(result.pagination.pageCount);
      })
      .catch(error => toast.error(apiMessage(error)))
      .finally(() => setLoading(false));
  }, [query]);

  useEffect(() => load(), [load]);

  const toggleActive = async (customer: AdminCustomer) => {
    try {
      await api.adminSetCustomerActive(customer.id, !customer.active);
      toast.success(customer.active ? "Customer deactivated" : "Customer activated");
      load();
    } catch (error) {
      toast.error(apiMessage(error));
    }
  };

  return (
    <>
      <SearchBar search={search} setSearch={value => { setSearch(value); setPage(1); }} />
      <TableShell loading={loading} empty={!customers.length} emptyText="No customers found.">
        {customers.map(customer => (
          <div key={customer.id} className="grid gap-3 px-4 py-3 lg:grid-cols-[1.2fr_100px_100px_130px_120px] lg:items-center">
            <div>
              <p className="font-semibold text-foreground">{customer.firstName} {customer.lastName}</p>
              <p className="text-xs text-muted-foreground">{customer.email}</p>
            </div>
            <p className="text-sm text-muted-foreground">{customer.totalOrders} orders</p>
            <p className="text-sm text-muted-foreground">{customer.paidOrders} paid</p>
            <p className="font-semibold">{formatCurrency(customer.paidSales)}</p>
            <button onClick={() => toggleActive(customer)} className="h-9 rounded-xl border border-border px-3 text-sm font-semibold transition-all duration-150 hover:scale-[1.02] hover:bg-secondary active:scale-[0.98]">
              {customer.active ? "Deactivate" : "Activate"}
            </button>
          </div>
        ))}
      </TableShell>
      <Pager page={page} setPage={setPage} pageCount={pageCount} />
    </>
  );
}

function ReportsPanel() {
  const [type, setType] = useState<"orders" | "products" | "customers">("orders");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [loading, setLoading] = useState(false);

  const download = async () => {
    const params = new URLSearchParams({ type });
    if (from) params.set("from", from);
    if (to) params.set("to", to);
    setLoading(true);
    try {
      const csv = await api.adminReportCsv(`?${params.toString()}`);
      const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `gleamtech-${type}-report.csv`;
      link.click();
      URL.revokeObjectURL(url);
    } catch (error) {
      toast.error(apiMessage(error));
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className="rounded-2xl border border-border bg-card p-5">
      <div className="grid gap-3 sm:grid-cols-[220px_170px_170px_auto]">
        <select value={type} onChange={event => setType(event.target.value as typeof type)} className="h-11 rounded-xl border border-border bg-card px-3 text-sm">
          <option value="orders">Orders</option>
          <option value="products">Products</option>
          <option value="customers">Customers</option>
        </select>
        <input type="date" value={from} disabled={type !== "orders"} onChange={event => setFrom(event.target.value)} className="h-11 rounded-xl border border-border bg-card px-3 text-sm disabled:opacity-50" />
        <input type="date" value={to} disabled={type !== "orders"} onChange={event => setTo(event.target.value)} className="h-11 rounded-xl border border-border bg-card px-3 text-sm disabled:opacity-50" />
        <button disabled={loading} onClick={download} className="h-11 rounded-xl bg-primary px-5 text-sm font-semibold text-primary-foreground transition-all duration-150 hover:scale-[1.02] hover:bg-[var(--green-dark)] active:scale-[0.98] disabled:opacity-60 disabled:hover:scale-100">
          {loading ? "Preparing..." : "Download CSV"}
        </button>
      </div>
    </section>
  );
}

const EMPTY_PROMO_FORM: PromoCodeInput = {
  code: "",
  name: "",
  description: "",
  percentOff: 10,
  active: true,
  startsAt: null,
  endsAt: null,
};

function dateInputValue(value: string | null | undefined) {
  return value ? value.slice(0, 10) : "";
}

function PromosPanel({ onStoreContentChanged }: { onStoreContentChanged?: () => Promise<void> }) {
  const { search, setSearch, page, setPage, query } = usePagedQuery();
  const [promos, setPromos] = useState<PromoCode[]>([]);
  const [pageCount, setPageCount] = useState(1);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editing, setEditing] = useState<PromoCode | null>(null);
  const [form, setForm] = useState<PromoCodeInput>(EMPTY_PROMO_FORM);

  const load = useCallback(() => {
    setLoading(true);
    api.adminPromos(query)
      .then(result => {
        setPromos(result.promos);
        setPageCount(result.pagination.pageCount);
      })
      .catch(error => toast.error(apiMessage(error)))
      .finally(() => setLoading(false));
  }, [query]);

  useEffect(() => load(), [load]);

  const openCreate = () => {
    setEditing(null);
    setForm(EMPTY_PROMO_FORM);
  };

  const openEdit = (promo: PromoCode) => {
    setEditing(promo);
    setForm({
      code: promo.code,
      name: promo.name,
      description: promo.description,
      percentOff: promo.percentOff,
      active: promo.active,
      startsAt: dateInputValue(promo.startsAt),
      endsAt: dateInputValue(promo.endsAt),
    });
  };

  const save = async () => {
    if (!form.code.trim() || !form.name.trim() || !Number.isInteger(Number(form.percentOff))) {
      toast.error("Complete the promo code, name, and discount.");
      return;
    }
    setSaving(true);
    try {
      const input = {
        ...form,
        code: form.code.trim().toUpperCase(),
        percentOff: Number(form.percentOff),
        startsAt: form.startsAt || null,
        endsAt: form.endsAt || null,
      };
      if (editing) await api.adminUpdatePromo(editing.id, input);
      else await api.adminCreatePromo(input);
      toast.success(editing ? "Promo updated" : "Promo created");
      setEditing(null);
      setForm(EMPTY_PROMO_FORM);
      load();
      await onStoreContentChanged?.().catch(() => undefined);
    } catch (error) {
      toast.error(apiMessage(error));
    } finally {
      setSaving(false);
    }
  };

  const remove = async (promo: PromoCode) => {
    try {
      await api.adminDeletePromo(promo.id);
      toast.success("Promo deleted");
      load();
      await onStoreContentChanged?.().catch(() => undefined);
    } catch (error) {
      toast.error(apiMessage(error));
    }
  };

  return (
    <div className="grid gap-5 xl:grid-cols-[380px_1fr]">
      <section className="rounded-2xl border border-border bg-card p-5">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="font-bold text-foreground">{editing ? "Edit Promo" : "Create Promo"}</h2>
          {editing && <button onClick={openCreate} className="text-sm font-semibold text-[var(--green)] hover:underline">New</button>}
        </div>
        <div className="grid gap-3">
          <input value={form.code} onChange={event => setForm(prev => ({ ...prev, code: event.target.value.toUpperCase() }))} placeholder="Code, e.g. GLEAM10" className="h-11 rounded-xl border border-border bg-input-background px-3 text-sm" />
          <input value={form.name} onChange={event => setForm(prev => ({ ...prev, name: event.target.value }))} placeholder="Promo name" className="h-11 rounded-xl border border-border bg-input-background px-3 text-sm" />
          <textarea value={form.description} onChange={event => setForm(prev => ({ ...prev, description: event.target.value }))} placeholder="Short description" className="min-h-20 rounded-xl border border-border bg-input-background px-3 py-2 text-sm" />
          <input type="number" min={1} max={90} value={form.percentOff} onChange={event => setForm(prev => ({ ...prev, percentOff: Number(event.target.value) }))} placeholder="Percent off" className="h-11 rounded-xl border border-border bg-input-background px-3 text-sm" />
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="grid gap-1 text-xs font-semibold text-muted-foreground">Starts<input type="date" value={dateInputValue(form.startsAt)} onChange={event => setForm(prev => ({ ...prev, startsAt: event.target.value || null }))} className="h-11 rounded-xl border border-border bg-card px-3 text-sm font-normal text-foreground" /></label>
            <label className="grid gap-1 text-xs font-semibold text-muted-foreground">Ends<input type="date" value={dateInputValue(form.endsAt)} onChange={event => setForm(prev => ({ ...prev, endsAt: event.target.value || null }))} className="h-11 rounded-xl border border-border bg-card px-3 text-sm font-normal text-foreground" /></label>
          </div>
          <label className="flex items-center gap-2 text-sm font-semibold text-foreground">
            <input type="checkbox" checked={form.active} onChange={event => setForm(prev => ({ ...prev, active: event.target.checked }))} />
            Active
          </label>
          <button onClick={save} disabled={saving} className="h-11 rounded-xl bg-primary px-5 text-sm font-semibold text-primary-foreground hover:bg-[var(--green-dark)] disabled:opacity-60">{saving ? "Saving..." : "Save Promo"}</button>
        </div>
      </section>
      <section>
        <SearchBar search={search} setSearch={value => { setSearch(value); setPage(1); }} />
        <TableShell loading={loading} empty={!promos.length} emptyText="No promos found.">
          {promos.map(promo => (
            <div key={promo.id} className="grid gap-3 px-4 py-3 lg:grid-cols-[1fr_100px_110px_160px] lg:items-center">
              <div>
                <p className="font-semibold text-foreground">{promo.code} - {promo.name}</p>
                <p className="text-xs text-muted-foreground">{promo.description || "No description"}</p>
              </div>
              <p className="font-semibold">{promo.percentOff}% off</p>
              <p className="text-sm text-muted-foreground">{promo.active ? "Active" : "Inactive"}</p>
              <div className="flex gap-2">
                <button onClick={() => openEdit(promo)} className="h-9 rounded-xl border border-border px-3 text-sm font-semibold hover:bg-secondary">Edit</button>
                <button onClick={() => remove(promo)} className="h-9 rounded-xl border border-border px-3 text-sm font-semibold text-destructive hover:bg-secondary">Delete</button>
              </div>
            </div>
          ))}
        </TableShell>
        <Pager page={page} setPage={setPage} pageCount={pageCount} />
      </section>
    </div>
  );
}

const HOME_FIELDS: Array<{ key: keyof HomepageContentInput; label: string; multiline?: boolean }> = [
  { key: "eyebrow", label: "Eyebrow" },
  { key: "headline", label: "Headline" },
  { key: "subheadline", label: "Subheadline", multiline: true },
  { key: "primaryCta", label: "Primary CTA" },
  { key: "secondaryCta", label: "Secondary CTA" },
  { key: "promoLabel", label: "Promo label" },
  { key: "promoHeadline", label: "Promo headline" },
  { key: "promoText", label: "Promo text", multiline: true },
  { key: "promiseOneTitle", label: "Promise 1 title" },
  { key: "promiseOneText", label: "Promise 1 text", multiline: true },
  { key: "promiseTwoTitle", label: "Promise 2 title" },
  { key: "promiseTwoText", label: "Promise 2 text", multiline: true },
];

type HomepageImageField = "heroImage" | "subHeroImageLeft" | "subHeroImageRight";
const HOME_IMAGE_FIELDS: Array<{ key: HomepageImageField; label: string }> = [
  { key: "heroImage", label: "Hero image" },
  { key: "subHeroImageLeft", label: "Left sub-hero image" },
  { key: "subHeroImageRight", label: "Right sub-hero image" },
];

function homepageImagePreviews(content: HomepageContent): Record<HomepageImageField, string> {
  return {
    heroImage: resolveImageUrl(content.heroImage),
    subHeroImageLeft: resolveImageUrl(content.subHeroImageLeft),
    subHeroImageRight: resolveImageUrl(content.subHeroImageRight),
  };
}

function HomepagePanel({ onStoreContentChanged }: { onStoreContentChanged?: () => Promise<void> }) {
  const [content, setContent] = useState<HomepageContent | null>(null);
  const [form, setForm] = useState<HomepageContentInput | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingImage, setUploadingImage] = useState<HomepageImageField | null>(null);
  const [pendingImages, setPendingImages] = useState<Partial<Record<HomepageImageField, File>>>({});
  const [imagePreviews, setImagePreviews] = useState<Record<HomepageImageField, string>>({
    heroImage: "",
    subHeroImageLeft: "",
    subHeroImageRight: "",
  });

  const load = useCallback(() => {
    setLoading(true);
    api.adminHomepage()
      .then(result => {
        setContent(result.content);
        const { updatedAt, ...input } = result.content;
        setForm(input);
        setImagePreviews(homepageImagePreviews(result.content));
      })
      .catch(error => toast.error(apiMessage(error)))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => load(), [load]);

  const save = async () => {
    if (!form) return;
    setSaving(true);
    try {
      let nextForm = form;
      for (const field of HOME_IMAGE_FIELDS) {
        const file = pendingImages[field.key];
        if (!file) continue;
        setUploadingImage(field.key);
        const uploaded = await api.adminUploadHomepageImage(field.key, file);
        nextForm = { ...nextForm, [field.key]: uploaded.content[field.key] };
        setImagePreviews(prev => ({ ...prev, [field.key]: resolveImageUrl(uploaded.content[field.key]) }));
      }
      const result = await api.adminUpdateHomepage(nextForm);
      setContent(result.content);
      const { updatedAt, ...input } = result.content;
      setForm(input);
      setImagePreviews(homepageImagePreviews(result.content));
      setPendingImages({});
      toast.success("Homepage content updated");
      await onStoreContentChanged?.().catch(() => undefined);
    } catch (error) {
      toast.error(apiMessage(error));
    } finally {
      setUploadingImage(null);
      setSaving(false);
    }
  };

  const chooseImage = (field: HomepageImageField, file: File | undefined) => {
    if (!file) return;
    setPendingImages(prev => ({ ...prev, [field]: file }));
    setImagePreviews(prev => ({ ...prev, [field]: URL.createObjectURL(file) }));
  };

  if (loading || !form) return <TableShell loading={loading} empty={!form} emptyText="Homepage content unavailable." />;

  return (
    <section className="rounded-2xl border border-border bg-card p-5">
      <div className="mb-5 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="font-bold text-foreground">Live homepage content</h2>
          <p className="text-xs text-muted-foreground">Last updated {content ? new Date(content.updatedAt).toLocaleString() : "recently"}</p>
        </div>
        <button onClick={save} disabled={saving} className="h-11 rounded-xl bg-primary px-5 text-sm font-semibold text-primary-foreground hover:bg-[var(--green-dark)] disabled:opacity-60">{saving ? "Publishing..." : "Publish Changes"}</button>
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        {HOME_FIELDS.map(field => (
          <label key={field.key} className={`grid gap-1 text-sm font-semibold text-foreground ${field.multiline ? "md:col-span-2" : ""}`}>
            {field.label}
            {field.multiline ? (
              <textarea value={String(form[field.key])} onChange={event => setForm(prev => prev ? ({ ...prev, [field.key]: event.target.value }) : prev)} className="min-h-24 rounded-xl border border-border bg-input-background px-3 py-2 text-sm font-normal" />
            ) : (
              <input value={String(form[field.key])} onChange={event => setForm(prev => prev ? ({ ...prev, [field.key]: event.target.value }) : prev)} className="h-11 rounded-xl border border-border bg-input-background px-3 text-sm font-normal" />
            )}
          </label>
        ))}
        <section className="grid gap-4 rounded-xl border border-border p-4 md:col-span-2">
          <div>
            <h3 className="font-semibold text-foreground">Homepage images</h3>
            <p className="text-xs text-muted-foreground">Upload JPG, PNG, or WebP files. Images are stored persistently and appear live after saving.</p>
          </div>
          <div className="grid gap-4 md:grid-cols-3">
            {HOME_IMAGE_FIELDS.map(field => (
              <div key={field.key} className="grid gap-2">
                <span className="text-sm font-semibold text-foreground">{field.label}</span>
                <div className="relative overflow-hidden rounded-xl border border-border bg-secondary">
                  {imagePreviews[field.key] ? (
                    <img src={imagePreviews[field.key]} alt={`${field.label} preview`} className="h-36 w-full object-cover" />
                  ) : (
                    <div className="flex h-36 items-center justify-center text-xs text-muted-foreground">No image selected</div>
                  )}
                  {uploadingImage === field.key && (
                    <div className="absolute inset-0 flex items-center justify-center bg-black/45 text-xs font-semibold text-white">Uploading...</div>
                  )}
                </div>
                <label className="inline-flex h-10 cursor-pointer items-center justify-center rounded-xl border border-border px-3 text-sm font-semibold hover:bg-secondary has-[:disabled]:cursor-not-allowed has-[:disabled]:opacity-50">
                  Choose image
                  <input
                    type="file"
                    accept="image/png,image/jpeg,image/webp"
                    disabled={saving}
                    className="sr-only"
                    onChange={event => chooseImage(field.key, event.target.files?.[0])}
                  />
                </label>
                {pendingImages[field.key] && <span className="text-xs text-muted-foreground">Ready to upload on save: {pendingImages[field.key]?.name}</span>}
              </div>
            ))}
          </div>
        </section>
      </div>
    </section>
  );
}

function TableShell({ loading, empty, emptyText, children }: { loading: boolean; empty: boolean; emptyText: string; children?: React.ReactNode }) {
  return (
    <section className="overflow-hidden rounded-2xl border border-border bg-card">
      {loading ? (
        <div className="p-8 text-center text-sm text-muted-foreground">Loading...</div>
      ) : empty ? (
        <div className="p-8 text-center text-sm text-muted-foreground">{emptyText}</div>
      ) : (
        <div className="divide-y divide-border">{children}</div>
      )}
    </section>
  );
}

function Metric({ label, value }: { label: string; value: number }) {
  return (
    <section className="rounded-2xl border border-border bg-card p-4">
      <p className="text-sm text-muted-foreground">{label}</p>
      <p className="mt-2 text-2xl font-bold text-foreground">{value.toLocaleString()}</p>
    </section>
  );
}
