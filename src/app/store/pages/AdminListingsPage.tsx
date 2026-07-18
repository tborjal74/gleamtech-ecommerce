import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Download, Edit3, ImagePlus, PackagePlus, RefreshCw, Search, Trash2, X } from "lucide-react";
import { toast } from "sonner";
import { api, ApiClientError, type AdminProduct, type AdminProductInput } from "../../api";
import { formatCurrency } from "../currency";
import type { Page } from "../types";
import { fallbackProductImage } from "../productImages";

type ListingForm = {
  sku: string;
  name: string;
  shortDescription: string;
  description: string;
  price: string;
  weightMode: "grams" | "na";
  weightGrams: string;
  stockQuantity: string;
  category: string;
  scent: string;
  isEco: boolean;
  isActive: boolean;
  isPublished: boolean;
  sizes: string;
  tags: string;
};

const emptyForm: ListingForm = {
  sku: "",
  name: "",
  shortDescription: "",
  description: "",
  price: "",
  weightMode: "na",
  weightGrams: "",
  stockQuantity: "0",
  category: "Kitchen",
  scent: "",
  isEco: false,
  isActive: true,
  isPublished: false,
  sizes: "Standard",
  tags: "",
};

const PRODUCT_CATEGORIES = ["Kitchen", "Bathroom", "Laundry", "Floor", "Others"] as const;

function normalizeFormCategory(category: string): typeof PRODUCT_CATEGORIES[number] {
  if (category === "Floors") return "Floor";
  return PRODUCT_CATEGORIES.includes(category as typeof PRODUCT_CATEGORIES[number])
    ? category as typeof PRODUCT_CATEGORIES[number]
    : "Others";
}

function apiMessage(error: unknown) {
  return error instanceof ApiClientError
    ? error.body.message
    : error instanceof Error
      ? error.message
      : "Request failed.";
}

function formFromProduct(product: AdminProduct): ListingForm {
  return {
    sku: product.sku,
    name: product.name,
    shortDescription: product.shortDescription,
    description: product.description,
    price: String(product.priceCents / 100),
    weightMode: product.weightGrams ? "grams" : "na",
    weightGrams: product.weightGrams ? String(product.weightGrams) : "",
    stockQuantity: String(product.stockQuantity),
    category: normalizeFormCategory(product.category),
    scent: product.scent ?? "",
    isEco: product.isEco,
    isActive: product.isActive,
    isPublished: product.isPublished,
    sizes: product.sizes.join(", "),
    tags: product.tags.join(", "),
  };
}

function toInput(form: ListingForm): AdminProductInput {
  return {
    sku: form.sku.trim(),
    name: form.name.trim(),
    shortDescription: form.shortDescription.trim(),
    description: form.description.trim(),
    priceCents: Math.round(Number(form.price) * 100),
    weightGrams: form.weightMode === "grams" ? Number(form.weightGrams) : null,
    stockQuantity: Number(form.stockQuantity),
    category: form.category.trim(),
    scent: form.scent.trim() || undefined,
    isEco: form.isEco,
    isActive: form.isActive,
    isPublished: form.isPublished,
    sizes: form.sizes.split(",").map(value => value.trim()).filter(Boolean),
    tags: form.tags.split(",").map(value => value.trim()).filter(Boolean),
  };
}

function downloadFilename(product: AdminProduct, mimeType?: string) {
  const baseName = product.name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "") || product.sku.toLowerCase();
  const extension = mimeType === "image/jpeg"
    ? "jpg"
    : mimeType === "image/webp"
      ? "webp"
      : "png";
  return `${baseName}.${extension}`;
}

