import React, { useEffect, useState } from "react";
import { CheckCircle2, ChevronDown, Clock3, Download, Landmark, PackageCheck, Paperclip, QrCode, ReceiptText, ShoppingCart, XCircle } from "lucide-react";
import { toast } from "sonner";
import { api, ApiClientError, type CustomerOrder } from "../../api";
import { cn } from "../../components/ui/utils";
import { formatCurrency } from "../currency";
import { BANK_TRANSFER_DETAILS, gcashQrUrl } from "../paymentDetails";
import type { Page } from "../types";

type PaymentMethod = "GCASH" | "BANK_TRANSFER";

function apiMessage(error: unknown) {
  return error instanceof ApiClientError
    ? error.body.message
    : error instanceof Error
      ? error.message
      : "Request failed.";
}

function labelStatus(status: string) {
  return status
    .toLowerCase()
    .split("_")
    .map(part => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

export function OrdersPage({ onNavigate }: { onNavigate: (page: Page) => void }) {
  const [orders, setOrders] = useState<CustomerOrder[]>([]);
  const [selectedOrderId, setSelectedOrderId] = useState("");
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("GCASH");
  const [paymentOpen, setPaymentOpen] = useState(false);
  const [page, setPage] = useState(1);
  const [pageCount, setPageCount] = useState(1);
  const [loading, setLoading] = useState(true);

  const loadOrders = () => {
    const params = new URLSearchParams({ page: String(page), pageSize: "7" });
    setLoading(true);
    void api.orders(`?${params.toString()}`)
      .then(result => {
        setOrders(result.orders);
        setPageCount(Math.max(result.pagination.pageCount, 1));
        setSelectedOrderId(current => current || result.orders[0]?.id || "");
        if (!selectedOrderId && result.orders[0]) setPaymentMethod(result.orders[0].paymentMethod);
      })
      .catch(error => toast.error(apiMessage(error)))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadOrders();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page]);

  const selectedOrder = orders.find(order => order.id === selectedOrderId) ?? orders[0];

  return (
    <main className="max-w-6xl mx-auto px-4 sm:px-6 py-10">
      <div className="mb-8">
        <p className="text-sm font-semibold uppercase tracking-widest text-[var(--green)]">My Account</p>
        <h1 className="mt-1 text-3xl font-bold text-foreground">Orders</h1>
        <p className="mt-1 text-sm text-muted-foreground">Select an order to review its status and complete payment anytime.</p>
      </div>

      <section className="overflow-hidden rounded-2xl border border-border bg-card">
        {loading ? (
          <div className="p-8 text-center text-sm text-muted-foreground">Loading orders...</div>
        ) : orders.length === 0 ? (
          <div className="flex flex-col items-center justify-center p-10 text-center">
            <PackageCheck size={38} className="mb-3 text-muted-foreground/40" />
            <p className="font-semibold text-foreground">No orders yet</p>
            <p className="mt-1 text-sm text-muted-foreground">Your checkout history will appear here.</p>
            <button onClick={() => onNavigate("listing")} className="mt-4 h-10 rounded-xl bg-primary px-4 text-sm font-semibold text-primary-foreground">Shop products</button>
          </div>
        ) : selectedOrder ? (
          <div className="grid lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
            <div className="max-h-[42rem] divide-y divide-border overflow-y-auto border-b border-border lg:border-b-0 lg:border-r">
              {orders.map(order => {
                const active = order.id === selectedOrder.id;
                return (
                  <button
                    key={order.id}
                    type="button"
                    onClick={() => {
                      setSelectedOrderId(order.id);
                      setPaymentMethod(order.paymentMethod);
                      setPaymentOpen(false);
                    }}
                    className={cn(
                      "flex w-full flex-col gap-3 px-5 py-4 text-left transition-colors hover:bg-secondary/70 sm:flex-row sm:items-center sm:justify-between",
                      active && "bg-[var(--green-light)]",
                    )}
                  >
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="font-semibold text-foreground">{order.orderNumber}</p>
                        <StatusBadge status={order.paymentStatus} />
                      </div>
                      <p className="text-xs text-muted-foreground">{new Date(order.createdAt).toLocaleString()}</p>
                      <p className="mt-1 text-xs text-muted-foreground">{labelStatus(order.status)}</p>
                    </div>
                    <p className="text-lg font-bold text-foreground">{formatCurrency(order.total)}</p>
                  </button>
                );
              })}
              {pageCount > 1 && (
                <div className="flex items-center justify-between gap-3 px-5 py-4">
                  <button
                    type="button"
                    disabled={page <= 1}
                    onClick={() => {
                      setPaymentOpen(false);
                      setPage(value => Math.max(value - 1, 1));
                    }}
                    className="h-9 rounded-xl border border-border px-3 text-sm font-semibold disabled:opacity-40"
                  >
                    Previous
                  </button>
                  <span className="text-sm text-muted-foreground">Page {page} of {pageCount}</span>
                  <button
                    type="button"
                    disabled={page >= pageCount}
                    onClick={() => {
                      setPaymentOpen(false);
                      setPage(value => Math.min(value + 1, pageCount));
                    }}
                    className="h-9 rounded-xl border border-border px-3 text-sm font-semibold disabled:opacity-40"
                  >
                    Next
                  </button>
                </div>
              )}
            </div>

            <OrderDetail
              order={selectedOrder}
              paymentMethod={paymentMethod}
              onPaymentMethodChange={setPaymentMethod}
              paymentOpen={paymentOpen}
              onPaymentOpenChange={setPaymentOpen}
              onChanged={loadOrders}
              onNavigate={onNavigate}
            />
          </div>
        ) : null}
      </section>
    </main>
  );
}

function OrderDetail({
  order,
  paymentMethod,
  onPaymentMethodChange,
  paymentOpen,
  onPaymentOpenChange,
  onChanged,
  onNavigate,
}: {
  order: CustomerOrder;
  paymentMethod: PaymentMethod;
  onPaymentMethodChange: (method: PaymentMethod) => void;
  paymentOpen: boolean;
  onPaymentOpenChange: (open: boolean) => void;
  onChanged: () => void;
  onNavigate: (page: Page) => void;
}) {
  const [requestDialog, setRequestDialog] = useState<"cancel" | "return" | null>(null);
  const [requestReason, setRequestReason] = useState("");
  const [requestSubmitting, setRequestSubmitting] = useState(false);
  const canPay = !["PAID", "REFUNDED"].includes(order.paymentStatus) && order.status !== "CANCELLED";
  const canCancel = ["PENDING_PAYMENT", "PAID"].includes(order.status);
  const canReturnRefund = order.paymentStatus === "PAID" && ["SHIPPED", "COMPLETED"].includes(order.status);
  const canReceipt = order.paymentStatus === "PAID";
  const itemCount = order.items.reduce((sum, item) => sum + item.quantity, 0);
  const pendingCancellation = order.requests.some(request => request.type === "CANCELLATION" && request.status === "PENDING");
  const pendingReturn = order.requests.some(request => request.type === "RETURN_REFUND" && request.status === "PENDING");

  const openRequestDialog = (type: "cancel" | "return") => {
    setRequestDialog(type);
    setRequestReason("");
  };

  const closeRequestDialog = () => {
    if (requestSubmitting) return;
    setRequestDialog(null);
    setRequestReason("");
  };

  const submitRequest = async () => {
    if (!requestDialog) return;
    const reason = requestReason.trim();
    if (!reason) {
      toast.error("Please enter a short reason for your request.");
      return;
    }
    setRequestSubmitting(true);
    try {
      if (requestDialog === "cancel") {
        await api.requestOrderCancellation(order.id, reason);
        toast.success("Cancellation request sent");
      } else {
        await api.requestReturnRefund(order.id, reason);
        toast.success("Return/refund request sent");
      }
      closeRequestDialog();
      onChanged();
    } catch (error) {
      toast.error(apiMessage(error));
    } finally {
      setRequestSubmitting(false);
    }
  };

  const reorder = async () => {
    try {
      const result = await api.reorder(order.id);
      if (result.added > 0) {
        toast.success("Items added to cart");
        onNavigate("cart");
      }
      if (result.skipped.length) {
        toast.info(`Some items were skipped: ${result.skipped.join(", ")}`);
      }
    } catch (error) {
      toast.error(apiMessage(error));
    }
  };

  const printReceipt = async () => {
    try {
      const result = await api.orderReceipt(order.id);
      const receipt = result.receipt;
      const html = `<!doctype html><html><head><title>${receipt.orderNumber}</title></head><body><h1>Gleamtech Receipt</h1><p>Order: ${receipt.orderNumber}</p><p>Total: ${formatCurrency(receipt.total)}</p><p>Status: ${labelStatus(receipt.paymentStatus)}</p><hr/>${receipt.items.map(item => `<p>${item.productName} x ${item.quantity} - ${formatCurrency(item.lineTotal)}</p>`).join("")}</body></html>`;
      const win = window.open("", "_blank");
      if (!win) return;
      win.document.write(html);
      win.document.close();
      win.print();
    } catch (error) {
      toast.error(apiMessage(error));
    }
  };

  const downloadInvoice = async () => {
    try {
      const blob = await api.orderInvoicePdf(order.id);
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `gleamtech-${order.orderNumber}.pdf`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
    } catch (error) {
      toast.error(apiMessage(error));
    }
  };

  return (
    <div className="p-5 sm:p-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest text-[var(--green)]">Order Details</p>
          <h2 className="mt-1 text-2xl font-bold text-foreground">{order.orderNumber}</h2>
          <p className="mt-1 text-sm text-muted-foreground">{new Date(order.createdAt).toLocaleString()}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <StatusBadge status={order.status} />
          <StatusBadge status={order.paymentStatus} />
        </div>
      </div>

      <div className="mt-6 grid gap-4 sm:grid-cols-3">
        <SummaryTile label="Items" value={String(itemCount)} />
        <SummaryTile label="Payment" value={labelStatus(order.paymentStatus)} />
        <SummaryTile label="Total" value={formatCurrency(order.total)} />
      </div>

      <OrderTimeline status={order.status} paymentStatus={order.paymentStatus} />

      <div className="mt-6 flex flex-wrap gap-2">
        <button onClick={reorder} className="inline-flex h-10 items-center gap-2 rounded-xl border border-border px-4 text-sm font-semibold hover:bg-secondary">
          <ShoppingCart size={15} /> Buy again
        </button>
        {canCancel && !pendingCancellation && (
          <button onClick={() => openRequestDialog("cancel")} className="inline-flex h-10 items-center gap-2 rounded-xl border border-border px-4 text-sm font-semibold hover:bg-secondary">
            <XCircle size={15} /> Request cancellation
          </button>
        )}
        {canReturnRefund && !pendingReturn && (
          <button onClick={() => openRequestDialog("return")} className="inline-flex h-10 items-center gap-2 rounded-xl border border-border px-4 text-sm font-semibold hover:bg-secondary">
            <ReceiptText size={15} /> Request return/refund
          </button>
        )}
        {canReceipt && (
          <button onClick={printReceipt} className="inline-flex h-10 items-center gap-2 rounded-xl border border-border px-4 text-sm font-semibold hover:bg-secondary">
            <Download size={15} /> Receipt
          </button>
        )}
        {canReceipt && (
          <button onClick={downloadInvoice} className="inline-flex h-10 items-center gap-2 rounded-xl border border-border px-4 text-sm font-semibold hover:bg-secondary">
            <Download size={15} /> Invoice PDF
          </button>
        )}
      </div>

      {(order.customerNote || order.requests.length > 0) && (
        <section className="mt-6 rounded-2xl border border-border p-4">
          {order.customerNote && (
            <>
              <p className="font-semibold text-foreground">Order notes</p>
              <p className="mt-1 text-sm text-muted-foreground">{order.customerNote}</p>
            </>
          )}
          {order.requests.length > 0 && (
            <div className={order.customerNote ? "mt-4" : ""}>
              <p className="font-semibold text-foreground">Requests</p>
              <div className="mt-2 grid gap-2">
                {order.requests.map(request => (
                  <div key={request.id} className="rounded-xl bg-secondary/50 p-3 text-sm">
                    <p className="font-semibold text-foreground">{labelStatus(request.type)} - {labelStatus(request.status)}</p>
                    <p className="mt-1 text-muted-foreground">{request.reason}</p>
                    {request.adminNote && <p className="mt-1 text-muted-foreground">Admin note: {request.adminNote}</p>}
                  </div>
                ))}
              </div>
            </div>
          )}
        </section>
      )}

      <div className="mt-6 rounded-2xl border border-border">
        <div className="border-b border-border px-4 py-3">
          <p className="font-semibold text-foreground">Purchased items</p>
        </div>
        <div className="divide-y divide-border">
          {order.items.map(item => (
            <div key={`${item.productId}-${item.productSku}`} className="flex items-start justify-between gap-4 px-4 py-3 text-sm">
              <div>
                <p className="font-medium text-foreground">{item.productName}</p>
                <p className="text-xs text-muted-foreground">Qty {item.quantity} - {item.productSku}</p>
              </div>
              <p className="shrink-0 font-semibold text-foreground">{formatCurrency(item.lineTotal)}</p>
            </div>
          ))}
        </div>
        <div className="grid gap-2 border-t border-border bg-secondary/30 px-4 py-3 text-sm">
          <div className="flex justify-between"><span className="text-muted-foreground">Subtotal</span><span>{formatCurrency(order.subtotal)}</span></div>
          {order.discount > 0 && (
            <div className="flex justify-between text-[var(--green)]">
              <span>{order.promoCode ? `${order.promoCode} discount` : "Discount"}</span>
              <span>-{formatCurrency(order.discount)}</span>
            </div>
          )}
          <div className="flex justify-between font-bold"><span>Total</span><span>{formatCurrency(order.total)}</span></div>
        </div>
      </div>

      <div className="mt-6 rounded-2xl border border-border bg-secondary/40 p-4">
        <p className="font-semibold text-foreground">Ship to</p>
        <p className="mt-2 text-sm text-muted-foreground">
          {order.shippingAddress.name}<br />
          {order.shippingAddress.line1}{order.shippingAddress.line2 ? `, ${order.shippingAddress.line2}` : ""}<br />
          {order.shippingAddress.city}, {order.shippingAddress.region} {order.shippingAddress.postal}<br />
          {order.shippingAddress.country}
        </p>
      </div>

      {canPay ? (
        <PaymentPanel
          order={order}
          paymentMethod={paymentMethod}
          onPaymentMethodChange={onPaymentMethodChange}
          open={paymentOpen}
          onOpenChange={onPaymentOpenChange}
          onChanged={onChanged}
        />
      ) : (
        <ClosedPaymentNotice order={order} />
      )}

      <OrderRequestDialog
        type={requestDialog}
        orderNumber={order.orderNumber}
        reason={requestReason}
        submitting={requestSubmitting}
        onReasonChange={setRequestReason}
        onClose={closeRequestDialog}
        onSubmit={submitRequest}
      />
    </div>
  );
}

function OrderRequestDialog({
  type,
  orderNumber,
  reason,
  submitting,
  onReasonChange,
  onClose,
  onSubmit,
}: {
  type: "cancel" | "return" | null;
  orderNumber: string;
  reason: string;
  submitting: boolean;
  onReasonChange: (value: string) => void;
  onClose: () => void;
  onSubmit: () => void;
}) {
  if (!type) return null;
  const isCancel = type === "cancel";
  return (
    <div className="fixed inset-0 z-[90] flex items-end justify-center bg-black/40 px-4 py-4 sm:items-center">
      <section className="w-full max-w-md rounded-2xl border border-border bg-card p-5 shadow-2xl">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-[var(--green)]">{orderNumber}</p>
            <h2 className="mt-1 text-xl font-bold text-foreground">
              {isCancel ? "Request cancellation" : "Request return/refund"}
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={submitting}
            className="flex h-9 w-9 items-center justify-center rounded-xl text-muted-foreground hover:bg-secondary hover:text-foreground disabled:opacity-50"
            aria-label="Close request window"
          >
            ×
          </button>
        </div>
        <p className="mt-3 text-sm text-muted-foreground">
          {isCancel
            ? "Tell us why you would like to cancel this order."
            : "Describe the return or refund concern so the team can review it."}
        </p>
        <label className="mt-4 block text-sm font-semibold text-foreground">
          Reason
          <textarea
            value={reason}
            onChange={event => onReasonChange(event.target.value)}
            maxLength={400}
            className="mt-2 h-28 w-full resize-none rounded-xl border border-border bg-input-background px-3 py-2 text-sm font-normal outline-none focus:ring-2 focus:ring-ring/30"
            placeholder={isCancel ? "Example: I placed the wrong order." : "Example: I received the wrong item."}
          />
        </label>
        <p className="mt-1 text-right text-xs text-muted-foreground">{reason.length}/400</p>
        <div className="mt-5 grid gap-3 sm:grid-cols-2">
          <button
            type="button"
            onClick={onClose}
            disabled={submitting}
            className="h-11 rounded-xl border border-border px-4 text-sm font-semibold hover:bg-secondary disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onSubmit}
            disabled={submitting}
            className="h-11 rounded-xl bg-primary px-4 text-sm font-semibold text-primary-foreground hover:bg-[var(--green-dark)] disabled:opacity-60"
          >
            {submitting ? "Sending..." : "Submit request"}
          </button>
        </div>
      </section>
    </div>
  );
}

function PaymentPanel({
  order,
  paymentMethod,
  onPaymentMethodChange,
  open,
  onOpenChange,
  onChanged,
}: {
  order: CustomerOrder;
  paymentMethod: PaymentMethod;
  onPaymentMethodChange: (method: PaymentMethod) => void;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onChanged: () => void;
}) {
  const [reference, setReference] = useState(order.paymentSubmission?.reference ?? "");
  const [proof, setProof] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const submitted = order.paymentStatus === "SUBMITTED";

  useEffect(() => {
    setReference(order.paymentSubmission?.reference ?? "");
    setProof(null);
  }, [order.id, order.paymentSubmission?.reference]);

  const submitPayment = async () => {
    if (reference.trim().length < 6) {
      toast.error("Enter the transaction reference from your payment confirmation.");
      return;
    }
    if (!proof) {
      toast.error("Upload a screenshot or photo of your payment confirmation.");
      return;
    }
    if (proof.size > 5 * 1024 * 1024) {
      toast.error("Payment proof must be 5 MB or smaller.");
      return;
    }
    setSubmitting(true);
    try {
      await api.submitPayment(order.id, { method: paymentMethod, reference: reference.trim(), proof });
      toast.success("Payment submitted for verification");
      setProof(null);
      onChanged();
    } catch (error) {
      toast.error(apiMessage(error));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="mt-6 rounded-2xl border border-[var(--green-mid)] bg-[var(--green-light)]/50 p-4">
      <button
        type="button"
        onClick={() => onOpenChange(!open)}
        className="flex w-full items-start justify-between gap-4 text-left"
        aria-expanded={open}
      >
        <div className="flex items-start gap-3">
          <Clock3 size={20} className="mt-0.5 text-[var(--green)]" />
          <div>
            <p className="font-semibold text-foreground">{submitted ? "Payment submitted" : "Pending payment"}</p>
            <p className="mt-1 text-sm text-muted-foreground">
              {submitted
                ? "Your proof is waiting for administrator verification. You can replace it below if you submitted the wrong details."
                : `Pay ${formatCurrency(order.total)} using GCash or bank transfer, then submit the reference and proof below.`}
            </p>
          </div>
        </div>
        <ChevronDown
          size={20}
          className={cn("mt-0.5 shrink-0 text-[var(--green)] transition-transform", open && "rotate-180")}
        />
      </button>

      {open && (
        <>
          <div className="mt-4 grid grid-cols-2 rounded-xl border border-border bg-card p-1">
            <button
              type="button"
              onClick={() => onPaymentMethodChange("GCASH")}
              className={cn(
                "flex h-10 items-center justify-center gap-2 rounded-lg text-sm font-semibold transition-colors",
                paymentMethod === "GCASH" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground",
              )}
            >
              <QrCode size={15} />
              QR
            </button>
            <button
              type="button"
              onClick={() => onPaymentMethodChange("BANK_TRANSFER")}
              className={cn(
                "flex h-10 items-center justify-center gap-2 rounded-lg text-sm font-semibold transition-colors",
                paymentMethod === "BANK_TRANSFER" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground",
              )}
            >
              <Landmark size={15} />
              Bank Transfer
            </button>
          </div>

          {paymentMethod === "GCASH" ? (
            <div className="mt-4 flex justify-center rounded-2xl border border-border bg-white p-4">
              <img src={gcashQrUrl} alt="GCash QR payment code" className="h-64 w-64 max-w-full object-contain" />
            </div>
          ) : (
            <div className="mt-4 rounded-2xl border border-border bg-card p-4 text-sm text-muted-foreground select-none">
              <p className="mb-3 font-semibold text-foreground">Bank transfer details</p>
              <PaymentRow label="Bank Name" value={BANK_TRANSFER_DETAILS.bankName} />
              <PaymentRow label="Account Number" value={BANK_TRANSFER_DETAILS.accountNumber} />
              <PaymentRow label="Account Name" value={BANK_TRANSFER_DETAILS.accountName} />
            </div>
          )}
          {order.paymentSubmission && (
            <div className="mt-4 rounded-xl border border-border bg-card p-3 text-sm">
              <p className="font-semibold text-foreground">Current submission</p>
              <p className="mt-1 text-muted-foreground">Reference: {order.paymentSubmission.reference}</p>
              <p className="text-muted-foreground">Submitted: {new Date(order.paymentSubmission.submittedAt).toLocaleString()}</p>
            </div>
          )}
          <div className="mt-4 grid gap-3 rounded-xl border border-border bg-card p-4">
            <label className="text-sm font-medium text-foreground">
              Transaction reference
              <input
                value={reference}
                onChange={event => setReference(event.target.value.slice(0, 120))}
                placeholder="Enter the GCash or bank reference"
                className="mt-1 h-11 w-full rounded-xl border border-border bg-input-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring/30"
              />
            </label>
            <label className="text-sm font-medium text-foreground">
              Payment proof
              <span className="mt-1 flex min-h-11 items-center gap-2 rounded-xl border border-dashed border-border px-3 text-sm text-muted-foreground">
                <Paperclip size={15} />
                <span>{proof?.name ?? "JPEG, PNG, or WebP up to 5 MB"}</span>
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  onChange={event => setProof(event.target.files?.[0] ?? null)}
                  className="sr-only"
                />
              </span>
            </label>
            <button
              type="button"
              onClick={submitPayment}
              disabled={submitting}
              className="h-11 rounded-xl bg-primary px-4 text-sm font-semibold text-primary-foreground disabled:opacity-60"
            >
              {submitting ? "Submitting..." : submitted ? "Replace submission" : "Submit for verification"}
            </button>
          </div>
        </>
      )}
    </div>
  );
}

function ClosedPaymentNotice({ order }: { order: CustomerOrder }) {
  const cancelled = order.status === "CANCELLED";

  return (
    <div className="mt-6 rounded-2xl border border-border bg-card p-4">
      <div className="flex items-start gap-3">
        {cancelled ? (
          <XCircle size={20} className="mt-0.5 text-destructive" />
        ) : (
          <CheckCircle2 size={20} className="mt-0.5 text-[var(--green)]" />
        )}
        <div>
          <p className="font-semibold text-foreground">{cancelled ? "Order cancelled" : "Payment confirmed"}</p>
          <p className="mt-1 text-sm text-muted-foreground">
            {cancelled
              ? "This order is no longer open for payment."
              : "Your payment has been confirmed. Delivery coordination follows the order status."}
          </p>
        </div>
      </div>
    </div>
  );
}

function OrderTimeline({ status, paymentStatus }: { status: string; paymentStatus: string }) {
  const steps = [
    { key: "PENDING_PAYMENT", label: "Pending Payment" },
    { key: "PAID", label: "Paid" },
    { key: "PROCESSING", label: "Processing" },
    { key: "READY_FOR_DELIVERY", label: "Ready for Delivery" },
    { key: "COMPLETED", label: "Completed" },
  ];
  const activeKey = paymentStatus === "PAID" && status === "PENDING_PAYMENT" ? "PAID" : status;
  const activeIndex = status === "CANCELLED" ? -1 : Math.max(steps.findIndex(step => step.key === activeKey), 0);

  return (
    <div className="mt-6 rounded-2xl border border-border bg-card p-4">
      <p className="font-semibold text-foreground">Order timeline</p>
      <div className="mt-4 grid gap-3 sm:grid-cols-5">
        {steps.map((step, index) => {
          const complete = index <= activeIndex;
          return (
            <div key={step.key} className="flex items-center gap-2 sm:flex-col sm:items-start">
              <span className={cn(
                "flex h-7 w-7 shrink-0 items-center justify-center rounded-full border text-xs font-bold",
                complete ? "border-[var(--green)] bg-[var(--green-light)] text-[var(--green)]" : "border-border text-muted-foreground",
              )}>
                {complete ? <CheckCircle2 size={15} /> : index + 1}
              </span>
              <span className={cn("text-xs font-semibold", complete ? "text-foreground" : "text-muted-foreground")}>{step.label}</span>
            </div>
          );
        })}
      </div>
      {status === "CANCELLED" && <p className="mt-3 text-sm text-destructive">This order has been cancelled.</p>}
    </div>
  );
}

function SummaryTile({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-border bg-secondary/50 p-4">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="mt-1 font-bold text-foreground">{value}</p>
    </div>
  );
}

function PaymentRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col gap-1 border-t border-border py-2 first:border-t-0 first:pt-0 sm:flex-row sm:justify-between">
      <span>{label}</span>
      <span className="font-semibold text-foreground">{value}</span>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const normalized = status.toUpperCase();
  const paid = normalized === "PAID" || normalized === "COMPLETED";
  const cancelled = normalized === "CANCELLED" || normalized === "FAILED" || normalized === "REFUNDED";

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full px-2 py-1 text-xs font-semibold",
        paid && "bg-[var(--green-light)] text-[var(--green)]",
        cancelled && "bg-destructive/10 text-destructive",
        !paid && !cancelled && "bg-secondary text-muted-foreground",
      )}
    >
      {paid ? <CheckCircle2 size={12} /> : cancelled ? <XCircle size={12} /> : <ReceiptText size={12} />}
      {labelStatus(status)}
    </span>
  );
}
