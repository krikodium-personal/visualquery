export interface CodeQuestion {
  id: string;
  isRoot: boolean;
  options: { value: string }[];
}

export interface CodeEdge {
  sourceQuestionId: string;
  targetQuestionId: string;
  sourceOptionValue: string | null;
}

function letterFor(index: number): string {
  let n = index;
  let s = "";
  do {
    s = String.fromCharCode(97 + (n % 26)) + s;
    n = Math.floor(n / 26) - 1;
  } while (n >= 0);
  return s;
}

/**
 * Assigns a display code to each question.
 *
 * Numbers (1, 2, 3...) mark the shared sequence. A conditional branch off
 * question N gets a letter ("Na", "Nb"...), and questions that continue only
 * inside that branch get a numeric suffix ("Nb1", "Nb2"...). The shared
 * numbering resumes only at a real convergence: a question reachable from
 * every branch, or the explicit default/"next" route of the split.
 */
export function computeQuestionCodes(
  questions: CodeQuestion[],
  edges: CodeEdge[],
): Map<string, string> {
  const outgoingByQuestion = new Map<string, CodeEdge[]>();
  for (const edge of edges) {
    const list = outgoingByQuestion.get(edge.sourceQuestionId) ?? [];
    list.push(edge);
    outgoingByQuestion.set(edge.sourceQuestionId, list);
  }

  const questionById = new Map(questions.map((q) => [q.id, q]));
  const targetIds = new Set(edges.map((e) => e.targetQuestionId));
  // The real root is always numbered first; other disconnected questions
  // (no incoming edge, not flagged as root) still get their own number.
  const roots = [
    ...questions.filter((q) => q.isRoot),
    ...questions.filter((q) => !q.isRoot && !targetIds.has(q.id)),
  ];

  const codes = new Map<string, string>();
  const visited = new Set<string>();
  let nextMain = 0;
  const nextCode = () => String((nextMain += 1));

  function defaultEdgeOf(id: string): CodeEdge | undefined {
    return (outgoingByQuestion.get(id) ?? []).find((e) => e.sourceOptionValue === null);
  }

  function branchEdgesOf(id: string): CodeEdge[] {
    const branches = (outgoingByQuestion.get(id) ?? []).filter((e) => e.sourceOptionValue !== null);
    const optionOrder = questionById.get(id)?.options.map((o) => o.value) ?? [];
    branches.sort(
      (a, b) => optionOrder.indexOf(a.sourceOptionValue!) - optionOrder.indexOf(b.sourceOptionValue!),
    );
    return branches;
  }

  function distancesFrom(startId: string): Map<string, number> {
    const distances = new Map<string, number>([[startId, 0]]);
    const queue = [startId];

    while (queue.length > 0) {
      const id = queue.shift()!;
      const distance = distances.get(id)!;
      for (const edge of outgoingByQuestion.get(id) ?? []) {
        if (distances.has(edge.targetQuestionId)) continue;
        distances.set(edge.targetQuestionId, distance + 1);
        queue.push(edge.targetQuestionId);
      }
    }

    return distances;
  }

  /** Returns the closest node shared by every route after a split. */
  function commonConvergence(targetIds: string[], splitId: string): string | undefined {
    if (targetIds.length < 2) return undefined;
    const distances = targetIds.map(distancesFrom);
    const candidates = [...distances[0].keys()].filter(
      (id) => id !== splitId && distances.every((route) => route.has(id)),
    );

    candidates.sort((a, b) => {
      const aDistances = distances.map((route) => route.get(a)!);
      const bDistances = distances.map((route) => route.get(b)!);
      const maxDifference = Math.max(...aDistances) - Math.max(...bDistances);
      if (maxDifference !== 0) return maxDifference;
      return aDistances.reduce((sum, value) => sum + value, 0) -
        bDistances.reduce((sum, value) => sum + value, 0);
    });

    return candidates[0];
  }

  function walkBranchSequence(startId: string, prefix: string, stopId?: string) {
    let id: string | undefined = startId;
    let sequenceIndex = 0;

    while (id && id !== stopId && !visited.has(id)) {
      const code = sequenceIndex === 0 ? prefix : `${prefix}${sequenceIndex}`;
      visited.add(id);
      codes.set(id, code);

      const branches = branchEdgesOf(id);
      const defaultEdge = defaultEdgeOf(id);
      const localConvergence: string | undefined = defaultEdge?.targetQuestionId ??
        commonConvergence(branches.map((edge) => edge.targetQuestionId), id);

      branches.forEach((edge, index) => {
        walkBranchSequence(
          edge.targetQuestionId,
          `${code}${letterFor(index)}`,
          localConvergence ?? stopId,
        );
      });

      const continuation: string | undefined = localConvergence ?? defaultEdge?.targetQuestionId;
      if (!continuation || continuation === stopId) return;
      id = continuation;
      sequenceIndex += 1;
    }
  }

  function processRoot(rootId: string) {
    let id: string | undefined = rootId;

    while (id && !visited.has(id)) {
      const code = nextCode();
      visited.add(id);
      codes.set(id, code);

      const branches = branchEdgesOf(id);
      const defaultEdge = defaultEdgeOf(id);
      const convergence: string | undefined = defaultEdge?.targetQuestionId ??
        commonConvergence(branches.map((edge) => edge.targetQuestionId), id);

      branches.forEach((edge, index) => {
        walkBranchSequence(
          edge.targetQuestionId,
          `${code}${letterFor(index)}`,
          convergence,
        );
      });

      id = convergence;
    }
  }

  roots.forEach((root) => processRoot(root.id));
  // Orphan questions (unreachable from any root) still need a code.
  for (const question of questions) {
    if (!visited.has(question.id)) processRoot(question.id);
  }

  return codes;
}
