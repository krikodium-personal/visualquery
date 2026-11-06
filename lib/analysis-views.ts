import { z } from "zod";
import { EMPTY_FILTERS, type AnalysisFilterState } from "@/lib/analysis";

const questionFilterSchema = z.object({
  questionId: z.string(),
  values: z.array(z.string()),
});

const filterStateSchema = z.object({
  completeness: z.enum(["all", "completed", "partial"]),
  dateFrom: z.string(),
  dateTo: z.string(),
  questionFilters: z.array(questionFilterSchema),
});

const compareGroupSchema = z.object({
  id: z.string(),
  name: z.string().min(1).max(80),
  filters: filterStateSchema,
});

const analysisViewSchema = z.object({
  id: z.string(),
  name: z.string().min(1).max(80),
  filters: filterStateSchema,
  compareGroups: z.array(compareGroupSchema).max(6),
  createdAt: z.string(),
});

export type CompareGroup = z.infer<typeof compareGroupSchema>;
export type AnalysisView = z.infer<typeof analysisViewSchema>;

export function parseAnalysisViews(value: unknown): AnalysisView[] {
  const parsed = z.array(analysisViewSchema).safeParse(value);
  return parsed.success ? parsed.data : [];
}

export function createCompareGroup(name: string, filters: AnalysisFilterState = EMPTY_FILTERS): CompareGroup {
  return {
    id: `g_${Math.random().toString(36).slice(2, 9)}`,
    name,
    filters: structuredClone(filters),
  };
}

export function createAnalysisView(
  name: string,
  filters: AnalysisFilterState,
  compareGroups: CompareGroup[],
): AnalysisView {
  return {
    id: `v_${Math.random().toString(36).slice(2, 9)}`,
    name: name.trim(),
    filters: structuredClone(filters),
    compareGroups: structuredClone(compareGroups),
    createdAt: new Date().toISOString(),
  };
}
