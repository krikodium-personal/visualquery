import { prisma } from "@/lib/prisma";
import { computeLayout } from "@/lib/layout";
import { slugify } from "@/lib/slug";
import { defaultRatingOptions } from "@/lib/rating-options";
import { nextGroupColor } from "@/lib/question-groups";
import {
  AI_BRANCHABLE_TYPES,
  AI_OPTION_TYPES,
  DISQUALIFY,
  END,
  MAX_AI_GROUPS,
  type AiSurvey,
} from "@/lib/ai/survey-schema";

type StoredOption = { value: string; label: string; kind?: string; action?: "end" | "disqualify" };

const shortId = () => Math.random().toString(36).slice(2, 8);

/** Turns a validated AI survey into a draft survey (questions, branches, groups, layout) and returns its id. */
export async function createDraftSurvey(ownerId: string, ai: AiSurvey): Promise<string> {
  const first = ai.firstQuestion;

  // Options get stable values; branches refer to them by the text the model copied.
  const optionsByKey = new Map<string, StoredOption[]>();
  for (const q of ai.questions) {
    if ((AI_OPTION_TYPES as readonly string[]).includes(q.type)) {
      optionsByKey.set(
        q.key,
        q.options.map((label, i) => ({ value: `opcion-${i + 1}-${shortId()}`, label: label.trim() })),
      );
    } else if (q.type === "rating") {
      optionsByKey.set(q.key, defaultRatingOptions() as StoredOption[]);
    } else if (q.type === "slider") {
      optionsByKey.set(q.key, [
        { value: "scale-left", label: "0", kind: "scale_left" },
        { value: "scale-center", label: "", kind: "scale_center" },
        { value: "scale-right", label: "100", kind: "scale_right" },
      ]);
    }
  }

  const edges: { source: string; target: string; optionValue: string | null }[] = [];
  for (const q of ai.questions) {
    if (q.next !== END) edges.push({ source: q.key, target: q.next, optionValue: null });
    if (!(AI_BRANCHABLE_TYPES as readonly string[]).includes(q.type)) continue;
    const options = optionsByKey.get(q.key) ?? [];
    for (const branch of q.branches) {
      const option = options.find((o) => o.label === branch.option.trim()) ?? options[q.options.indexOf(branch.option)];
      if (!option) continue;
      if (branch.goto === END) option.action = "end";
      else if (branch.goto === DISQUALIFY) option.action = "disqualify";
      else edges.push({ source: q.key, target: branch.goto, optionValue: option.value });
    }
  }

  // The canvas measures cards once rendered; here we only estimate their height from the options they list.
  const estimatedHeight = (key: string, type: string) => {
    const rows = (AI_OPTION_TYPES as readonly string[]).includes(type) ? (optionsByKey.get(key)?.length ?? 0) : 0;
    return 120 + rows * 26 + (type === "rating" || type === "slider" ? 30 : 0);
  };
  const positions = computeLayout(
    ai.questions.map((q) => ({
      id: q.key,
      isRoot: q.key === first,
      options: (optionsByKey.get(q.key) ?? []).map((o) => ({ value: o.value })),
      height: estimatedHeight(q.key, q.type),
    })),
    edges.map((e) => ({ sourceQuestionId: e.source, targetQuestionId: e.target, sourceOptionValue: e.optionValue })),
  );

  // Group boxes wrap their cards with padding and a header: leave room so neighbouring boxes do not overlap.
  const GROUP_GAP = 2 * 32 + 40;
  const groupOf = (key: string) => ai.questions.find((q) => q.key === key)?.group?.trim().toLowerCase() ?? null;
  let carried = 0;
  let previousGroup: string | null | undefined;
  for (const [key, position] of [...positions.entries()].sort((a, b) => a[1].y - b[1].y)) {
    const group = groupOf(key);
    if (previousGroup !== undefined && group !== previousGroup && (group || previousGroup)) carried += GROUP_GAP;
    previousGroup = group;
    positions.set(key, { x: position.x, y: position.y + carried });
  }

  const groupNames: string[] = [];
  for (const q of ai.questions) {
    const name = q.group?.trim();
    if (name && !groupNames.some((g) => g.toLowerCase() === name.toLowerCase()) && groupNames.length < MAX_AI_GROUPS) {
      groupNames.push(name);
    }
  }

  const title = ai.title.trim().slice(0, 120) || "Encuesta generada con IA";
  const slug = slugify(title);

  return prisma.$transaction(
    async (tx) => {
      const survey = await tx.survey.create({
        data: {
          ownerId,
          title,
          description: ai.description?.trim() || null,
          slug,
          collectors: { create: { name: "Enlace web 1", slug } },
        },
      });

      const groupIds = new Map<string, string>();
      const created: { color: string }[] = [];
      for (const name of groupNames) {
        const color = nextGroupColor(created);
        const group = await tx.questionGroup.create({ data: { surveyId: survey.id, name, color } });
        created.push({ color });
        groupIds.set(name.toLowerCase(), group.id);
      }

      const ids = new Map<string, string>();
      for (const q of ai.questions) {
        const position = positions.get(q.key) ?? { x: 0, y: 0 };
        const options = optionsByKey.get(q.key);
        const created = await tx.question.create({
          data: {
            surveyId: survey.id,
            type: q.type,
            title: q.title.trim(),
            description: q.description?.trim() || null,
            options: options ?? undefined,
            positionX: position.x,
            positionY: position.y,
            isRoot: q.key === first,
            required: q.required,
            groupId: q.group?.trim() ? (groupIds.get(q.group.trim().toLowerCase()) ?? null) : null,
          },
        });
        ids.set(q.key, created.id);
      }

      if (edges.length > 0) {
        await tx.edge.createMany({
          data: edges.map((e) => ({
            surveyId: survey.id,
            sourceQuestionId: ids.get(e.source)!,
            targetQuestionId: ids.get(e.target)!,
            sourceOptionValue: e.optionValue,
          })),
        });
      }
      return survey.id;
    },
    { timeout: 30_000 },
  );
}
