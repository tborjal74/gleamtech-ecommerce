CREATE TABLE "OrderSequence" (
  "year" INTEGER NOT NULL,
  "nextValue" INTEGER NOT NULL,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "OrderSequence_pkey" PRIMARY KEY ("year")
);

INSERT INTO "OrderSequence" ("year", "nextValue", "updatedAt")
SELECT
  CAST(SUBSTRING("orderNumber" FROM '^SH-([0-9]{4})-') AS INTEGER) AS "year",
  COALESCE(MAX(CAST(SUBSTRING("orderNumber" FROM '^SH-[0-9]{4}-([0-9]+)$') AS INTEGER)), 0) AS "nextValue",
  NOW()
FROM "Order"
WHERE "orderNumber" ~ '^SH-[0-9]{4}-[0-9]+$'
GROUP BY CAST(SUBSTRING("orderNumber" FROM '^SH-([0-9]{4})-') AS INTEGER)
ON CONFLICT ("year") DO NOTHING;
