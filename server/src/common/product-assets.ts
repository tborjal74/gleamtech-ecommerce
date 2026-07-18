const PRODUCT_WEBP_ASSETS = [
  "blissbright.webp",
  "gleamfresh.webp",
  "gleamglow.webp",
  "gleamhush.webp",
  "gleamkiss.webp",
  "gleamwhite.webp",
  "puregleam-kalamansi.webp",
  "puregleam-lemon.webp",
  "ultrabright.webp",
  "whitelush.webp",
] as const;

export function canonicalProductImagePath(image: string): string {
  let pathname = image;
  try {
    pathname = new URL(image, "https://gleamtech.local").pathname;
  } catch {
    return image;
  }
  if (!pathname.startsWith("/assets/")) return image;

  let filename = pathname.split("/").pop() ?? "";
  try {
    filename = decodeURIComponent(filename);
  } catch {
    return image;
  }

  for (const canonicalName of PRODUCT_WEBP_ASSETS) {
    const stem = canonicalName.slice(0, -".webp".length);
    const isExactLegacyName = filename === `${stem}.png`;
    const isCanonicalName = filename === canonicalName;
    const isViteHashedName = filename.startsWith(`${stem}-`) && (filename.endsWith(".png") || filename.endsWith(".webp"));
    if (isExactLegacyName || isCanonicalName || isViteHashedName) return `/assets/${canonicalName}`;
  }
  return image;
}
