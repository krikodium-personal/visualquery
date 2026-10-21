import {
  resolveNextQuestionId,
  type AnswerValue,
  type FlowEdge,
} from "@/lib/flow-engine";
import type {
  AnalysisAnswerValue,
  AnalysisQuestion,
  AnalysisResponse,
} from "@/lib/analysis";

export const FLOW_START_ID = "__start__";
export const FLOW_COMPLETE_ID = "__complete__";
export const FLOW_DROPOUT_ID = "__dropout__";

export type FlowNodeKind = "start" | "question" | "complete" | "dropout";

export type ResponseFlowNode = {
  id: string;
  name: string;
  kind: FlowNodeKind;
  count: number;
};

export type ResponseFlowLink = {
  source: number;
  target: number;
  value: number;
  sourceId: string;
  targetId: string;
  label?: string;
};

export type ResponseFlowGraph = {
  nodes: ResponseFlowNode[];
  links: ResponseFlowLink[];
  completedCount: number;
  dropoutCount: number;
  totalResponses: number;
};

function toAnswerValue(value: AnalysisAnswerValue): AnswerValue | undefined {
  if (value === null || value === "") return undefined;
  return value as AnswerValue;
}

function findRootQuestionId(questions: AnalysisQuestion[], edges: FlowEdge[]): string | null {
  const rooted = questions.find((question) => question.isRoot);
  if (rooted) return rooted.id;

  const targets = new Set(edges.map((edge) => edge.targetQuestionId));
  const entry = questions.find((question) => !targets.has(question.id));
  return entry?.id ?? questions[0]?.id ?? null;
}

function optionLabel(
  question: AnalysisQuestion | undefined,
  optionValue: string | null,
): string | undefined {
  if (!question || optionValue === null) return undefined;
  return question.options.find((option) => option.value === optionValue)?.label ?? optionValue;
}

function matchesOption(answer: AnswerValue, optionValue: string): boolean {
  if (Array.isArray(answer)) return answer.includes(optionValue);
  if (typeof answer === "object") {
    return Object.values(answer).some((value) => String(value) === optionValue);
  }
  return String(answer) === optionValue;
}

function matchingBranchLabel(
  questionId: string,
  answer: AnswerValue | undefined,
  edges: FlowEdge[],
  questionsById: Map<string, AnalysisQuestion>,
): string | undefined {
  if (answer === undefined) return undefined;
  const branch = edges.find(
    (edge) =>
      edge.sourceQuestionId === questionId &&
      edge.sourceOptionValue !== null &&
      matchesOption(answer, edge.sourceOptionValue),
  );
  if (!branch) return undefined;
  return optionLabel(questionsById.get(questionId), branch.sourceOptionValue);
}

/**
 * Reconstructs each respondent's path through the survey graph and aggregates
 * it into Sankey nodes/links (including Completada / Abandono sinks).
 */
