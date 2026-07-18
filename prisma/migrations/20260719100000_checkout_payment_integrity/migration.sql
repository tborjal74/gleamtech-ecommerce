CREATE TYPE "PaymentMethod" AS ENUM ('GCASH', 'BANK_TRANSFER');

ALTER TABLE "Order"
ADD COLUMN "paymentMethod" "PaymentMethod" NOT NULL DEFAULT 'GCASH',
ADD COLUMN "discountMinor" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN "promoCode" TEXT,
ADD COLUMN "promoPercentOff" INTEGER;

CREATE TABLE "PaymentSubmission" (
    "id" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "method" "PaymentMethod" NOT NULL,
    "reference" TEXT NOT NULL,
    "proof" BYTEA NOT NULL,
    "proofMimeType" TEXT NOT NULL,
    "proofSizeBytes" INTEGER NOT NULL,
    "proofOriginalName" TEXT NOT NULL,
    "submittedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PaymentSubmission_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "PaymentSubmission_orderId_key" ON "PaymentSubmission"("orderId");
CREATE INDEX "PaymentSubmission_submittedAt_idx" ON "PaymentSubmission"("submittedAt");

ALTER TABLE "PaymentSubmission"
ADD CONSTRAINT "PaymentSubmission_orderId_fkey"
FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE CASCADE ON UPDATE CASCADE;

UPDATE "HomepageContent"
SET
  "promoHeadline" = 'Save with verified promo codes',
  "promoText" = 'Apply an eligible promo code in your cart. Your discount is verified again when the order is placed.'
WHERE "promoHeadline" = 'Bundle & Save up to 30%'
  AND "promoText" = 'Mix and match any 3 products and get 30% off.';
