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
SET "image" = CASE
  WHEN "image" ~ '(^|/)assets/blissbright(-[A-Za-z0-9_-]+)?\.(png|webp)(\?.*)?$' THEN '/assets/blissbright.webp'
  WHEN "image" ~ '(^|/)assets/gleamfresh(-[A-Za-z0-9_-]+)?\.(png|webp)(\?.*)?$' THEN '/assets/gleamfresh.webp'
  WHEN "image" ~ '(^|/)assets/gleamglow(-[A-Za-z0-9_-]+)?\.(png|webp)(\?.*)?$' THEN '/assets/gleamglow.webp'
  WHEN "image" ~ '(^|/)assets/gleamhush(-[A-Za-z0-9_-]+)?\.(png|webp)(\?.*)?$' THEN '/assets/gleamhush.webp'
  WHEN "image" ~ '(^|/)assets/gleamkiss(-[A-Za-z0-9_-]+)?\.(png|webp)(\?.*)?$' THEN '/assets/gleamkiss.webp'
  WHEN "image" ~ '(^|/)assets/gleamwhite(-[A-Za-z0-9_-]+)?\.(png|webp)(\?.*)?$' THEN '/assets/gleamwhite.webp'
  WHEN "image" ~ '(^|/)assets/puregleam-kalamansi(-[A-Za-z0-9_-]+)?\.(png|webp)(\?.*)?$' THEN '/assets/puregleam-kalamansi.webp'
  WHEN "image" ~ '(^|/)assets/puregleam-lemon(-[A-Za-z0-9_-]+)?\.(png|webp)(\?.*)?$' THEN '/assets/puregleam-lemon.webp'
  WHEN "image" ~ '(^|/)assets/ultrabright(-[A-Za-z0-9_-]+)?\.(png|webp)(\?.*)?$' THEN '/assets/ultrabright.webp'
  WHEN "image" ~ '(^|/)assets/whitelush(-[A-Za-z0-9_-]+)?\.(png|webp)(\?.*)?$' THEN '/assets/whitelush.webp'
  ELSE "image"
END
WHERE "image" ~ '(^|/)assets/(blissbright|gleamfresh|gleamglow|gleamhush|gleamkiss|gleamwhite|puregleam-kalamansi|puregleam-lemon|ultrabright|whitelush)(-[A-Za-z0-9_-]+)?\.(png|webp)(\?.*)?$';
