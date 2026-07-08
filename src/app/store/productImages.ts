import type { Product } from "./types";

type ProductImageLike = Pick<Product, "name"> & {
  sku?: string;
  image?: string;
};

const asset = (filename: string) => new URL(`../../../assets/${filename}`, import.meta.url).href;

const fallbackImages = [
  { match: ["GLEAMHUSH", "HANDSOAP", "HAND-SOAP"], image: "gleamhush-handsoap.png" },
  { match: ["ULTRABRIGHT", "COLOR-BLEACH", "COLOR SAFE BLEACH"], image: "ultrabright-color-safe-bleach.png" },
  { match: ["WHITELUSH", "ACTIVE-BLEACH"], image: "whitelush-active-bleach.png" },
  { match: ["PUREGLEAM", "DISHWASHING-LEMON"], image: "puregleam-dishwashing-liquid-lemon.png" },
  { match: ["CAR-SHAMPOO", "CAR SHAMPOO"], image: "updated-car-shampoo.png" },
  { match: ["MULTI-PURPOSE", "MULTI PURPOSE"], image: "multi-purpose-cleaner.png" },
  { match: ["DISHWASHING"], image: "dishwashing-liquid-v3.png" },
  { match: ["LAUNDRY", "DETERGENT"], image: "laundry-liquid-detergent.png" },
  { match: ["FABRIC", "CONDITIONER"], image: "fabric-conditioner.png" },
];

export function fallbackProductImage(product: ProductImageLike): string {
  const haystack = `${product.sku ?? ""} ${product.name}`.toUpperCase();
  const fallback = fallbackImages.find(item => item.match.some(value => haystack.includes(value)));
  return asset(fallback?.image ?? "multi-purpose-cleaner.png");
}
