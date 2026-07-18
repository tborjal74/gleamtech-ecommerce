ALTER TABLE "HomepageContent"
  ALTER COLUMN "heroImage" SET DEFAULT '/assets/hero-image-1.webp',
  ALTER COLUMN "subHeroImageLeft" SET DEFAULT '/assets/sub-hero-image-2.webp',
  ALTER COLUMN "subHeroImageRight" SET DEFAULT '/assets/sub-hero-image-3.webp';

UPDATE "HomepageContent"
SET
  "heroImage" = CASE
    WHEN "heroImage" IN ('assets/hero-image-1.png', '/assets/hero-image-1.png')
      OR "heroImage" ~ '(^|/)assets/hero-image-1-[A-Za-z0-9_-]+\.(png|webp)(\?.*)?$'
      THEN '/assets/hero-image-1.webp'
    ELSE "heroImage"
  END,
  "subHeroImageLeft" = CASE
    WHEN "subHeroImageLeft" IN ('assets/sub-hero-image-2.png', '/assets/sub-hero-image-2.png')
      OR "subHeroImageLeft" ~ '(^|/)assets/sub-hero-image-2-[A-Za-z0-9_-]+\.(png|webp)(\?.*)?$'
      THEN '/assets/sub-hero-image-2.webp'
    ELSE "subHeroImageLeft"
  END,
  "subHeroImageRight" = CASE
    WHEN "subHeroImageRight" IN ('assets/sub-hero-image-3.png', '/assets/sub-hero-image-3.png')
      OR "subHeroImageRight" ~ '(^|/)assets/sub-hero-image-3-[A-Za-z0-9_-]+\.(png|webp)(\?.*)?$'
      THEN '/assets/sub-hero-image-3.webp'
    ELSE "subHeroImageRight"
  END;

UPDATE "Product"
SET "image" = regexp_replace("image", '\.png$', '.webp')
WHERE "image" IN (
  'assets/blissbright.png', '/assets/blissbright.png',
  'assets/gleamfresh.png', '/assets/gleamfresh.png',
  'assets/gleamglow.png', '/assets/gleamglow.png',
  'assets/gleamhush.png', '/assets/gleamhush.png',
  'assets/gleamkiss.png', '/assets/gleamkiss.png',
  'assets/gleamwhite.png', '/assets/gleamwhite.png',
  'assets/puregleam-kalamansi.png', '/assets/puregleam-kalamansi.png',
  'assets/puregleam-lemon.png', '/assets/puregleam-lemon.png',
  'assets/ultrabright.png', '/assets/ultrabright.png',
  'assets/whitelush.png', '/assets/whitelush.png'
);
