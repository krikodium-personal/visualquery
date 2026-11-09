-- Design: how respondents advance between questions
ALTER TABLE "Survey" ADD COLUMN "advanceMode" TEXT NOT NULL DEFAULT 'button';
