ALTER TABLE "Order" ADD COLUMN "paidConfirmationEmailSentAt" TIMESTAMP(3);
ALTER TABLE "Order" ADD COLUMN "paidConfirmationEmailLastError" TEXT;
