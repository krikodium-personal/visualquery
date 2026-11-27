-- These now live on "Collector" (copied by 20261127200000_collectors).
ALTER TABLE "Survey" DROP COLUMN "accessPassword",
DROP COLUMN "responseLimit",
DROP COLUMN "cutoffAt",
DROP COLUMN "endRedirectUrl",
DROP COLUMN "disqualifyMessage",
DROP COLUMN "disqualifyRedirectUrl";
