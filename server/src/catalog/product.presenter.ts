import type { Product, Inventory } from '@prisma/client';

import { minorToAmount } from '../common/money.js';

type ProductWithInventory = Product & { inventory: Inventory | null };

function presentImageUrl(productId: string, image: string) {
  return image.startsWith('/uploads/products/') ? `/api/products/${productId}/image` : image;
}

export function presentProduct(product: ProductWithInventory) {
  const availableQuantity = product.inventory?.stockQuantity ?? 0;

  return {
    id: product.id,
    sku: product.sku,
    name: product.name,
    shortDesc: product.shortDescription,
    description: product.description,
    price: minorToAmount(product.priceMinor),
    weightGrams: product.weightGrams,
    originalPrice: product.originalPriceMinor ? minorToAmount(product.originalPriceMinor) : undefined,
    rating: product.rating,
    reviewCount: product.reviewCount,
    category: product.category,
    brand: product.brand,
    scent: product.scent ?? undefined,
    isEco: product.isEco,
    inStock: product.active && availableQuantity > 0,
    availableQuantity,
    image: presentImageUrl(product.id, product.image),
    badge: product.badge ?? (availableQuantity <= 0 ? 'Out of Stock' : undefined),
    sizes: product.sizes,
    tags: product.tags,
  };
}
