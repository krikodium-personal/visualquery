-- AlterTable
ALTER TABLE "Survey" ADD COLUMN "progressPosition" TEXT NOT NULL DEFAULT 'top',
ADD COLUMN "showTitle" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN "showQuestionNumbers" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN "showRequiredAsterisk" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE "SurveyComment" (
    "id" TEXT NOT NULL,
    "surveyId" TEXT NOT NULL,
    "questionId" TEXT,
    "authorId" TEXT NOT NULL,
    "parentId" TEXT,
    "body" TEXT NOT NULL,
    "resolvedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SurveyComment_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "SurveyComment_surveyId_questionId_idx" ON "SurveyComment"("surveyId", "questionId");

-- AddForeignKey
ALTER TABLE "SurveyComment" ADD CONSTRAINT "SurveyComment_surveyId_fkey" FOREIGN KEY ("surveyId") REFERENCES "Survey"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SurveyComment" ADD CONSTRAINT "SurveyComment_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SurveyComment" ADD CONSTRAINT "SurveyComment_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "SurveyComment"("id") ON DELETE CASCADE ON UPDATE CASCADE;
