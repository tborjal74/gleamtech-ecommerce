CREATE TYPE "WholesaleAccountStatus" AS ENUM ('ACTIVE', 'ON_HOLD', 'CLOSED');
CREATE TYPE "WholesaleOrderStatus" AS ENUM ('DRAFT', 'CONFIRMED', 'PROCESSING', 'READY', 'SHIPPED', 'COMPLETED', 'CANCELLED');
CREATE TYPE "WholesalePaymentStatus" AS ENUM ('UNPAID', 'PARTIALLY_PAID', 'PAID', 'OVERDUE', 'VOID');

CREATE TABLE "WholesaleAccount" (
  "id" TEXT NOT NULL,
  "companyName" TEXT NOT NULL,
  "contactName" TEXT NOT NULL,
  "email" TEXT NOT NULL,
  "phone" TEXT NOT NULL,
  "taxId" TEXT,
  "billingAddress" TEXT NOT NULL,
  "shippingAddress" TEXT NOT NULL,
  "priceTier" TEXT NOT NULL DEFAULT 'STANDARD',
  "paymentTermDays" INTEGER NOT NULL DEFAULT 0,
  "creditLimitMinor" INTEGER NOT NULL DEFAULT 0,
  "minimumOrderMinor" INTEGER NOT NULL DEFAULT 0,
  "status" "WholesaleAccountStatus" NOT NULL DEFAULT 'ACTIVE',
  "notes" TEXT,
  "createdById" TEXT NOT NULL,
  "updatedById" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "WholesaleAccount_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "WholesaleOrder" (
  "id" TEXT NOT NULL,
  "orderNumber" TEXT NOT NULL,
  "accountId" TEXT NOT NULL,
  "purchaseOrderNumber" TEXT,
  "status" "WholesaleOrderStatus" NOT NULL DEFAULT 'DRAFT',
  "paymentStatus" "WholesalePaymentStatus" NOT NULL DEFAULT 'UNPAID',
  "paymentTermDays" INTEGER NOT NULL DEFAULT 0,
  "paymentDueAt" TIMESTAMP(3),
  "subtotalMinor" INTEGER NOT NULL,
  "discountMinor" INTEGER NOT NULL DEFAULT 0,
  "totalMinor" INTEGER NOT NULL,
  "notes" TEXT,
  "createdById" TEXT NOT NULL,
  "updatedById" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "WholesaleOrder_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "WholesaleOrderItem" (
  "id" TEXT NOT NULL,
  "orderId" TEXT NOT NULL,
  "productId" TEXT NOT NULL,
  "productName" TEXT NOT NULL,
  "productSku" TEXT NOT NULL,
  "unitPriceMinor" INTEGER NOT NULL,
  "quantity" INTEGER NOT NULL,
  "lineTotalMinor" INTEGER NOT NULL,
  CONSTRAINT "WholesaleOrderItem_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "WholesaleOrder_orderNumber_key" ON "WholesaleOrder"("orderNumber");
CREATE INDEX "WholesaleAccount_companyName_idx" ON "WholesaleAccount"("companyName");
CREATE INDEX "WholesaleAccount_email_idx" ON "WholesaleAccount"("email");
CREATE INDEX "WholesaleAccount_status_idx" ON "WholesaleAccount"("status");
CREATE INDEX "WholesaleOrder_accountId_idx" ON "WholesaleOrder"("accountId");
CREATE INDEX "WholesaleOrder_status_idx" ON "WholesaleOrder"("status");
CREATE INDEX "WholesaleOrder_paymentStatus_idx" ON "WholesaleOrder"("paymentStatus");
CREATE INDEX "WholesaleOrder_paymentDueAt_idx" ON "WholesaleOrder"("paymentDueAt");
CREATE INDEX "WholesaleOrder_createdAt_idx" ON "WholesaleOrder"("createdAt");
CREATE INDEX "WholesaleOrderItem_orderId_idx" ON "WholesaleOrderItem"("orderId");
CREATE INDEX "WholesaleOrderItem_productId_idx" ON "WholesaleOrderItem"("productId");

ALTER TABLE "WholesaleAccount" ADD CONSTRAINT "WholesaleAccount_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "WholesaleAccount" ADD CONSTRAINT "WholesaleAccount_updatedById_fkey" FOREIGN KEY ("updatedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "WholesaleOrder" ADD CONSTRAINT "WholesaleOrder_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "WholesaleAccount"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "WholesaleOrder" ADD CONSTRAINT "WholesaleOrder_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "WholesaleOrder" ADD CONSTRAINT "WholesaleOrder_updatedById_fkey" FOREIGN KEY ("updatedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "WholesaleOrderItem" ADD CONSTRAINT "WholesaleOrderItem_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "WholesaleOrder"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "WholesaleOrderItem" ADD CONSTRAINT "WholesaleOrderItem_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
