import type { Cart, CartItem, Inventory, Product } from '@prisma/client';

import { minorToAmount } from '../common/money.js';

type CartWithItems = Cart & {
  items: Array<CartItem & { product: Product & { inventory: Inventory | null } }>;
};

export function presentCart(cart: CartWithItems) {
  const items = cart.items.map(item => {
    const lineTotalMinor = item.product.priceMinor * item.quantity;
    return {
      productId: item.productId,
      sku: item.product.sku,
      productName: item.product.name,
      unitPrice: minorToAmount(item.product.priceMinor),
      quantity: item.quantity,
      size: item.size,
      lineTotal: minorToAmount(lineTotalMinor),
      availableQuantity: item.product.inventory?.stockQuantity ?? 0,
      product: {
        id: item.product.id,
        sku: item.product.sku,
        name: item.product.name,
        shortDesc: item.product.shortDescription,
        price: minorToAmount(item.product.priceMinor),
        originalPrice: item.product.originalPriceMinor
          ? minorToAmount(item.product.originalPriceMinor)
          : undefined,
        rating: item.product.rating,
        reviewCount: item.product.reviewCount,
        category: item.product.category,
        brand: item.product.brand,
        scent: item.product.scent ?? undefined,
        isEco: item.product.isEco,
        inStock: item.product.active && (item.product.inventory?.stockQuantity ?? 0) > 0,
        image: item.product.image,
        badge: item.product.badge ?? undefined,
        sizes: item.product.sizes,
        tags: item.product.tags,
      },
    };
  });
  const subtotalMinor = cart.items.reduce(
    (sum, item) => sum + item.product.priceMinor * item.quantity,
    0,
  );

  return {
    id: cart.id,
    items,
    subtotal: minorToAmount(subtotalMinor),
  };
}
