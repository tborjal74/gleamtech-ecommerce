import React, { useCallback, useEffect, useMemo, useState } from "react";
import type { LucideIcon } from "lucide-react";
import { AlertCircle, BarChart3, Calendar, ClipboardList, PackageSearch, ShoppingCart, Users } from "lucide-react";
import { Bar, BarChart, CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { api, ApiClientError, type AdminAnalytics, type AdminAnalyticsProduct } from "../../api";
import { formatCurrency } from "../currency";

const presets = [
  { value: "today", label: "Today" },
  { value: "last7", label: "Last 7 days" },
  { value: "last30", label: "Last 30 days" },
  { value: "thisMonth", label: "This month" },
  { value: "lastMonth", label: "Last month" },
  { value: "custom", label: "Custom date range" },
];

function apiMessage(error: unknown) {
  return error instanceof ApiClientError
    ? error.body.message
    : error instanceof Error
      ? error.message
      : "Request failed.";
}

export function AdminAnalyticsPage() {
  const [analytics, setAnalytics] = useState<AdminAnalytics | null>(null);
  const [preset, setPreset] = useState("last30");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const query = useMemo(() => {
    const params = new URLSearchParams({ preset });
    if (preset === "custom") {
      if (from) params.set("from", from);
      if (to) params.set("to", to);
    }
    return `?${params.toString()}`;
  }, [from, preset, to]);

  const load = useCallback(async () => {
    if (preset === "custom" && (!from || !to)) {
      setLoading(false);
      setError("Select a start and end date to load custom analytics.");
      return;
    }
    setLoading(true);
    setError("");
    try {
      setAnalytics(await api.adminAnalytics(query));
    } catch (loadError) {
      setAnalytics(null);
      setError(apiMessage(loadError));
    } finally {
      setLoading(false);
    }
  }, [from, preset, query, to]);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
      <div className="mb-6">
        <p className="text-sm font-semibold uppercase tracking-widest text-[var(--green)]">Administrator</p>
        <h1 className="mt-1 text-3xl font-bold text-foreground">Analytics</h1>
        <p className="mt-1 text-sm text-muted-foreground">Review paid sales, order activity, products, customers, and listing health from live store data.</p>
      </div>

      <section className="mb-6 grid gap-3 rounded-2xl border border-border bg-card p-4 lg:grid-cols-[220px_170px_170px_auto]">
        <select value={preset} onChange={event => setPreset(event.target.value)} className="h-11 rounded-xl border border-border bg-card px-3 text-sm">
          {presets.map(item => <option key={item.value} value={item.value}>{item.label}</option>)}
        </select>
        <label className="relative">
          <Calendar size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input type="date" value={from} disabled={preset !== "custom"} onChange={event => setFrom(event.target.value)} className="h-11 w-full rounded-xl border border-border bg-card pl-9 pr-2 text-sm disabled:opacity-50" />
        </label>
        <input type="date" value={to} disabled={preset !== "custom"} onChange={event => setTo(event.target.value)} className="h-11 rounded-xl border border-border bg-card px-3 text-sm disabled:opacity-50" />
        <button onClick={() => void load()} className="h-11 rounded-xl bg-primary px-5 text-sm font-semibold text-primary-foreground hover:bg-[var(--green-dark)]">
          Apply
        </button>
      </section>

      {loading && <StatePanel title="Loading analytics..." text="Collecting current sales, orders, product, and customer indicators." />}
      {!loading && error && <StatePanel danger title="Analytics unavailable" text={error} />}
      {!loading && !error && analytics && (
        analytics.summary.totalOrdersPlaced === 0 ? (
          <StatePanel title="No order data in this date range" text="Try another date range or wait for customer activity to appear." />
        ) : (
          <AnalyticsContent analytics={analytics} />
        )
      )}
    </main>
  );
}

