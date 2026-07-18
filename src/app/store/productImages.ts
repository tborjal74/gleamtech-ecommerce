import type { Product } from "./types";

export type ProductImageLike = Pick<Product, "name"> & {
  sku?: string;
  image?: string;
};

const asset = (filename: string) => new URL(`../../../assets/${filename}`, import.meta.url).href;

const fallbackImages = [
  { match: ["BLISSBRIGHT"], image: "blissbright.webp" },
  { match: ["GLEAMFRESH"], image: "gleamfresh.webp" },
  { match: ["GLEAMGLOW"], image: "gleamglow.webp" },
  { match: ["GLEAMHUSH", "HANDSOAP", "HAND-SOAP"], image: "gleamhush.webp" },
  { match: ["GLEAMKISS"], image: "gleamkiss.webp" },
  { match: ["GLEAMWHITE"], image: "gleamwhite.webp" },
  { match: ["KALAMANSI"], image: "puregleam-kalamansi.webp" },
  { match: ["PUREGLEAM", "LEMON", "DISHWASHING-LEMON"], image: "puregleam-lemon.webp" },
  { match: ["ULTRABRIGHT", "COLOR-BLEACH", "COLOR SAFE BLEACH"], image: "ultrabright.webp" },
  { match: ["WHITELUSH", "ACTIVE-BLEACH"], image: "whitelush.webp" },
];

export function assetProductImage(product: ProductImageLike): string | undefined {
  const haystack = `${product.sku ?? ""} ${product.name}`.toUpperCase().replace(/[^A-Z0-9]/g, "");
  const match = fallbackImages.find(item => item.match.some(value => haystack.includes(value.replace(/[^A-Z0-9]/g, ""))));
  return match ? asset(match.image) : undefined;
}

export function fallbackProductImage(product: ProductImageLike): string {
  return assetProductImage(product) ?? asset("gleamfresh.webp");
}
