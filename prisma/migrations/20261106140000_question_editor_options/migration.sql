-- SurveyMonkey-style question options (required message + randomize choices)
ALTER TABLE "Question" ADD COLUMN "requiredErrorMessage" TEXT;
ALTER TABLE "Question" ADD COLUMN "randomizeOptions" BOOLEAN NOT NULL DEFAULT false;
