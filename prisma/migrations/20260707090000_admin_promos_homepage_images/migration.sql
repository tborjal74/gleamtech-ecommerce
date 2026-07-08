ALTER TABLE "ProductImage"
ADD COLUMN "sortOrder" INTEGER NOT NULL DEFAULT 0;

CREATE TABLE "PromoCode" (
  "id" TEXT NOT NULL,
  "code" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "description" TEXT,
  "percentOff" INTEGER NOT NULL,
  "active" BOOLEAN NOT NULL DEFAULT true,
  "startsAt" TIMESTAMP(3),
  "endsAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  "createdById" TEXT,
  "updatedById" TEXT,
  CONSTRAINT "PromoCode_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "HomepageContent" (
  "id" TEXT NOT NULL DEFAULT 'home',
  "eyebrow" TEXT NOT NULL DEFAULT 'Gleamtech Essentials',
  "headline" TEXT NOT NULL DEFAULT 'Everyday clean, elevated',
  "subheadline" TEXT NOT NULL DEFAULT 'Powerful cleaning products for every room, backed by secure checkout and fast Gleamtech delivery.',
  "primaryCta" TEXT NOT NULL DEFAULT 'Shop Now',
  "secondaryCta" TEXT NOT NULL DEFAULT 'View Bundles',
  "heroImage" TEXT NOT NULL DEFAULT '/assets/hero-image-1.png',
  "subHeroImageLeft" TEXT NOT NULL DEFAULT '/assets/sub-hero-image-2.png',
  "subHeroImageRight" TEXT NOT NULL DEFAULT '/assets/sub-hero-image-3.png',
  "promoLabel" TEXT NOT NULL DEFAULT 'Limited Time',
  "promoHeadline" TEXT NOT NULL DEFAULT 'Bundle & Save up to 30%',
  "promoText" TEXT NOT NULL DEFAULT 'Mix and match any 3 products and get 30% off.',
  "promiseOneTitle" TEXT NOT NULL DEFAULT 'Powerful Clean, Naturally',
  "promiseOneText" TEXT NOT NULL DEFAULT 'Plant-powered formulas that tackle grease, grime, and everyday messes without harsh chemicals',
  "promiseTwoTitle" TEXT NOT NULL DEFAULT 'Satisfaction Guaranteed',
  "promiseTwoText" TEXT NOT NULL DEFAULT 'Love your Gleamtech clean, or we''ll make it right with friendly support and easy resolutions',
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedById" TEXT,
  CONSTRAINT "HomepageContent_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "PromoCode_code_key" ON "PromoCode"("code");
CREATE INDEX "ProductImage_sortOrder_idx" ON "ProductImage"("sortOrder");
CREATE INDEX "PromoCode_active_idx" ON "PromoCode"("active");
CREATE INDEX "PromoCode_startsAt_idx" ON "PromoCode"("startsAt");
CREATE INDEX "PromoCode_endsAt_idx" ON "PromoCode"("endsAt");
CREATE INDEX "PromoCode_createdById_idx" ON "PromoCode"("createdById");
CREATE INDEX "PromoCode_updatedById_idx" ON "PromoCode"("updatedById");
CREATE INDEX "HomepageContent_updatedById_idx" ON "HomepageContent"("updatedById");

ALTER TABLE "PromoCode"
ADD CONSTRAINT "PromoCode_createdById_fkey"
FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "PromoCode"
ADD CONSTRAINT "PromoCode_updatedById_fkey"
FOREIGN KEY ("updatedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "HomepageContent"
ADD CONSTRAINT "HomepageContent_updatedById_fkey"
FOREIGN KEY ("updatedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

INSERT INTO "HomepageContent" ("id")
VALUES ('home')
ON CONFLICT ("id") DO NOTHING;