export function AdminListingsPage({ onNavigate, onProductsChanged }: { onNavigate: (page: Page) => void; onProductsChanged: () => Promise<void> }) {
  const [products, setProducts] = useState<AdminProduct[]>([]);
  const [search, setSearch] = useState("");
  const [published, setPublished] = useState("");
  // Archived products remain in the database for order-history integrity, but
  // should disappear from the default working list after an archive action.
  const [active, setActive] = useState("true");
  const [page, setPage] = useState(1);
  const [pageCount, setPageCount] = useState(1);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [creating, setCreating] = useState(false);
  const [editing, setEditing] = useState<AdminProduct | null>(null);
  const [form, setForm] = useState<ListingForm>(emptyForm);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState("");
  const [imageAction, setImageAction] = useState(false);
  const [downloadingProductId, setDownloadingProductId] = useState<string | null>(null);
  const [confirmingDelete, setConfirmingDelete] = useState<AdminProduct | null>(null);

  const query = useMemo(() => {
    const params = new URLSearchParams({ page: String(page), pageSize: "10", sortBy: "updatedAt", sortDirection: "desc" });
    if (search.trim()) params.set("search", search.trim());
    if (published) params.set("published", published);
    if (active) params.set("active", active);
    return `?${params.toString()}`;
  }, [active, page, published, search]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const result = await api.adminProducts(query);
      setProducts(result.products);
      const nextPageCount = Math.max(result.pagination.pageCount, 1);
      setPageCount(nextPageCount);
      if (page > nextPageCount) setPage(nextPageCount);
    } catch (error) {
      toast.error(apiMessage(error));
    } finally {
      setLoading(false);
    }
  }, [page, query]);

  useEffect(() => {
    void load();
  }, [load]);

  const openCreate = () => {
    setCreating(true);
    setEditing(null);
    setForm(emptyForm);
    setImageFile(null);
    setImagePreview("");
  };

  const syncListings = async () => {
    setSyncing(true);
    try {
      await load();
      await onProductsChanged();
      toast.success("Product listings synced");
    } catch (error) {
      toast.error(apiMessage(error));
    } finally {
      setSyncing(false);
    }
  };

  const openEdit = (product: AdminProduct) => {
    setCreating(false);
    setEditing(product);
    setForm(formFromProduct(product));
    setImageFile(null);
    setImagePreview(product.primaryImageUrl);
  };

  const closeForm = () => {
    setCreating(false);
    setEditing(null);
    setForm(emptyForm);
    setImageFile(null);
    setImagePreview("");
  };

  const save = async () => {
    const input = toInput(form);
    if (!input.name || !input.sku || !input.description || input.priceCents <= 0 || input.stockQuantity < 0) {
      toast.error("Complete the required product fields with valid values.");
      return;
    }
    if (form.weightMode === "grams" && (!Number.isFinite(Number(form.weightGrams)) || Number(form.weightGrams) <= 0)) {
      toast.error("Enter a valid product weight or choose N/A.");
      return;
    }
    if (!editing && !imageFile) {
      toast.error("Add a product image before creating a listing.");
      return;
    }

    setSaving(true);
    try {
      const result = editing
        ? await api.adminUpdateProduct(editing.id, input)
        : await api.adminCreateProduct({ ...input, isPublished: input.isPublished && Boolean(imageFile) });
      if (imageFile) {
        await api.adminUploadProductImage(result.product.id, imageFile, true);
        if (!editing && input.isPublished) {
          await api.adminUpdateProduct(result.product.id, { isPublished: true });
        }
      }
      toast.success(editing ? "Listing updated" : "Listing created");
      closeForm();
      await load();
      await onProductsChanged().catch(() => {
        toast.warning("Listing saved, but the storefront catalog could not refresh yet.");
      });
    } catch (error) {
      toast.error(apiMessage(error));
    } finally {
      setSaving(false);
    }
  };

  const deleteProduct = async () => {
    if (!confirmingDelete) return;
    try {
      const result = await api.adminDeleteProduct(confirmingDelete.id);
      toast.success(result.mode === "archived" ? "Listing archived to preserve order history" : "Listing deleted");
      setConfirmingDelete(null);
      await load();
      await onProductsChanged().catch(() => {
        toast.warning("Listing changed, but the storefront catalog could not refresh yet.");
      });
    } catch (error) {
      if (error instanceof ApiClientError && error.body.code === "PRODUCT_NOT_FOUND") {
        setConfirmingDelete(null);
        toast.info("That listing was already removed. Refreshing listings.");
        await load();
        await onProductsChanged().catch(() => undefined);
        return;
      }
      toast.error(apiMessage(error));
    }
  };

  const downloadListingImage = async (product: AdminProduct) => {
    const image = product.images.find(candidate => candidate.isPrimary) ?? product.images[0];
    const imageUrl = image?.url || product.primaryImageUrl;
    if (!imageUrl) {
      toast.error("This listing does not have an image to download.");
      return;
    }

    setDownloadingProductId(product.id);
    try {
      // Download the original response bytes instead of a rendered thumbnail.
      const response = await fetch(imageUrl, { credentials: "same-origin" });
      if (!response.ok) throw new Error(`Image request failed with status ${response.status}.`);
      const blob = await response.blob();
      const objectUrl = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = objectUrl;
      link.download = downloadFilename(product, image?.mimeType || blob.type);
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(objectUrl);
    } catch (error) {
      console.error("Failed to download listing image", { productId: product.id, imageUrl, error });
      toast.error("The listing image could not be downloaded. Check that the image upload is still available.");
    } finally {
      setDownloadingProductId(null);
    }
  };

  const refreshEditingProduct = async (productId: string) => {
    const result = await api.adminProduct(productId);
    setEditing(result.product);
    setImagePreview(result.product.primaryImageUrl);
    await load();
    await onProductsChanged().catch(() => undefined);
  };

  const uploadManagedImage = async () => {
    if (!editing || !imageFile) return;
    setImageAction(true);
    try {
      await api.adminUploadProductImage(editing.id, imageFile, editing.images.length === 0);
      setImageFile(null);
      setImagePreview("");
      toast.success("Product image uploaded");
      await refreshEditingProduct(editing.id);
    } catch (error) {
      toast.error(apiMessage(error));
    } finally {
      setImageAction(false);
    }
  };

  const setPrimaryImage = async (imageId: string) => {
    if (!editing) return;
    setImageAction(true);
    try {
      const result = await api.adminSetPrimaryProductImage(editing.id, imageId);
      setEditing(result.product);
      setImagePreview(result.product.primaryImageUrl);
      toast.success("Primary image updated");
      await load();
      await onProductsChanged().catch(() => undefined);
    } catch (error) {
      toast.error(apiMessage(error));
    } finally {
      setImageAction(false);
    }
  };

  const deleteManagedImage = async (imageId: string) => {
    if (!editing) return;
    setImageAction(true);
    try {
      await api.adminDeleteProductImage(editing.id, imageId);
      toast.success("Product image deleted");
      await refreshEditingProduct(editing.id);
    } catch (error) {
      toast.error(apiMessage(error));
    } finally {
      setImageAction(false);
    }
  };

  const moveImage = async (imageId: string, direction: -1 | 1) => {
    if (!editing) return;
    const index = editing.images.findIndex(image => image.id === imageId);
    const nextIndex = index + direction;
    if (index < 0 || nextIndex < 0 || nextIndex >= editing.images.length) return;
    const nextIds = editing.images.map(image => image.id);
    [nextIds[index], nextIds[nextIndex]] = [nextIds[nextIndex], nextIds[index]];
    setImageAction(true);
    try {
      const result = await api.adminReorderProductImages(editing.id, nextIds);
      setEditing(result.product);
      toast.success("Image order updated");
      await load();
      await onProductsChanged().catch(() => undefined);
    } catch (error) {
      toast.error(apiMessage(error));
    } finally {
      setImageAction(false);
    }
  };

  const showForm = creating || editing !== null;

  return (
    <main className="max-w-[90rem] mx-auto px-4 sm:px-6 py-8">
      <div className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <p className="text-sm font-semibold uppercase tracking-widest text-[var(--green)]">Administrator</p>
          <h1 className="mt-1 text-3xl font-bold text-foreground">Listings</h1>
          <p className="mt-1 text-sm text-muted-foreground">Create, price, publish, archive, and manage product inventory.</p>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row">
          <button
            onClick={syncListings}
            disabled={syncing}
            className="inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-border px-4 text-sm font-semibold hover:bg-secondary disabled:cursor-not-allowed disabled:opacity-60"
          >
            <RefreshCw size={17} className={syncing ? "animate-spin" : ""} />
            {syncing ? "Syncing..." : "Sync Listings"}
          </button>
          <button onClick={openCreate} className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-primary px-4 text-sm font-semibold text-primary-foreground hover:bg-[var(--green-dark)]">
            <PackagePlus size={17} />
            Add Product
          </button>
        </div>
      </div>

      <section className="mb-5 grid gap-3 rounded-2xl border border-border bg-card p-4 lg:grid-cols-[1fr_150px_150px]">
        <label className="relative">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input value={search} onChange={event => { setSearch(event.target.value); setPage(1); }} placeholder="Search by name or SKU" className="h-11 w-full rounded-xl border border-border bg-input-background pl-10 pr-3 text-sm outline-none focus:ring-2 focus:ring-ring/30" />
        </label>
        <select value={published} onChange={event => { setPublished(event.target.value); setPage(1); }} className="h-11 rounded-xl border border-border bg-card px-3 text-sm">
          <option value="">All publish states</option>
          <option value="true">Published</option>
          <option value="false">Unpublished</option>
        </select>
        <select value={active} onChange={event => { setActive(event.target.value); setPage(1); }} className="h-11 rounded-xl border border-border bg-card px-3 text-sm">
          <option value="">All active states</option>
          <option value="true">Active</option>
          <option value="false">Inactive</option>
        </select>
      </section>

      <section className="overflow-hidden rounded-2xl border border-border bg-card">
        <div className="hidden grid-cols-[72px_minmax(320px,1.5fr)_130px_110px_110px_320px] gap-4 border-b border-border px-4 py-3 text-xs font-semibold uppercase tracking-widest text-muted-foreground lg:grid">
          <span>Image</span><span>Product</span><span>Price</span><span>Stock</span><span>Status</span><span>Actions</span>
        </div>
        {loading ? (
          <div className="p-8 text-center text-sm text-muted-foreground">Loading listings...</div>
        ) : products.length === 0 ? (
          <div className="p-8 text-center text-sm text-muted-foreground">No listings found.</div>
        ) : (
          <div className="divide-y divide-border">
            {products.map(product => (
              <article key={product.id} className="grid gap-4 px-4 py-4 lg:grid-cols-[72px_minmax(320px,1.5fr)_130px_110px_110px_320px] lg:items-center">
                <AdminProductImage product={product} />
                <div>
                  <h2 className="font-semibold text-foreground">{product.name}</h2>
                  <p className="text-xs text-muted-foreground">{product.sku}</p>
                  <p className="mt-1 text-xs text-muted-foreground">{product.weightGrams ? `${product.weightGrams}g` : "N/A"} · Updated {new Date(product.updatedAt).toLocaleDateString()}</p>
                </div>
                <p className="text-sm font-semibold text-foreground">{formatCurrency(product.priceCents / 100)}</p>
                <p className="text-sm text-foreground">{product.stockQuantity}</p>
                <div className="flex flex-wrap gap-2">
                  <span className={`rounded-full px-2 py-1 text-xs font-semibold ${product.isPublished ? "bg-[var(--green-light)] text-[var(--green)]" : "bg-secondary text-muted-foreground"}`}>{product.isPublished ? "Published" : "Unpublished"}</span>
                  <span className={`rounded-full px-2 py-1 text-xs font-semibold ${product.isActive ? "bg-[var(--blue-light)] text-[var(--blue)]" : "bg-secondary text-muted-foreground"}`}>{product.isActive ? "Active" : "Inactive"}</span>
                </div>
                <div className="flex min-w-0 gap-2">
                  <button onClick={() => openEdit(product)} className="inline-flex h-9 items-center gap-2 rounded-xl border border-border px-3 text-sm font-semibold hover:bg-secondary"><Edit3 size={14} />Edit</button>
                  <button
                    onClick={() => void downloadListingImage(product)}
                    disabled={downloadingProductId === product.id || (!product.primaryImageUrl && product.images.length === 0)}
                    title="Download original listing image"
                    className="inline-flex h-9 items-center gap-2 rounded-xl border border-border px-3 text-sm font-semibold hover:bg-secondary disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <Download size={14} />{downloadingProductId === product.id ? "Downloading..." : "Download"}
                  </button>
                  <button onClick={() => setConfirmingDelete(product)} className="inline-flex h-9 items-center gap-2 rounded-xl border border-border px-3 text-sm font-semibold text-destructive hover:bg-secondary"><Trash2 size={14} />Delete</button>
                </div>
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

      {showForm && (
        <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/40 px-4">
          <div className="max-h-[92vh] w-full max-w-3xl overflow-y-auto rounded-2xl border border-border bg-card p-5 shadow-2xl">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-xl font-bold text-foreground">{editing ? "Edit Product" : "Add Product"}</h2>
              <button onClick={closeForm} className="rounded-lg p-2 text-muted-foreground hover:bg-secondary"><X size={18} /></button>
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              {(["name", "sku", "shortDescription", "price"] as const).map(field => (
                <label key={field} className="grid gap-1 text-sm font-medium text-foreground">
                  {field === "price" ? "Price (PHP)" : field}
                  <input value={form[field]} onChange={event => setForm(prev => ({ ...prev, [field]: event.target.value }))} className="h-11 rounded-xl border border-border bg-input-background px-3 text-sm font-normal" />
                </label>
              ))}
              <div className="grid gap-1 text-sm font-medium text-foreground">
                Weight
                <div className="grid grid-cols-[120px_1fr] gap-2">
                  <select
                    value={form.weightMode}
                    onChange={event => setForm(prev => ({ ...prev, weightMode: event.target.value as ListingForm["weightMode"], weightGrams: event.target.value === "na" ? "" : prev.weightGrams }))}
                    className="h-11 rounded-xl border border-border bg-card px-3 text-sm font-normal"
                  >
                    <option value="na">N/A</option>
                    <option value="grams">Grams</option>
                  </select>
                  <input
                    value={form.weightGrams}
                    disabled={form.weightMode === "na"}
                    onChange={event => setForm(prev => ({ ...prev, weightGrams: event.target.value }))}
                    placeholder={form.weightMode === "na" ? "Not applicable" : "e.g. 500"}
                    className="h-11 rounded-xl border border-border bg-input-background px-3 text-sm font-normal disabled:cursor-not-allowed disabled:opacity-60"
                  />
                </div>
              </div>
              <label className="grid gap-1 text-sm font-medium text-foreground">
                stockQuantity
                <input value={form.stockQuantity} onChange={event => setForm(prev => ({ ...prev, stockQuantity: event.target.value }))} className="h-11 rounded-xl border border-border bg-input-background px-3 text-sm font-normal" />
              </label>
              <label className="grid gap-1 text-sm font-medium text-foreground">
                category
                <select value={form.category} onChange={event => setForm(prev => ({ ...prev, category: event.target.value }))} className="h-11 rounded-xl border border-border bg-card px-3 text-sm font-normal">
                  {PRODUCT_CATEGORIES.map(category => <option key={category} value={category}>{category}</option>)}
                </select>
              </label>
              <label className="grid gap-1 text-sm font-medium text-foreground">
                scent
                <input value={form.scent} onChange={event => setForm(prev => ({ ...prev, scent: event.target.value }))} className="h-11 rounded-xl border border-border bg-input-background px-3 text-sm font-normal" />
              </label>
              <label className="md:col-span-2 grid gap-1 text-sm font-medium text-foreground">
                Description
                <textarea value={form.description} onChange={event => setForm(prev => ({ ...prev, description: event.target.value }))} className="min-h-24 rounded-xl border border-border bg-input-background px-3 py-2 text-sm font-normal" />
              </label>
              <label className="grid gap-1 text-sm font-medium text-foreground">
                Sizes, comma-separated
                <input value={form.sizes} onChange={event => setForm(prev => ({ ...prev, sizes: event.target.value }))} className="h-11 rounded-xl border border-border bg-input-background px-3 text-sm font-normal" />
              </label>
              <label className="grid gap-1 text-sm font-medium text-foreground">
                Tags, comma-separated
                <input value={form.tags} onChange={event => setForm(prev => ({ ...prev, tags: event.target.value }))} className="h-11 rounded-xl border border-border bg-input-background px-3 text-sm font-normal" />
              </label>
              <div className="md:col-span-2 grid gap-3 rounded-xl border border-border p-4 sm:grid-cols-3">
                {(["isActive", "isPublished", "isEco"] as const).map(field => (
                  <label key={field} className="flex items-center gap-2 text-sm font-semibold">
                    <input type="checkbox" checked={form[field]} onChange={event => setForm(prev => ({ ...prev, [field]: event.target.checked }))} />
                    {field}
                  </label>
                ))}
              </div>
              <section className="md:col-span-2 rounded-xl border border-border p-4">
                <div className="mb-3 flex items-center justify-between gap-3">
                  <div>
                    <h3 className="text-sm font-semibold text-foreground">Product images</h3>
                    <p className="text-xs text-muted-foreground">Upload, set primary, reorder, or remove listing images.</p>
                  </div>
                  {imageAction && <span className="text-xs font-semibold text-[var(--green)]">Updating...</span>}
                </div>
                {editing && editing.images.length > 0 && (
                  <div className="mb-4 grid gap-3 sm:grid-cols-2">
                    {editing.images.map((image, index) => (
                      <div key={image.id} className="rounded-xl border border-border p-3">
                        <img src={image.url} alt={`${editing.name} image ${index + 1}`} className="h-32 w-full rounded-lg bg-secondary object-cover" />
                        <div className="mt-3 flex flex-wrap gap-2">
                          <button disabled={image.isPrimary || imageAction} onClick={() => setPrimaryImage(image.id)} className="h-8 rounded-lg border border-border px-2 text-xs font-semibold hover:bg-secondary disabled:opacity-50">{image.isPrimary ? "Primary" : "Set primary"}</button>
                          <button disabled={index === 0 || imageAction} onClick={() => moveImage(image.id, -1)} className="h-8 rounded-lg border border-border px-2 text-xs font-semibold hover:bg-secondary disabled:opacity-50">Left</button>
                          <button disabled={index === editing.images.length - 1 || imageAction} onClick={() => moveImage(image.id, 1)} className="h-8 rounded-lg border border-border px-2 text-xs font-semibold hover:bg-secondary disabled:opacity-50">Right</button>
                          <button disabled={imageAction} onClick={() => deleteManagedImage(image.id)} className="h-8 rounded-lg border border-border px-2 text-xs font-semibold text-destructive hover:bg-secondary disabled:opacity-50">Delete</button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                  {(imagePreview || (!editing && imageFile)) && <img src={imagePreview} alt="" className="h-24 w-24 rounded-xl object-cover" />}
                  <span className="inline-flex items-center gap-2">
                    <ImagePlus size={16} />
                    <input type="file" accept="image/png,image/jpeg,image/webp" onChange={event => {
                      const file = event.target.files?.[0] ?? null;
                      setImageFile(file);
                      setImagePreview(file ? URL.createObjectURL(file) : "");
                    }} />
                  </span>
                  {editing && (
                    <button onClick={uploadManagedImage} disabled={!imageFile || imageAction} className="h-10 rounded-xl bg-primary px-4 text-sm font-semibold text-primary-foreground hover:bg-[var(--green-dark)] disabled:opacity-60">
                      Upload Image
                    </button>
                  )}
                </div>
              </section>
            </div>
            <div className="mt-5 flex justify-end gap-3">
              <button onClick={closeForm} className="h-11 rounded-xl border border-border px-4 text-sm font-semibold">Cancel</button>
              <button onClick={save} disabled={saving} className="h-11 rounded-xl bg-primary px-5 text-sm font-semibold text-primary-foreground disabled:opacity-60">{saving ? "Saving..." : "Save Listing"}</button>
            </div>
          </div>
        </div>
      )}

      {confirmingDelete && (
        <div className="fixed inset-0 z-[90] flex items-center justify-center bg-black/40 px-4">
          <div className="w-full max-w-md rounded-2xl border border-border bg-card p-5 shadow-2xl">
            <h2 className="text-lg font-bold text-foreground">Delete listing?</h2>
            <p className="mt-2 text-sm text-muted-foreground">
              {confirmingDelete.hasReferences
                ? "This product is referenced by existing store records, so it will be archived and unpublished instead of permanently deleted."
                : "This product has no order history and can be permanently deleted."}
            </p>
            <div className="mt-5 flex justify-end gap-3">
              <button onClick={() => setConfirmingDelete(null)} className="h-10 rounded-xl border border-border px-4 text-sm font-semibold">Cancel</button>
              <button onClick={deleteProduct} className="h-10 rounded-xl bg-destructive px-4 text-sm font-semibold text-destructive-foreground">Confirm</button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}

function AdminProductImage({ product }: { product: AdminProduct }) {
  const [imageSrc, setImageSrc] = useState(product.primaryImageUrl || product.images[0]?.url || fallbackProductImage(product));

  useEffect(() => {
    setImageSrc(product.primaryImageUrl || product.images[0]?.url || fallbackProductImage(product));
  }, [product]);

  return (
    <img
      src={imageSrc}
      alt={product.name}
      className="h-16 w-16 rounded-xl bg-secondary object-cover"
      onError={() => {
        const fallback = fallbackProductImage(product);
        if (imageSrc !== fallback) setImageSrc(fallback);
      }}
    />
  );
}
