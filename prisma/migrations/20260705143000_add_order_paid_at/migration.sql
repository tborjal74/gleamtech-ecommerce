ALTER TABLE "Order" ADD COLUMN "paidAt" TIMESTAMP(3);

UPDATE "Order"
SET "paidAt" = COALESCE("paidConfirmationEmailSentAt", "updatedAt", "createdAt")
WHERE "paymentStatus" = 'PAID';

CREATE INDEX "Order_paidAt_idx" ON "Order"("paidAt");
