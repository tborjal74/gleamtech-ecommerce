CREATE TABLE "OrderSequence_new" (
  "key" TEXT NOT NULL,
  "nextValue" INTEGER NOT NULL,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "OrderSequence_new_pkey" PRIMARY KEY ("key")
);

INSERT INTO "OrderSequence_new" ("key", "nextValue", "updatedAt")
SELECT 'GT', COALESCE(MAX("nextValue"), 0), NOW()
FROM "OrderSequence"
HAVING COUNT(*) > 0;

DROP TABLE "OrderSequence";

ALTER TABLE "OrderSequence_new" RENAME TO "OrderSequence";
