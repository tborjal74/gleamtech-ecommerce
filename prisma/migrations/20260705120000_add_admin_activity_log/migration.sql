CREATE TABLE "AdminActivityLog" (
  "id" TEXT NOT NULL,
  "adminId" TEXT,
  "action" TEXT NOT NULL,
  "entityType" TEXT NOT NULL,
  "entityId" TEXT,
  "description" TEXT NOT NULL,
  "metadata" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "AdminActivityLog_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "AdminActivityLog_adminId_idx" ON "AdminActivityLog"("adminId");
CREATE INDEX "AdminActivityLog_action_idx" ON "AdminActivityLog"("action");
CREATE INDEX "AdminActivityLog_entityType_idx" ON "AdminActivityLog"("entityType");
CREATE INDEX "AdminActivityLog_createdAt_idx" ON "AdminActivityLog"("createdAt");

ALTER TABLE "AdminActivityLog"
ADD CONSTRAINT "AdminActivityLog_adminId_fkey"
FOREIGN KEY ("adminId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
