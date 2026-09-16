-- AlterTable
ALTER TABLE "Survey"
  ADD COLUMN "themeColor" TEXT NOT NULL DEFAULT '#171717',
  ADD COLUMN "backgroundColor" TEXT NOT NULL DEFAULT '#fafafa',
  ADD COLUMN "fontFamily" TEXT NOT NULL DEFAULT 'sans',
  ADD COLUMN "logoUrl" TEXT,
  ADD COLUMN "welcomeEnabled" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "welcomeTitle" TEXT,
  ADD COLUMN "welcomeText" TEXT,
  ADD COLUMN "welcomeButtonLabel" TEXT,
  ADD COLUMN "thankYouTitle" TEXT,
  ADD COLUMN "thankYouText" TEXT;