export function buildResponseFlowGraph(
  questions: AnalysisQuestion[],
  edges: FlowEdge[],
  responses: AnalysisResponse[],
): ResponseFlowGraph {
  const questionsById = new Map(questions.map((question) => [question.id, question]));
  const rootId = findRootQuestionId(questions, edges);

  const nodeCounts = new Map<string, number>();
  const linkCounts = new Map<
    string,
    { sourceId: string; targetId: string; label?: string; value: number }
  >();

  function bumpNode(id: string) {
    nodeCounts.set(id, (nodeCounts.get(id) ?? 0) + 1);
  }

  function bumpLink(sourceId: string, targetId: string, label?: string) {
    const key = `${sourceId}→${targetId}::${label ?? ""}`;
    const existing = linkCounts.get(key);
    if (existing) {
      existing.value += 1;
      return;
    }
    linkCounts.set(key, { sourceId, targetId, label, value: 1 });
  }

  let completedCount = 0;
  let dropoutCount = 0;

  for (const response of responses) {
    bumpNode(FLOW_START_ID);

    if (!rootId) {
      bumpNode(FLOW_DROPOUT_ID);
      bumpLink(FLOW_START_ID, FLOW_DROPOUT_ID);
      dropoutCount += 1;
      continue;
    }

    const answersByQuestion = new Map(
      response.answers.map((answer) => [answer.questionId, answer.value]),
    );

    let currentId: string | null = rootId;
    let previousId = FLOW_START_ID;
    let pendingLabel: string | undefined;
    const seen = new Set<string>();
    let finished = false;

    while (currentId && !seen.has(currentId)) {
      seen.add(currentId);
      bumpNode(currentId);
      bumpLink(previousId, currentId, pendingLabel);
      pendingLabel = undefined;

      const answer = toAnswerValue(answersByQuestion.get(currentId) ?? null);
      if (answer === undefined) {
        bumpNode(FLOW_DROPOUT_ID);
        bumpLink(currentId, FLOW_DROPOUT_ID);
        dropoutCount += 1;
        finished = true;
        break;
      }

      const branchLabel = matchingBranchLabel(currentId, answer, edges, questionsById);
      const nextId = resolveNextQuestionId(currentId, answer, edges);

      if (nextId === null) {
        if (response.completedAt) {
          bumpNode(FLOW_COMPLETE_ID);
          bumpLink(currentId, FLOW_COMPLETE_ID, branchLabel);
          completedCount += 1;
        } else {
          bumpNode(FLOW_DROPOUT_ID);
          bumpLink(currentId, FLOW_DROPOUT_ID, branchLabel);
          dropoutCount += 1;
        }
        finished = true;
        break;
      }

      previousId = currentId;
      pendingLabel = branchLabel;
      currentId = nextId;
    }

    if (!finished) {
      const lastId = previousId === FLOW_START_ID ? rootId : previousId;
      bumpNode(FLOW_DROPOUT_ID);
      bumpLink(lastId, FLOW_DROPOUT_ID);
      dropoutCount += 1;
    }
  }

  const nodeOrder: string[] = [];
  const ensureNode = (id: string) => {
    if (!nodeOrder.includes(id) && (nodeCounts.get(id) ?? 0) > 0) nodeOrder.push(id);
  };

  ensureNode(FLOW_START_ID);
  for (const question of questions) ensureNode(question.id);
  ensureNode(FLOW_COMPLETE_ID);
  ensureNode(FLOW_DROPOUT_ID);

  const nodes: ResponseFlowNode[] = nodeOrder.map((id) => {
    const count = nodeCounts.get(id) ?? 0;
    if (id === FLOW_START_ID) {
      return { id, name: "Inicio", kind: "start", count };
    }
    if (id === FLOW_COMPLETE_ID) {
      return { id, name: "Completada", kind: "complete", count };
    }
    if (id === FLOW_DROPOUT_ID) {
      return { id, name: "Abandono", kind: "dropout", count };
    }
    const question = questionsById.get(id);
    const title = question?.title?.trim() || "Pregunta";
    const short = title.length > 36 ? `${title.slice(0, 34)}…` : title;
    return {
      id,
      name: question ? `Q${question.index}: ${short}` : short,
      kind: "question" as const,
      count,
    };
  });

  const indexById = new Map(nodes.map((node, index) => [node.id, index]));

  const links: ResponseFlowLink[] = [];
  for (const link of linkCounts.values()) {
    const source = indexById.get(link.sourceId);
    const target = indexById.get(link.targetId);
    if (source === undefined || target === undefined || link.value <= 0) continue;
    links.push({
      source,
      target,
      value: link.value,
      sourceId: link.sourceId,
      targetId: link.targetId,
      label: link.label,
    });
  }
  links.sort((a, b) => b.value - a.value);

  return {
    nodes,
    links,
    completedCount,
    dropoutCount,
    totalResponses: responses.length,
  };
}