function AnalyticsContent({ analytics }: { analytics: AdminAnalytics }) {
  return (
    <div className="grid gap-6">
      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard icon={BarChart3} label="Total paid sales" value={formatCurrency(analytics.summary.totalPaidSales)} />
        <MetricCard icon={ClipboardList} label="Total paid orders" value={analytics.summary.totalPaidOrders.toLocaleString()} />
        <MetricCard icon={ShoppingCart} label="Total orders placed" value={analytics.summary.totalOrdersPlaced.toLocaleString()} />
        <MetricCard icon={BarChart3} label="Average order value" value={formatCurrency(analytics.summary.averageOrderValue)} />
        <MetricCard icon={ClipboardList} label="Pending payments" value={analytics.summary.pendingPaymentOrders.toLocaleString()} />
        <MetricCard icon={AlertCircle} label="Cancelled orders" value={analytics.summary.cancelledOrders.toLocaleString()} />
        <MetricCard icon={Users} label="Customer accounts" value={analytics.customers.totalCustomerAccounts.toLocaleString()} />
        <MetricCard icon={PackageSearch} label="Deactivated listings" value={analytics.products.deactivatedListings.toLocaleString()} />
      </section>

      <section className="grid gap-4 lg:grid-cols-2">
        <ChartCard title="Paid sales over time">
          <ResponsiveContainer width="100%" height={260}>
            <LineChart data={analytics.charts.salesOverTime}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" fontSize={11} />
              <YAxis fontSize={11} tickFormatter={value => `₱${Number(value).toLocaleString()}`} />
              <Tooltip formatter={(value) => formatCurrency(Number(value))} />
              <Line type="monotone" dataKey="sales" stroke="var(--green)" strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </ChartCard>
        <ChartCard title="Orders placed over time">
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={analytics.charts.ordersOverTime}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" fontSize={11} />
              <YAxis fontSize={11} allowDecimals={false} />
              <Tooltip />
              <Bar dataKey="orders" fill="var(--green)" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>
      </section>

      <section className="grid gap-4 lg:grid-cols-3">
        <ProductHighlight title="Most ordered product" product={analytics.products.mostOrderedProduct} />
        <ProductHighlight title="Highest quantity sold" product={analytics.products.highestQuantityProduct} />
        <ProductHighlight title="Least ordered product" product={analytics.products.leastOrderedProduct} />
      </section>

      <section className="grid gap-4 lg:grid-cols-2">
        <ChartCard title="Top products by revenue">
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={analytics.products.topByRevenue} layout="vertical" margin={{ left: 20 }}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis type="number" fontSize={11} tickFormatter={value => `₱${Number(value).toLocaleString()}`} />
              <YAxis type="category" dataKey="productName" width={120} fontSize={11} />
              <Tooltip formatter={(value) => formatCurrency(Number(value))} />
              <Bar dataKey="revenue" fill="var(--green)" radius={[0, 6, 6, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>
        <ChartCard title="Top products by quantity sold">
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={analytics.products.topByQuantity} layout="vertical" margin={{ left: 20 }}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis type="number" fontSize={11} allowDecimals={false} />
              <YAxis type="category" dataKey="productName" width={120} fontSize={11} />
              <Tooltip />
              <Bar dataKey="quantitySold" fill="var(--green)" radius={[0, 6, 6, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>
      </section>

      <section className="grid gap-4 lg:grid-cols-3">
        <InsightCard title="Customer insights" rows={[
          ["New customers", analytics.customers.newCustomers],
          ["Customers with paid orders", analytics.customers.customersWithPaidOrders],
          ["Repeat customers", analytics.customers.repeatCustomers],
          ["Average orders per customer", analytics.customers.averageOrdersPerCustomer.toFixed(2)],
        ]} />
        <InsightCard title="Listing status" rows={[
          ["Deactivated listings", analytics.products.deactivatedListings],
          ["Unpublished listings", analytics.products.unpublishedListings],
          ["Products with zero sales", analytics.products.zeroSalesCount],
          ["Total quantity sold", analytics.products.totalQuantitySold],
        ]} />
        <InsightCard title="Payment status" rows={analytics.charts.paymentStatusBreakdown.map(row => [row.status, row.count])} />
      </section>

      <ProductTable products={analytics.products.performance} />
    </div>
  );
}

function MetricCard({ icon: Icon, label, value }: { icon: LucideIcon; label: string; value: string }) {
  return (
    <section className="rounded-2xl border border-border bg-card p-4">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm text-muted-foreground">{label}</p>
        <Icon size={18} className="text-[var(--green)]" />
      </div>
      <p className="mt-3 text-2xl font-bold text-foreground">{value}</p>
    </section>
  );
}

function ChartCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-2xl border border-border bg-card p-4">
      <h2 className="mb-4 font-bold text-foreground">{title}</h2>
      {children}
    </section>
  );
}

function ProductHighlight({ title, product }: { title: string; product: AdminAnalyticsProduct | null }) {
  return (
    <section className="rounded-2xl border border-border bg-card p-4">
      <p className="text-sm font-semibold text-muted-foreground">{title}</p>
      {product ? (
        <div className="mt-3 flex items-center gap-3">
          <ProductImage product={product} />
          <div className="min-w-0">
            <p className="truncate font-bold text-foreground">{product.productName}</p>
            <p className="text-xs text-muted-foreground">{product.productSku}</p>
            <p className="mt-1 text-sm text-muted-foreground">{product.quantitySold} sold · {formatCurrency(product.revenue)}</p>
          </div>
        </div>
      ) : (
        <p className="mt-3 text-sm text-muted-foreground">No paid sales in this date range.</p>
      )}
    </section>
  );
}

function InsightCard({ title, rows }: { title: string; rows: Array<[string, string | number]> }) {
  return (
    <section className="rounded-2xl border border-border bg-card p-4">
      <h2 className="mb-3 font-bold text-foreground">{title}</h2>
      <div className="grid gap-2">
        {rows.length ? rows.map(([label, value]) => (
          <div key={label} className="flex justify-between gap-4 text-sm">
            <span className="text-muted-foreground">{label}</span>
            <span className="font-semibold text-foreground">{typeof value === "number" ? value.toLocaleString() : value}</span>
          </div>
        )) : <p className="text-sm text-muted-foreground">No data in this date range.</p>}
      </div>
    </section>
  );
}

function ProductTable({ products }: { products: AdminAnalyticsProduct[] }) {
  return (
    <section className="overflow-hidden rounded-2xl border border-border bg-card">
      <div className="border-b border-border px-4 py-3 font-bold text-foreground">Product performance</div>
      {products.length === 0 ? (
        <p className="p-6 text-sm text-muted-foreground">No paid product sales in this date range.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[920px] text-left text-sm">
            <thead className="border-b border-border text-xs uppercase tracking-widest text-muted-foreground">
              <tr>
                <th className="px-4 py-3">Product</th>
                <th className="px-4 py-3">SKU</th>
                <th className="px-4 py-3">Qty Sold</th>
                <th className="px-4 py-3">Orders</th>
                <th className="px-4 py-3">Revenue</th>
                <th className="px-4 py-3">Price</th>
                <th className="px-4 py-3">Stock</th>
                <th className="px-4 py-3">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {products.map(product => (
                <tr key={`${product.productId}-${product.productSku}`}>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <ProductImage product={product} />
                      <span className="font-semibold text-foreground">{product.productName}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">{product.productSku}</td>
                  <td className="px-4 py-3">{product.quantitySold}</td>
                  <td className="px-4 py-3">{product.orderCount}</td>
                  <td className="px-4 py-3 font-semibold">{formatCurrency(product.revenue)}</td>
                  <td className="px-4 py-3">{formatCurrency(product.currentPrice)}</td>
                  <td className="px-4 py-3">{product.currentStock}</td>
                  <td className="px-4 py-3">
                    <span className="rounded-full bg-secondary px-2 py-1 text-xs font-semibold text-muted-foreground">
                      {product.active ? product.isPublished ? "Published" : "Unpublished" : "Inactive"}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}

function ProductImage({ product }: { product: AdminAnalyticsProduct }) {
  return (
    <span className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-border bg-white p-1">
      {product.image ? <img src={product.image} alt={product.productName} className="h-full w-full object-contain" /> : <PackageSearch size={18} className="text-muted-foreground" />}
    </span>
  );
}

function StatePanel({ title, text, danger = false }: { title: string; text: string; danger?: boolean }) {
  return (
    <section className="rounded-2xl border border-border bg-card p-8 text-center">
      <AlertCircle size={24} className={`mx-auto ${danger ? "text-destructive" : "text-[var(--green)]"}`} />
      <h2 className="mt-3 text-lg font-bold text-foreground">{title}</h2>
      <p className="mt-1 text-sm text-muted-foreground">{text}</p>
    </section>
  );
}
