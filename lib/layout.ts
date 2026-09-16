import { computeQuestionCodes } from "./question-codes";

export interface LayoutQuestion {
  id: string;
  isRoot: boolean;
  options?: { value: string }[];
  /** Measured card height, when the canvas already rendered it. */
  height?: number;
}

export interface LayoutEdge {
  sourceQuestionId: string;
  targetQuestionId: string;
  sourceOptionValue: string | null;
}

export interface NodePosition {
  x: number;
  y: number;
}

const COLUMN_WIDTH = 320;
const VERTICAL_GAP = 48;
const DEFAULT_CARD_HEIGHT = 170;

/**
 * A question's column is how deep in branches it is, which is exactly what its
 * code already says: "2" is the main sequence, "1a" is one branch in, "1ab" is
 * a branch of a branch. Deriving it from the code keeps the layout and the
 * numbering telling the same story — in particular, when branches converge
 * back into the main sequence, that question returns to the main column.
 */
function columnOfCode(code: string | undefined): number {
  return code ? code.replace(/[^a-z]/g, "").length : 0;
}

/**
 * Lays the survey out as a vertical flow:
 * - the main sequence runs straight down a single column (1 above 2 above 3...)
 * - the branches of a question sit in the column to its right, stacked one
 *   above the other in the order of its options — so two branches read as a
 *   pair next to their question, and the canvas only grows sideways with
 *   branch nesting, never with survey length
 * - the next question in the main sequence drops below the whole branch group,
 *   so the flow always reads top to bottom
 *
 * Card heights are used when the canvas has measured them, so a question with
 * many options never overlaps the one below it.
 *
 * Only runs when the editor explicitly asks for it (the "Alinear" button) —
 * adding a question never re-arranges the cards already on the canvas.
 */
export function computeLayout(
  questions: LayoutQuestion[],
  edges: LayoutEdge[],
): Map<string, NodePosition> {
  const outgoingByQuestion = new Map<string, LayoutEdge[]>();
  for (const edge of edges) {
    const list = outgoingByQuestion.get(edge.sourceQuestionId) ?? [];
    list.push(edge);
    outgoingByQuestion.set(edge.sourceQuestionId, list);
  }

  const questionById = new Map(questions.map((q) => [q.id, q]));
  const heightOf = (id: string) => questionById.get(id)?.height ?? DEFAULT_CARD_HEIGHT;

  const codes = computeQuestionCodes(
    questions.map((q) => ({ id: q.id, isRoot: q.isRoot, options: q.options ?? [] })),
    edges,
  );
  const columnOf = (id: string) => columnOfCode(codes.get(id));

  // How many not-yet-placed predecessors each question still has, so a
  // question that several branches converge on waits for the last of them
  // instead of splitting the group.
  const pending = new Map<string, number>();
  for (const edge of edges) {
    if (!questionById.has(edge.targetQuestionId)) continue;
    pending.set(edge.targetQuestionId, (pending.get(edge.targetQuestionId) ?? 0) + 1);
  }

  const targetIds = new Set(edges.map((e) => e.targetQuestionId));
  const roots = [
    ...questions.filter((q) => q.isRoot),
    ...questions.filter((q) => !q.isRoot && !targetIds.has(q.id)),
  ];

  const positions = new Map<string, NodePosition>();
  const columnNextY = new Map<number, number>();
  let bottom = 0; // lowest point used so far, across every column

  function place(questionId: string, desiredY: number) {
    if (positions.has(questionId) || !questionById.has(questionId)) return;

    const column = columnOf(questionId);
    const y = Math.max(desiredY, columnNextY.get(column) ?? 0);
    positions.set(questionId, { x: column * COLUMN_WIDTH, y });

    const nextY = y + heightOf(questionId) + VERTICAL_GAP;
    columnNextY.set(column, nextY);
    bottom = Math.max(bottom, nextY);

    const outgoing = outgoingByQuestion.get(questionId) ?? [];
    const defaultEdge = outgoing.find((e) => e.sourceOptionValue === null);
    const branchEdges = outgoing.filter((e) => e.sourceOptionValue !== null);

    // Branches follow the order of the question's own options, so the visual
    // stacking matches the "a, b, c..." codes.
    const optionOrder = questionById.get(questionId)?.options?.map((o) => o.value) ?? [];
    branchEdges.sort(
      (a, b) => optionOrder.indexOf(a.sourceOptionValue!) - optionOrder.indexOf(b.sourceOptionValue!),
    );

    const ready = (edge: LayoutEdge) => {
      const remaining = (pending.get(edge.targetQuestionId) ?? 1) - 1;
      pending.set(edge.targetQuestionId, remaining);
      return remaining <= 0;
    };

    // Branches first: to the right, starting level with their question.
    for (const edge of branchEdges) {
      if (ready(edge)) place(edge.targetQuestionId, y);
    }

    // Then the flow continues below everything placed so far.
    if (defaultEdge && ready(defaultEdge)) {
      place(defaultEdge.targetQuestionId, bottom);
    }
  }

  roots.forEach((root) => place(root.id, bottom));
  // Anything left over (unreachable, or stuck behind a cycle) still gets a spot.
  for (const question of questions) place(question.id, bottom);

  return positions;
}

/**
 * Picks a spot for a single new card without touching anything already on the
 * canvas: below its source for a "next" question, to the right of it for a
 * branch, sliding further down while that spot is taken.
 */
export function placeNewQuestion(
  source: (NodePosition & { height?: number }) | null,
  isBranch: boolean,
  occupied: NodePosition[],
): NodePosition {
  if (!source) return { x: 0, y: 0 };

  const candidate = isBranch
    ? { x: source.x + COLUMN_WIDTH, y: source.y }
    : { x: source.x, y: source.y + (source.height ?? DEFAULT_CARD_HEIGHT) + VERTICAL_GAP };

  const overlaps = (pos: NodePosition) =>
    occupied.some(
      (o) => Math.abs(o.x - pos.x) < COLUMN_WIDTH * 0.5 && Math.abs(o.y - pos.y) < VERTICAL_GAP * 2,
    );

  while (overlaps(candidate)) {
    candidate.y += DEFAULT_CARD_HEIGHT + VERTICAL_GAP;
  }

  return candidate;
}
