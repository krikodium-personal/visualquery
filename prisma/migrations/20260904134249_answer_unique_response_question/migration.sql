-- DropIndex
DROP INDEX "Answer_responseId_idx";

-- CreateIndex
CREATE UNIQUE INDEX "Answer_responseId_questionId_key" ON "Answer"("responseId", "questionId");
