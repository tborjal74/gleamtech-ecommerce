import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Calendar, ChevronRight, Search, X } from "lucide-react";
import { toast } from "sonner";
import { api, ApiClientError, type AdminOrderDetail, type AdminOrderSummary } from "../../api";
import { formatCurrency } from "../currency";

function apiMessage(error: unknown) {
  return error instanceof ApiClientError
    ? error.body.message
    : error instanceof Error
      ? error.message
      : "Request failed.";
}

const orderStatuses = ["PENDING_PAYMENT", "PAID", "PROCESSING", "READY_FOR_DELIVERY", "SHIPPED", "COMPLETED", "CANCELLED"];
const paymentStatuses = ["PENDING", "SUBMITTED", "PAID", "FAILED", "REFUNDED"];

export function AdminOrdersPage() {
  const [orders, setOrders] = useState<AdminOrderSummary[]>([]);
  const [selected, setSelected] = useState<AdminOrderDetail | null>(null);
  const [search, setSearch] = useState("");
  const [orderStatus, setOrderStatus] = useState("");
  const [paymentStatus, setPaymentStatus] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [page, setPage] = useState(1);
  const [pageCount, setPageCount] = useState(1);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [markingPaid, setMarkingPaid] = useState(false);

  const query = useMemo(() => {
    const params = new URLSearchParams({ page: String(page), pageSize: "10", sort: "newest" });
    if (search.trim()) params.set("search", search.trim());
    if (orderStatus) params.set("orderStatus", orderStatus);
    if (paymentStatus) params.set("paymentStatus", paymentStatus);
    if (dateFrom) params.set("dateFrom", dateFrom);
    if (dateTo) params.set("dateTo", dateTo);
    return `?${params.toString()}`;
  }, [dateFrom, dateTo, orderStatus, page, paymentStatus, search]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const result = await api.adminOrders(query);
      setOrders(result.orders);
      setPageCount(Math.max(result.pagination.pageCount, 1));
    } catch (error) {
      toast.error(apiMessage(error));
    } finally {
      setLoading(false);
    }
  }, [query]);

  useEffect(() => {
    void load();
  }, [load]);

  const openOrder = async (orderId: string) => {
    try {
      const result = await api.adminOrder(orderId);
      setSelected(result.order);
    } catch (error) {
      toast.error(apiMessage(error));
    }
  };

  const updateStatus = async (status: string) => {
    if (!selected) return;
    setUpdating(true);
    try {
      const result = await api.adminUpdateOrderStatus(selected.orderId, status);
      setSelected(result.order);
      await load();
      toast.success("Order status updated");
    } catch (error) {
      toast.error(apiMessage(error));
    } finally {
      setUpdating(false);
    }
  };

  const markAsPaid = async () => {
    if (!selected) return;
    const confirmed = window.confirm("Mark this order as paid and send the payment confirmation email to the customer?");
    if (!confirmed) return;

    setMarkingPaid(true);
    try {
      const result = await api.adminMarkOrderPaid(selected.orderId);
      setSelected(result.order);
      await load();
      toast.success(result.emailSent ? "Payment confirmed and email sent" : "Payment already confirmed");
    } catch (error) {
      toast.error(apiMessage(error));
      const refreshed = await api.adminOrder(selected.orderId).catch(() => null);
      if (refreshed) setSelected(refreshed.order);
      await load();
    } finally {
      setMarkingPaid(false);
    }
  };

  const viewPaymentProof = async () => {
    if (!selected?.paymentSubmission?.hasProof) return;
    try {
      const blob = await api.adminPaymentProof(selected.orderId);
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

  const reviewRequest = async (requestId: string, status: "approve" | "reject") => {
    if (!selected) return;
    const adminNote = window.prompt(status === "approve" ? "Optional approval note" : "Reason for rejection") ?? "";
    setUpdating(true);
    try {
      const result = await api.adminReviewOrderRequest(selected.orderId, requestId, status, adminNote);
      setSelected(result.order);
      await load();
      toast.success(status === "approve" ? "Request approved" : "Request rejected");
    } catch (error) {
      toast.error(apiMessage(error));
    } finally {
      setUpdating(false);
    }
  };

  return (
    <main className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
      <div className="mb-6">
        <p className="text-sm font-semibold uppercase tracking-widest text-[var(--green)]">Administrator</p>
        <h1 className="mt-1 text-3xl font-bold text-foreground">Orders</h1>
        <p className="mt-1 text-sm text-muted-foreground">Review customer orders, payment state, shipping details, and fulfillment status.</p>
      </div>

      <section className="mb-5 grid gap-3 rounded-2xl border border-border bg-card p-4 lg:grid-cols-[1fr_170px_150px_150px_150px]">
        <label className="relative">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input value={search} onChange={event => { setSearch(event.target.value); setPage(1); }} placeholder="Search order, customer, or email" className="h-11 w-full rounded-xl border border-border bg-input-background pl-10 pr-3 text-sm outline-none focus:ring-2 focus:ring-ring/30" />
        </label>
        <select value={orderStatus} onChange={event => { setOrderStatus(event.target.value); setPage(1); }} className="h-11 rounded-xl border border-border bg-card px-3 text-sm">
          <option value="">All order status</option>
          {orderStatuses.map(status => <option key={status} value={status}>{status}</option>)}
        </select>
        <select value={paymentStatus} onChange={event => { setPaymentStatus(event.target.value); setPage(1); }} className="h-11 rounded-xl border border-border bg-card px-3 text-sm">
          <option value="">All payment</option>
          {paymentStatuses.map(status => <option key={status} value={status}>{status}</option>)}
        </select>
        <label className="relative">
          <Calendar size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input type="date" value={dateFrom} onChange={event => { setDateFrom(event.target.value); setPage(1); }} className="h-11 w-full rounded-xl border border-border bg-card pl-9 pr-2 text-sm" />
        </label>
        <input type="date" value={dateTo} onChange={event => { setDateTo(event.target.value); setPage(1); }} className="h-11 rounded-xl border border-border bg-card px-3 text-sm" />
      </section>

      <section className="overflow-hidden rounded-2xl border border-border bg-card">
        <div className="hidden grid-cols-[1fr_1.2fr_90px_120px_135px_110px] gap-4 border-b border-border px-4 py-3 text-xs font-semibold uppercase tracking-widest text-muted-foreground lg:grid">
          <span>Order</span><span>Customer</span><span>Items</span><span>Total</span><span>Status</span><span>Action</span>
        </div>
        {loading ? (
          <div className="p-8 text-center text-sm text-muted-foreground">Loading orders...</div>
        ) : orders.length === 0 ? (
          <div className="p-8 text-center text-sm text-muted-foreground">No orders found.</div>
        ) : (
          <div className="divide-y divide-border">
            {orders.map(order => (
              <article key={order.orderId} className="grid gap-4 px-4 py-4 lg:grid-cols-[1fr_1.2fr_90px_120px_135px_110px] lg:items-center">
                <div>
                  <p className="font-semibold text-foreground">{order.orderNumber}</p>
                  <p className="text-xs text-muted-foreground">{new Date(order.createdAt).toLocaleString()}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-foreground">{order.customerName}</p>
                  <p className="text-xs text-muted-foreground">{order.customerEmail}</p>
                </div>
                <p className="text-sm text-foreground">{order.itemCount}</p>
                <p className="font-semibold text-foreground">{formatCurrency(order.total)}</p>
                <div className="flex flex-col gap-1 text-xs">
                  <span className="rounded-full bg-[var(--green-light)] px-2 py-1 font-semibold text-[var(--green)]">{order.orderStatus}</span>
                  <span className="rounded-full bg-secondary px-2 py-1 font-semibold text-muted-foreground">{order.paymentStatus}</span>
                </div>
                <button onClick={() => openOrder(order.orderId)} className="inline-flex h-9 items-center justify-center gap-2 rounded-xl border border-border px-3 text-sm font-semibold hover:bg-secondary">
                  Details <ChevronRight size={14} />
                </button>
              </article>
            ))}
          </div>
        )}
      </section>

      <div className="mt-5 flex items-center justify-between">
        <button disabled={page <= 1} onClick={() => setPage(value => value - 1)} className="h-10 rounded-xl border border-border px-4 text-sm font-semibold disabled:opacity-40">Previous</button>
        <span className="text-sm text-muted-foreground">Page {page} of {pageCount}</span>
        <button disabled={page >= pageCount} onClick={() => setPage(value => value + 1)} className="h-10 rounded-xl border border-border px-4 text-sm font-semibold disabled:opacity-40">Next</button>
      </div>

      {selected && (
        <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/40 px-4">
          <div className="max-h-[92vh] w-full max-w-4xl overflow-y-auto rounded-2xl border border-border bg-card p-5 shadow-2xl">
            <div className="mb-5 flex items-start justify-between gap-4">
              <div>
                <h2 className="text-xl font-bold text-foreground">{selected.orderNumber}</h2>
                <p className="text-sm text-muted-foreground">{new Date(selected.createdAt).toLocaleString()}</p>
              </div>
              <button onClick={() => setSelected(null)} className="rounded-lg p-2 text-muted-foreground hover:bg-secondary"><X size={18} /></button>
            </div>

            <div className="grid gap-4 lg:grid-cols-3">
              <section className="rounded-xl border border-border p-4">
                <h3 className="font-bold text-foreground">Customer</h3>
                <div className="mt-3 grid gap-2 text-sm">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Customer Name</p>
                    <p className="font-medium text-foreground">{selected.customer.firstName} {selected.customer.lastName}</p>
                  </div>
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Email</p>
                    <p className="text-muted-foreground">{selected.customer.email}</p>
                  </div>
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Phone Number</p>
                    <p className="text-muted-foreground">{selected.shippingAddress.phone || "No contact number"}</p>
                  </div>
                </div>
              </section>
              <section className="rounded-xl border border-border p-4">
                <h3 className="font-bold text-foreground">Shipping</h3>
                <p className="mt-2 text-sm">{selected.shippingAddress.name}</p>
                <p className="text-sm text-muted-foreground">{selected.shippingAddress.line1}</p>
                {selected.shippingAddress.line2 && <p className="text-sm text-muted-foreground">{selected.shippingAddress.line2}</p>}
                <p className="text-sm text-muted-foreground">{selected.shippingAddress.city}, {selected.shippingAddress.region} {selected.shippingAddress.postal}</p>
              </section>
              <section className="rounded-xl border border-border p-4">
                <h3 className="font-bold text-foreground">Status</h3>
                <p className="mt-2 text-sm">Payment: <span className="font-semibold">{selected.paymentStatus}</span></p>
                <p className="text-sm">Fulfillment: <span className="font-semibold">{selected.orderStatus}</span></p>
                {selected.paymentSubmission && (
                  <div className="mt-3 rounded-xl bg-secondary/60 p-3 text-xs">
                    <p><span className="text-muted-foreground">Method:</span> {selected.paymentSubmission.method.replace("_", " ")}</p>
                    <p><span className="text-muted-foreground">Reference:</span> {selected.paymentSubmission.reference}</p>
                    <button onClick={viewPaymentProof} className="mt-2 font-semibold text-[var(--green)] hover:underline">View payment proof</button>
                  </div>
                )}
                {selected.paymentStatus === "SUBMITTED" && selected.paymentSubmission?.hasProof && (
                  <button
                    onClick={markAsPaid}
                    disabled={markingPaid}
                    className="mt-3 h-10 w-full rounded-xl bg-primary px-3 text-sm font-semibold text-primary-foreground hover:bg-[var(--green-dark)] disabled:opacity-60"
                  >
                    {markingPaid ? "Marking paid..." : "Mark as Paid"}
                  </button>
                )}
                {!["SUBMITTED", "PAID"].includes(selected.paymentStatus) && (
                  <p className="mt-3 rounded-xl bg-secondary px-3 py-2 text-xs text-muted-foreground">Waiting for the customer to submit a transaction reference and payment proof.</p>
                )}
                {selected.paymentStatus === "PAID" && (
                  <p className="mt-3 rounded-xl bg-[var(--green-light)] px-3 py-2 text-xs font-semibold text-[var(--green)]">
                    Payment confirmed
                    {selected.paidConfirmationEmailSentAt
                      ? ` · Email sent ${new Date(selected.paidConfirmationEmailSentAt).toLocaleString()}`
                      : " · Email not sent yet"}
                  </p>
                )}
                {selected.paidConfirmationEmailLastError && (
                  <div className="mt-2 rounded-xl bg-destructive/10 px-3 py-2 text-xs text-destructive">
                    <p>Email error: {selected.paidConfirmationEmailLastError}</p>
                    <button onClick={markAsPaid} disabled={markingPaid} className="mt-2 font-semibold underline disabled:opacity-50">Retry confirmation email</button>
                  </div>
                )}
                {selected.allowedNextStatuses.length > 0 && (
                  <select disabled={updating} value="" onChange={event => event.target.value && updateStatus(event.target.value)} className="mt-3 h-10 w-full rounded-xl border border-border bg-card px-3 text-sm">
                    <option value="">Move status...</option>
                    {selected.allowedNextStatuses.map(status => <option key={status} value={status}>{status}</option>)}
                  </select>
                )}
              </section>
            </div>

            <section className="mt-5 rounded-xl border border-border">
              <div className="border-b border-border px-4 py-3 font-bold text-foreground">Ordered products</div>
              <div className="divide-y divide-border">
                {selected.items.map(item => (
                  <div key={item.id} className="flex items-center gap-4 px-4 py-3">
                    <div className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-border bg-white p-1">
                      <img
                        src={item.image}
                        alt={item.productName}
                        className="h-full w-full object-contain"
                        loading="lazy"
                      />
                    </div>
                    <div className="flex-1">
                      <p className="font-semibold text-foreground">{item.productName}</p>
                      <p className="text-xs text-muted-foreground">{item.productSku}</p>
                    </div>
                    <div className="text-right text-sm">
                      <p>{item.quantity} x {formatCurrency(item.unitPrice)}</p>
                      <p className="font-semibold">{formatCurrency(item.lineTotal)}</p>
                    </div>
                  </div>
                ))}
              </div>
            </section>

            {(selected.customerNote || selected.requests.length > 0) && (
              <section className="mt-5 rounded-xl border border-border p-4">
                {selected.customerNote && (
                  <>
                    <h3 className="font-bold text-foreground">Customer note</h3>
                    <p className="mt-2 text-sm text-muted-foreground">{selected.customerNote}</p>
                  </>
                )}
                {selected.requests.length > 0 && (
                  <div className={selected.customerNote ? "mt-5" : ""}>
                    <h3 className="font-bold text-foreground">Customer requests</h3>
                    <div className="mt-3 grid gap-3">
                      {selected.requests.map(request => (
                        <div key={request.id} className="rounded-xl border border-border bg-secondary/30 p-3">
                          <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                            <div>
                              <p className="text-sm font-semibold text-foreground">{request.type.replace("_", " / ")} - {request.status}</p>
                              <p className="mt-1 text-sm text-muted-foreground">{request.reason}</p>
                              {request.adminNote && <p className="mt-1 text-xs text-muted-foreground">Admin note: {request.adminNote}</p>}
                            </div>
                            {request.status === "PENDING" && (
                              <div className="flex gap-2">
                                <button onClick={() => reviewRequest(request.id, "approve")} disabled={updating} className="h-9 rounded-xl bg-primary px-3 text-xs font-semibold text-primary-foreground disabled:opacity-60">Approve</button>
                                <button onClick={() => reviewRequest(request.id, "reject")} disabled={updating} className="h-9 rounded-xl border border-border px-3 text-xs font-semibold hover:bg-card disabled:opacity-60">Reject</button>
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </section>
            )}

            <div className="mt-5 grid gap-2 rounded-xl border border-border p-4 text-sm sm:ml-auto sm:w-80">
              <div className="flex justify-between"><span className="text-muted-foreground">Subtotal</span><span>{formatCurrency(selected.subtotal)}</span></div>
              {selected.discount > 0 && <div className="flex justify-between text-[var(--green)]"><span>{selected.promoCode ? `${selected.promoCode} discount` : "Discount"}</span><span>-{formatCurrency(selected.discount)}</span></div>}
              <div className="flex justify-between"><span className="text-muted-foreground">Shipping</span><span>{formatCurrency(selected.shipping)}</span></div>
              <div className="flex justify-between border-t border-border pt-2 text-base font-bold"><span>Total</span><span>{formatCurrency(selected.total)}</span></div>
            </div>

            <section className="mt-5 rounded-xl border border-border p-4">
              <h3 className="font-bold text-foreground">Status history</h3>
              {selected.statusHistory.length === 0 ? (
                <p className="mt-2 text-sm text-muted-foreground">No status changes yet.</p>
              ) : (
                <div className="mt-3 grid gap-2">
                  {selected.statusHistory.map(history => (
                    <p key={history.id} className="text-sm text-muted-foreground">
                      {history.previousStatus} to {history.newStatus} by {history.changedBy?.name ?? "System"} on {new Date(history.createdAt).toLocaleString()}
                    </p>
                  ))}
                </div>
              )}
            </section>
          </div>
        </div>
      )}
    </main>
  );
}
