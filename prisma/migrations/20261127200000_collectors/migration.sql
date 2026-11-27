-- CreateTable
CREATE TABLE "Collector" (
    "id" TEXT NOT NULL,
    "surveyId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" TEXT NOT NULL DEFAULT 'link',
    "slug" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'open',
    "accessPassword" TEXT,
    "responseLimit" INTEGER,
    "cutoffAt" TIMESTAMP(3),
    "endRedirectUrl" TEXT,
    "disqualifyMessage" TEXT,
    "disqualifyRedirectUrl" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Collector_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Collector_slug_key" ON "Collector"("slug");
CREATE INDEX "Collector_surveyId_idx" ON "Collector"("surveyId");

-- AddForeignKey
ALTER TABLE "Collector" ADD CONSTRAINT "Collector_surveyId_fkey" FOREIGN KEY ("surveyId") REFERENCES "Survey"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Every survey keeps its current public link as its first collector (same slug, same rules).
INSERT INTO "Collector" ("id", "surveyId", "name", "type", "slug", "status", "accessPassword", "responseLimit", "cutoffAt", "endRedirectUrl", "disqualifyMessage", "disqualifyRedirectUrl", "createdAt", "updatedAt")
SELECT gen_random_uuid()::text, "id", 'Enlace web 1', 'link', "slug", 'open', "accessPassword", "responseLimit", "cutoffAt", "endRedirectUrl", "disqualifyMessage", "disqualifyRedirectUrl", "createdAt", CURRENT_TIMESTAMP
FROM "Survey";

-- AlterTable: responses remember their collector
ALTER TABLE "Response" ADD COLUMN "collectorId" TEXT;
CREATE INDEX "Response_collectorId_idx" ON "Response"("collectorId");
ALTER TABLE "Response" ADD CONSTRAINT "Response_collectorId_fkey" FOREIGN KEY ("collectorId") REFERENCES "Collector"("id") ON DELETE SET NULL ON UPDATE CASCADE;
UPDATE "Response" r SET "collectorId" = c."id" FROM "Collector" c WHERE c."surveyId" = r."surveyId";

-- AlterTable
ALTER TABLE "Notification" ADD COLUMN "detail" TEXT;
