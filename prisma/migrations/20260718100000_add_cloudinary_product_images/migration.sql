ALTER TABLE "ProductImage"
ADD COLUMN "storageProvider" TEXT NOT NULL DEFAULT 'local',
ADD COLUMN "publicId" TEXT;

CREATE UNIQUE INDEX "ProductImage_publicId_key" ON "ProductImage"("publicId");
CREATE INDEX "ProductImage_storageProvider_idx" ON "ProductImage"("storageProvider");
