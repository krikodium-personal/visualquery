import type { AnalysisQuestion, AnalysisResponse, AnalysisAnswerValue } from "@/lib/analysis";

function csvEscape(value: string): string {
  if (/[",\n\r]/.test(value)) return `"${value.replace(/"/g, '""')}"`;
  return value;
}

function formatAnswer(value: AnalysisAnswerValue, question: AnalysisQuestion): string {
  if (value === null || value === "") return "";
  const labels = new Map(question.options.map((option) => [option.value, option.label]));
  if (typeof value === "string") return labels.get(value) ?? value;
  if (typeof value === "number") return String(value);
  if (Array.isArray(value)) return value.map((entry) => labels.get(entry) ?? entry).join("; ");
  return Object.entries(value)
    .map(([key, entry]) => `${labels.get(key) ?? key}: ${labels.get(String(entry)) ?? entry}`)
    .join("; ");
}

/** Build a CSV string of filtered responses (one row per response). */
export function buildResponsesCsv(
  questions: AnalysisQuestion[],
  responses: AnalysisResponse[],
): string {
  const headers = [
    "response_id",
    "started_at",
    "completed_at",
    "status",
    ...questions.map((question) => `Q${question.index}: ${question.title}`),
  ];

  const lines = [headers.map(csvEscape).join(",")];

  for (const response of responses) {
    const byQuestion = new Map(response.answers.map((answer) => [answer.questionId, answer.value]));
    const cells = [
      response.id,
      response.startedAt,
      response.completedAt ?? "",
      response.completedAt ? "completada" : "parcial",
      ...questions.map((question) =>
        formatAnswer(byQuestion.get(question.id) ?? null, question),
      ),
    ];
    lines.push(cells.map((cell) => csvEscape(String(cell))).join(","));
  }

  return `\uFEFF${lines.join("\n")}`;
}

export function downloadCsv(filename: string, contents: string) {
  const blob = new Blob([contents], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}
