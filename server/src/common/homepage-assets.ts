type HomepageImages = {
  heroImage: string;
  subHeroImageLeft: string;
  subHeroImageRight: string;
};

const HOMEPAGE_WEBP_ASSETS = [
  "hero-image-1.webp",
  "sub-hero-image-2.webp",
  "sub-hero-image-3.webp",
] as const;

export function canonicalHomepageImagePath(image: string): string {
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

  for (const canonicalName of HOMEPAGE_WEBP_ASSETS) {
    const stem = canonicalName.slice(0, -".webp".length);
    const isExactLegacyName = filename === `${stem}.png`;
    const isCanonicalName = filename === canonicalName;
    const isViteHashedName = filename.startsWith(`${stem}-`) && (filename.endsWith(".png") || filename.endsWith(".webp"));
    if (isExactLegacyName || isCanonicalName || isViteHashedName) return `/assets/${canonicalName}`;
  }
  return image;
}

export function canonicalizeHomepageImages<T extends HomepageImages>(content: T): T {
  return {
    ...content,
    heroImage: canonicalHomepageImagePath(content.heroImage),
    subHeroImageLeft: canonicalHomepageImagePath(content.subHeroImageLeft),
    subHeroImageRight: canonicalHomepageImagePath(content.subHeroImageRight),
  };
}
