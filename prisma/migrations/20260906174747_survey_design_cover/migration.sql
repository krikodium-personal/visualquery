-- AlterTable
ALTER TABLE "Survey"
  ADD COLUMN "backgroundImageUrl" TEXT,
  ADD COLUMN "buttonShape" TEXT NOT NULL DEFAULT 'rounded',
  ADD COLUMN "logoPosition" TEXT NOT NULL DEFAULT 'top-center';
