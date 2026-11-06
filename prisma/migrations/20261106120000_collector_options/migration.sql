-- AlterTable
ALTER TABLE "Survey" ADD COLUMN "accessPassword" TEXT;
ALTER TABLE "Survey" ADD COLUMN "responseLimit" INTEGER;
ALTER TABLE "Survey" ADD COLUMN "cutoffAt" TIMESTAMP(3);
