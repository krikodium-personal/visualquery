-- AlterTable
ALTER TABLE "Survey" ADD COLUMN "customVariables" JSONB NOT NULL DEFAULT '[]';

-- AlterTable
ALTER TABLE "Response" ADD COLUMN "disqualified" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN "variables" JSONB;
