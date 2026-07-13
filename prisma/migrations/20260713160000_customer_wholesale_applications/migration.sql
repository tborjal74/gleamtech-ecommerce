CREATE TYPE "WholesaleApplicationStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

ALTER TABLE "WholesaleAccount" ADD COLUMN "discountPercent" INTEGER NOT NULL DEFAULT 0;

CREATE TABLE "WholesaleAccountMember" (
  "id" TEXT NOT NULL,
  "accountId" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "WholesaleAccountMember_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "WholesaleApplication" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "companyName" TEXT NOT NULL,
  "contactName" TEXT NOT NULL,
  "phone" TEXT NOT NULL,
  "taxId" TEXT,
  "billingAddress" TEXT NOT NULL,
  "shippingAddress" TEXT NOT NULL,
  "businessType" TEXT NOT NULL,
  "estimatedMonthlySpendMinor" INTEGER NOT NULL,
  "message" TEXT,
  "status" "WholesaleApplicationStatus" NOT NULL DEFAULT 'PENDING',
  "adminNote" TEXT,
  "reviewedById" TEXT,
  "reviewedAt" TIMESTAMP(3),
  "accountId" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "WholesaleApplication_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "WholesaleAccountMember_userId_key" ON "WholesaleAccountMember"("userId");
CREATE INDEX "WholesaleAccountMember_accountId_idx" ON "WholesaleAccountMember"("accountId");
CREATE UNIQUE INDEX "WholesaleApplication_userId_key" ON "WholesaleApplication"("userId");
CREATE INDEX "WholesaleApplication_status_idx" ON "WholesaleApplication"("status");
CREATE INDEX "WholesaleApplication_createdAt_idx" ON "WholesaleApplication"("createdAt");
CREATE INDEX "WholesaleApplication_accountId_idx" ON "WholesaleApplication"("accountId");

ALTER TABLE "WholesaleAccountMember" ADD CONSTRAINT "WholesaleAccountMember_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "WholesaleAccount"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "WholesaleAccountMember" ADD CONSTRAINT "WholesaleAccountMember_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "WholesaleApplication" ADD CONSTRAINT "WholesaleApplication_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "WholesaleApplication" ADD CONSTRAINT "WholesaleApplication_reviewedById_fkey" FOREIGN KEY ("reviewedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "WholesaleApplication" ADD CONSTRAINT "WholesaleApplication_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "WholesaleAccount"("id") ON DELETE SET NULL ON UPDATE CASCADE;
