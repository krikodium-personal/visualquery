-- Design: optional image for the final screen (card header or full background)
ALTER TABLE "Survey" ADD COLUMN "thankYouImageUrl" TEXT;
ALTER TABLE "Survey" ADD COLUMN "thankYouImageMode" TEXT NOT NULL DEFAULT 'header';
