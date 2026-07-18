import type { Product } from "./types";

type ProductImageLike = Pick<Product, "name"> & {
  sku?: string;
  image?: string;
};

const asset = (filename: string) => new URL(`../../../assets/${filename}`, import.meta.url).href;

const fallbackImages = [
  { match: ["BLISSBRIGHT"], image: "blissbright.png" },
  { match: ["GLEAMFRESH"], image: "gleamfresh.png" },
  { match: ["GLEAMGLOW"], image: "gleamglow.png" },
  { match: ["GLEAMHUSH", "HANDSOAP", "HAND-SOAP"], image: "gleamhush.png" },
  { match: ["GLEAMKISS"], image: "gleamkiss.png" },
  { match: ["GLEAMWHITE"], image: "gleamwhite.png" },
  { match: ["KALAMANSI"], image: "puregleam-kalamansi.png" },
  { match: ["PUREGLEAM", "LEMON", "DISHWASHING-LEMON"], image: "puregleam-lemon.png" },
  { match: ["ULTRABRIGHT", "COLOR-BLEACH", "COLOR SAFE BLEACH"], image: "ultrabright.png" },
  { match: ["WHITELUSH", "ACTIVE-BLEACH"], image: "whitelush.png" },
];

export function assetProductImage(product: ProductImageLike): string | undefined {
  const haystack = `${product.sku ?? ""} ${product.name}`.toUpperCase().replace(/[^A-Z0-9]/g, "");
  const match = fallbackImages.find(item => item.match.some(value => haystack.includes(value.replace(/[^A-Z0-9]/g, ""))));
  return match ? asset(match.image) : undefined;
}

export function fallbackProductImage(product: ProductImageLike): string {
  return assetProductImage(product) ?? asset("gleamfresh.png");
}
