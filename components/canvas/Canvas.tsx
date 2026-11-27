"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  Panel,
  useNodesState,
  useEdgesState,
  addEdge,
  reconnectEdge,
  type Connection,
  type Edge,
  type EdgeChange,
  type NodeChange,
  type OnReconnect,
  MarkerType,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { useTheme } from "next-themes";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ChevronLeft, ChevronRight, Plus, Save, Eye, X, LayoutGrid, Settings, MessageSquare, Group } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  QuestionNode,
  TARGET_BRANCH,
  TARGET_NEXT,
  type QuestionNodeData,
  type QuestionOption,
} from "./QuestionNode";
import { EditQuestionPanel, type NewQuestionGroup, type QuestionFormValues } from "./EditQuestionPanel";
import {
  SurveyRunner,
  type SurveyPreviewState,
} from "@/components/survey-runtime/SurveyRunner";
import { computeLayout, placeNewQuestion } from "@/lib/layout";
import type { SurveyDesign, SurveyOptions } from "@/lib/survey-design";
import { OptionsPanel, type OptionsState } from "@/components/canvas/OptionsPanel";
import { CommentsPanel } from "@/components/canvas/CommentsPanel";
import { updateSurveyOptions } from "@/actions/survey-options";
import { GroupNode, type GroupFlowNode } from "@/components/canvas/GroupNode";
import { GroupDialog, type GroupChoice } from "@/components/canvas/GroupDialog";
import {
  createQuestionGroup,
  deleteQuestionGroup,
  renameQuestionGroup,
  setQuestionsGroup,
} from "@/actions/groups";
import { GROUP_COLORS, type CanvasGroup } from "@/lib/question-groups";
import type { CommentItem } from "@/lib/comments";
import { computeQuestionCodes } from "@/lib/question-codes";
import { applyCanvasChanges } from "@/actions/canvas";

const CANVAS_PREVIEW_OPEN_KEY = "vq-canvas-preview-open";

const nodeTypes = { question: QuestionNode, group: GroupNode };

const GROUP_ID_PREFIX = "group:";
const GROUP_PADDING = 32;
const GROUP_HEADER = 40;
const DEFAULT_CARD_SIZE = { width: 256, height: 220 };
const edgeMarker = {
  type: MarkerType.ArrowClosed,
  width: 18,
  height: 18,
};
const EDGE_RECONNECT_RADIUS = 20;
/** Question card is `w-64` in QuestionNode; used before RF measures the node. */
const QUESTION_CARD_WIDTH = 256;
const QUESTION_CARD_HEIGHT = 170;

const CONNECTOR_COLORS = {
  yes: "#16A34A",
  no: "#DC2626",
  next: "#2563EB",
  branch: "#7C3AED",
} as const;
const SELECTED_CONNECTOR_COLOR = "#F97316";

function normalizedOptionLabel(label?: string): string {
  return label?.trim().toLocaleLowerCase("es").normalize("NFD").replace(/[\u0300-\u036f]/g, "") ?? "";
}

function edgeAppearance(sourceOptionValue: string | null, optionLabel?: string) {
  const normalizedLabel = normalizedOptionLabel(optionLabel);
  const color = sourceOptionValue === null
    ? CONNECTOR_COLORS.next
    : normalizedLabel === "si"
      ? CONNECTOR_COLORS.yes
      : normalizedLabel === "no"
        ? CONNECTOR_COLORS.no
        : CONNECTOR_COLORS.branch;

  return {
    className: sourceOptionValue === null
      ? "survey-edge survey-edge--next"
      : "survey-edge survey-edge--branch",
    markerEnd: { ...edgeMarker, color },
    style: { stroke: color, strokeWidth: 2 },
  };
}

export type SurveyQuestion = {
  id: string;
  title: string;
  type: QuestionNodeData["type"];
  options: QuestionOption[];
  positionX: number;
  positionY: number;
  isRoot: boolean;
  required: boolean;
  scoringEnabled: boolean;
  minSelections: number | null;
  maxSelections: number | null;
  selectionErrorMessage: string | null;
  requiredErrorMessage: string | null;
  description: string | null;
  randomizeOptions: boolean;
  orderMode: string | null;
  keepLastOption: boolean;
};

export type SurveyEdge = {
  id: string;
  sourceQuestionId: string;
  targetQuestionId: string;
  sourceOptionValue: string | null;
};

type DialogState =
  | { mode: "create-root" }
  | { mode: "create-after"; afterQuestionId: string; branchOption?: QuestionOption }
  | { mode: "edit"; questionId: string };

function optionValueFromHandle(handle?: string | null): string | null {
  if (!handle || handle === "default") return null;
  return handle.replace(/^option-/, "");
}

/** Apply Logic-tab skip targets onto canvas edges (SurveyMonkey-style). */
function applyOptionLogic(
  edges: Edge[],
  sourceQuestionId: string,
  optionLogic: Record<string, string | null>,
  options: QuestionOption[],
): Edge[] {
  let next = [...edges];
  // An option that ends the survey / disqualifies has no outgoing branch.
  for (const option of options) {
    if (!option.action) continue;
    const handle = `option-${option.value}`;
    next = next.filter((edge) => !(edge.source === sourceQuestionId && edge.sourceHandle === handle));
  }
  for (const [key, targetId] of Object.entries(optionLogic)) {
    if (!targetId) continue;
    const sourceOptionValue = key === "__default__" ? null : key;
    if (sourceOptionValue && !options.some((option) => option.value === sourceOptionValue)) {
      continue;
    }
    const sourceHandle = sourceOptionValue ? `option-${sourceOptionValue}` : "default";
    const optionLabel = sourceOptionValue
      ? options.find((option) => option.value === sourceOptionValue)?.label
      : undefined;
    next = next.filter(
      (edge) => !(edge.source === sourceQuestionId && edge.sourceHandle === sourceHandle),
    );
    next.push({
      id: `tmp_${crypto.randomUUID()}`,
      source: sourceQuestionId,
      target: targetId,
      sourceHandle,
      targetHandle: targetHandleFor(sourceOptionValue),
      label: optionLabel,
      ...edgeAppearance(sourceOptionValue, optionLabel),
    });
  }
  return next;
}

/** Branches leave a card on the right and enter the next one on its left;
 * the plain "Siguiente" flow goes bottom to top. */
function targetHandleFor(sourceOptionValue: string | null): string {
  return sourceOptionValue ? TARGET_BRANCH : TARGET_NEXT;
}

function buildInitialNodes(questions: SurveyQuestion[]): QuestionNode[] {
  return questions.map((q) => ({
    id: q.id,
    type: "question" as const,
    position: { x: q.positionX, y: q.positionY },
    data: {
      questionId: q.id,
      code: "",
      title: q.title,
      type: q.type,
      options: q.options,
      isRoot: q.isRoot,
      required: q.required,
      scoringEnabled: q.scoringEnabled,
      minSelections: q.minSelections,
      maxSelections: q.maxSelections,
      selectionErrorMessage: q.selectionErrorMessage,
      requiredErrorMessage: q.requiredErrorMessage,
      description: q.description,
      randomizeOptions: q.randomizeOptions,
      orderMode: q.orderMode,
      keepLastOption: q.keepLastOption,
      onEdit: () => {},
      onDelete: () => {},
      onAddNext: () => {},
      onAddBranch: () => {},
    } satisfies QuestionNodeData,
  }));
}

function buildInitialEdges(questions: SurveyQuestion[], surveyEdges: SurveyEdge[]): Edge[] {
  return surveyEdges.map((e) => {
    const sourceQuestion = questions.find((q) => q.id === e.sourceQuestionId);
    const optionLabel = e.sourceOptionValue
      ? sourceQuestion?.options.find((o) => o.value === e.sourceOptionValue)?.label
      : undefined;
    return {
      id: e.id,
      source: e.sourceQuestionId,
      target: e.targetQuestionId,
      sourceHandle: e.sourceOptionValue ? `option-${e.sourceOptionValue}` : "default",
      targetHandle: targetHandleFor(e.sourceOptionValue),
      label: optionLabel,
      ...edgeAppearance(e.sourceOptionValue, optionLabel),
    };
  });
}

export function Canvas({
  surveyId,
  title,
  description,
  design,
  options,
  initialComments,
  initialGroups,
  initialMembership,
  currentUserId,
  questions,
  edges: surveyEdges,
}: {
  surveyId: string;
  title: string;
  description: string | null;
  status: "draft" | "published" | "closed";
  design: SurveyDesign;
  options: SurveyOptions;
  initialComments: CommentItem[];
  initialGroups: CanvasGroup[];
  /** question id → group id */
  initialMembership: Record<string, string>;
  currentUserId: string;
  questions: SurveyQuestion[];
  edges: SurveyEdge[];
}) {
  const [sidePanel, setSidePanel] = useState<"options" | "comments" | null>(null);
  const [groups, setGroups] = useState<CanvasGroup[]>(initialGroups);
  const [membership, setMembership] = useState<Record<string, string>>(initialMembership);
  const [groupDialog, setGroupDialog] = useState<{ ids: string[] } | null>(null);
  const [comments, setComments] = useState<CommentItem[]>(initialComments);
  const [optionsState, setOptionsState] = useState<OptionsState>({
    showProgress: design.showProgress,
    progressDisplay: design.progressDisplay,
    progressPosition: options.progressPosition,
    showTitle: options.showTitle,
    showQuestionNumbers: options.showQuestionNumbers,
    showRequiredAsterisk: options.showRequiredAsterisk,
  });
  const liveDesign: SurveyDesign = {
    ...design,
    showProgress: optionsState.showProgress,
    progressDisplay: optionsState.progressDisplay,
  };
  const liveOptions: SurveyOptions = {
    progressPosition: optionsState.progressPosition,
    showTitle: optionsState.showTitle,
    showQuestionNumbers: optionsState.showQuestionNumbers,
    showRequiredAsterisk: optionsState.showRequiredAsterisk,
  };
  const [dialog, setDialog] = useState<DialogState | null>(null);
  const [dirty, setDirty] = useState(false);
  const [applying, setApplying] = useState(false);
  // Starts closed on server and client alike; the saved choice is restored after
  // mount so the first client render matches the server HTML (no hydration error).
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewPrefLoaded, setPreviewPrefLoaded] = useState(false);
  const [previewRunKey, setPreviewRunKey] = useState(0);
  const [previewFocusQuestionId, setPreviewFocusQuestionId] = useState<string | null>(null);
  const lastPreviewQuestionRef = useRef<string | null>(null);
  const { resolvedTheme } = useTheme();
  const canvasColorMode = resolvedTheme === "dark" ? "dark" : "light";

  const initialNodes = useMemo(() => buildInitialNodes(questions), []); // eslint-disable-line react-hooks/exhaustive-deps
  /** Positions as last saved, to tell a real move from a plain click on a card. */
  const savedPositionsRef = useRef(new Map(initialNodes.map((n) => [n.id, n.position])));
  const initialEdges = useMemo(() => buildInitialEdges(questions, surveyEdges), []); // eslint-disable-line react-hooks/exhaustive-deps

  const [nodes, setNodes, onNodesChangeBase] = useNodesState<QuestionNode>(initialNodes);
  const [edges, setEdges, onEdgesChangeBase] = useEdgesState(initialEdges);

  // Handlers need the *latest* nodes/edges without going stale, but should
  // keep a stable identity (they're baked into node `data` at creation time).
  // Refs give them that without re-creating the whole node/edge arrays on
  // every keystroke.
  const nodesRef = useRef(nodes);
  const membershipRef = useRef(membership);
  useEffect(() => {
    membershipRef.current = membership;
  }, [membership]);
  /** Latest bounding box of every group (flow coordinates), for dragging. */
  const groupBoxesRef = useRef(new Map<string, { x: number; y: number }>());
  const edgesRef = useRef(edges);
  const flowRef = useRef<{
    getNode: (id: string) => QuestionNode | undefined;
    getZoom: () => number;
    setCenter: (x: number, y: number, options?: { zoom?: number; duration?: number }) => Promise<boolean>;
  } | null>(null);
  const centerTimerRef = useRef<number | null>(null);

  const centerViewportOnQuestion = useCallback(
    (nodeId: string, fallback: { x: number; y: number }, options?: { delayMs?: number }) => {
      if (centerTimerRef.current !== null) {
        window.clearTimeout(centerTimerRef.current);
      }
      const run = () => {
        centerTimerRef.current = null;
        const flow = flowRef.current;
        if (!flow) return;
        const node = flow.getNode(nodeId);
        const width = node?.measured?.width ?? QUESTION_CARD_WIDTH;
        const height = node?.measured?.height ?? QUESTION_CARD_HEIGHT;
        const x = (node?.position.x ?? fallback.x) + width / 2;
        const y = (node?.position.y ?? fallback.y) + height / 2;
        void flow.setCenter(x, y, { zoom: flow.getZoom(), duration: 350 });
      };
      const delayMs = options?.delayMs ?? 80;
      // Default delay waits for commitGraph + dialog close so the node exists
      // in the RF store and the viewport isn't covered by the modal.
      if (delayMs <= 0) {
        run();
        return;
      }
      centerTimerRef.current = window.setTimeout(run, delayMs);
    },
    [],
  );

  const [focusQuestionId, setFocusQuestionId] = useState<string | null>(
    () => initialNodes[0]?.id ?? null,
  );

  useEffect(
    () => () => {
      if (centerTimerRef.current !== null) window.clearTimeout(centerTimerRef.current);
    },
    [],
  );
  useEffect(() => {
    nodesRef.current = nodes;
  }, [nodes]);
  useEffect(() => {
    edgesRef.current = edges;
  }, [edges]);

  // React Refresh preserves the canvas state (including unsaved changes).
  // Normalize loaded edges too, so visual marker updates appear immediately
  // without forcing the person to reload and lose their work.
  useEffect(() => {
    setEdges((currentEdges) =>
      currentEdges.map((edge) => {
        const sourceOptionValue = optionValueFromHandle(edge.sourceHandle);
        const sourceNode = nodesRef.current.find((node) => node.id === edge.source);
        const optionLabel = sourceOptionValue
          ? sourceNode?.data.options.find((option) => option.value === sourceOptionValue)?.label
          : undefined;
        return { ...edge, ...edgeAppearance(sourceOptionValue, optionLabel) };
      }),
    );
  }, [setEdges]);

  useEffect(() => {
    if (!dirty) return;
    const handler = (e: BeforeUnloadEvent) => {
      e.preventDefault();
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [dirty]);

  const applyLayout = useCallback((nodesList: QuestionNode[], edgesList: Edge[]): QuestionNode[] => {
    const positions = computeLayout(
      nodesList.map((n) => ({
        id: n.id,
        isRoot: n.data.isRoot,
        options: n.data.options,
        height: n.measured?.height,
      })),
      edgesList.map((e) => ({
        sourceQuestionId: e.source,
        targetQuestionId: e.target,
        sourceOptionValue: optionValueFromHandle(e.sourceHandle),
      })),
    );
    return nodesList.map((n) => {
      const pos = positions.get(n.id);
      return pos ? { ...n, position: pos } : n;
    });
  }, []);

  // Cards keep whatever position they have; only the "Alinear" button
  // re-arranges the whole canvas.
  const commitGraph = useCallback(
    (newNodes: QuestionNode[], newEdges: Edge[]) => {
      setNodes(newNodes);
      setEdges(newEdges);
      nodesRef.current = newNodes;
      edgesRef.current = newEdges;
      setDirty(true);
    },
    [setNodes, setEdges],
  );

  /** Serialize persists so autosave doesn't open concurrent Neon transactions. */
  const persistQueueRef = useRef(Promise.resolve());

  /** Persist the given graph (or current refs) to Neon. */
  const persistGraph = useCallback(
    (
      nodesList: QuestionNode[] = nodesRef.current,
      edgesList: Edge[] = edgesRef.current,
      options?: { successToast?: string },
    ) => {
      const capturedNodes = nodesList;
      const capturedEdges = edgesList;
      const capturedOptions = options;

      const run = async () => {
        setApplying(true);
        try {
          const payload = {
            questions: capturedNodes.map((n) => ({
              id: n.id,
              title: n.data.title,
              type: n.data.type,
              options: n.data.options,
              positionX: n.position.x,
              positionY: n.position.y,
              isRoot: n.data.isRoot,
              required: n.data.required,
              scoringEnabled: n.data.scoringEnabled ?? false,
              minSelections: n.data.minSelections ?? null,
              maxSelections: n.data.maxSelections ?? null,
              selectionErrorMessage: n.data.selectionErrorMessage ?? null,
              requiredErrorMessage: n.data.requiredErrorMessage ?? null,
              description: n.data.description ?? null,
              randomizeOptions: n.data.randomizeOptions ?? false,
              orderMode: n.data.orderMode ?? null,
              keepLastOption: n.data.keepLastOption ?? false,
            })),
            edges: capturedEdges.map((e) => ({
              sourceQuestionId: e.source,
              targetQuestionId: e.target,
              sourceOptionValue: optionValueFromHandle(e.sourceHandle),
            })),
          };
          const { questionIdMap } = await applyCanvasChanges(surveyId, payload);

          let nextNodes = capturedNodes;
          let nextEdges = capturedEdges;
          if (Object.keys(questionIdMap).length > 0) {
            nextNodes = capturedNodes.map((n) => {
              const realId = questionIdMap[n.id];
              if (!realId) return n;
              return { ...n, id: realId, data: { ...n.data, questionId: realId } };
            });
            nextEdges = capturedEdges.map((e) => ({
              ...e,
              source: questionIdMap[e.source] ?? e.source,
              target: questionIdMap[e.target] ?? e.target,
            }));
          }

          setNodes(nextNodes);
          setEdges(nextEdges);
          nodesRef.current = nextNodes;
          edgesRef.current = nextEdges;
          if (Object.keys(questionIdMap).length > 0) {
            setMembership((current) =>
              Object.fromEntries(Object.entries(current).map(([q, g]) => [questionIdMap[q] ?? q, g])),
            );
            setFocusQuestionId((current) =>
              current && questionIdMap[current] ? questionIdMap[current]! : current,
            );
          }
          savedPositionsRef.current = new Map(nextNodes.map((n) => [n.id, n.position]));
          setDirty(false);
          if (capturedOptions?.successToast) toast.success(capturedOptions.successToast);
          return questionIdMap;
        } catch (error) {
          setDirty(true);
          toast.error(
            error instanceof Error ? error.message : "No se pudieron guardar las preguntas",
          );
          throw error;
        } finally {
          setApplying(false);
        }
      };

      const queued = persistQueueRef.current.then(run, run);
      persistQueueRef.current = queued.then(
        () => undefined,
        () => undefined,
      );
      return queued;
    },
    [surveyId, setNodes, setEdges],
  );

  const handleAlign = useCallback(() => {
    setNodes(applyLayout(nodesRef.current, edgesRef.current));
    setDirty(true);
  }, [applyLayout, setNodes]);

  const handleDeleteQuestion = useCallback(
    (questionId: string) => {
      if (!confirm("¿Eliminar esta pregunta? También se borran sus conexiones.")) return;
      const newEdges = edgesRef.current.filter(
        (e) => e.source !== questionId && e.target !== questionId,
      );
      const newNodes = nodesRef.current.filter((n) => n.id !== questionId);
      commitGraph(newNodes, newEdges);
      void persistGraph(newNodes, newEdges, { successToast: "Pregunta eliminada" });
    },
    [commitGraph, persistGraph],
  );

  const movedSinceSave = useCallback((id: string, position: { x: number; y: number }) => {
    const saved = savedPositionsRef.current.get(id);
    return !saved || saved.x !== position.x || saved.y !== position.y;
  }, []);

  const onNodesChange = useCallback(
    (changes: NodeChange<QuestionNode>[]) => {
      // Group boxes are derived from their cards, so dragging one moves the cards instead.
      const cardChanges: NodeChange<QuestionNode>[] = [];
      for (const change of changes) {
        if (!("id" in change) || !change.id.startsWith(GROUP_ID_PREFIX)) {
          cardChanges.push(change);
          continue;
        }
        if (change.type !== "position") continue;
        if (change.dragging === false) {
          const memberIds = Object.entries(membershipRef.current)
            .filter(([, g]) => g === change.id.slice(GROUP_ID_PREFIX.length))
            .map(([q]) => q);
          if (nodesRef.current.some((n) => memberIds.includes(n.id) && movedSinceSave(n.id, n.position))) {
            setDirty(true);
          }
          continue;
        }
        const groupId = change.id.slice(GROUP_ID_PREFIX.length);
        const current = groupBoxesRef.current.get(groupId);
        if (!current || !change.position) continue;
        const dx = change.position.x - current.x;
        const dy = change.position.y - current.y;
        if (dx === 0 && dy === 0) continue;
        const memberIds = new Set(
          Object.entries(membershipRef.current).filter(([, g]) => g === groupId).map(([q]) => q),
        );
        setNodes((currentNodes) =>
          currentNodes.map((n) =>
            memberIds.has(n.id) ? { ...n, position: { x: n.position.x + dx, y: n.position.y + dy } } : n,
          ),
        );
      }
      onNodesChangeBase(cardChanges);
      // A plain click also ends with a "drag stopped" event; only a real move is an unsaved change.
      if (
        cardChanges.some(
          (c) => c.type === "position" && c.dragging === false && c.position && movedSinceSave(c.id, c.position),
        )
      ) {
        setDirty(true);
      }
    },
    [onNodesChangeBase, setNodes, movedSinceSave],
  );

  const onEdgesChange = useCallback(
    (changes: EdgeChange[]) => {
      onEdgesChangeBase(changes);
      // Removing a connector never repositions cards — only adding a new
      // question/connection does, so the card stays exactly where it was.
      if (changes.some((c) => c.type === "remove")) {
        setDirty(true);
        // Persist after React Flow applies the remove to state.
        queueMicrotask(() => {
          void persistGraph(nodesRef.current, edgesRef.current);
        });
      }
    },
    [onEdgesChangeBase, persistGraph],
  );

  const onConnect = useCallback(
    (connection: Connection) => {
      if (!connection.source || !connection.target) return;
      const sourceOptionValue = optionValueFromHandle(connection.sourceHandle);
      const sourceNode = nodesRef.current.find((n) => n.id === connection.source);
      const optionLabel = sourceOptionValue
        ? sourceNode?.data.options.find((o) => o.value === sourceOptionValue)?.label
        : undefined;

      const filtered = edgesRef.current.filter(
        (e) => !(e.source === connection.source && e.sourceHandle === connection.sourceHandle),
      );
      const newEdge: Edge = {
        id: `tmp_${crypto.randomUUID()}`,
        source: connection.source,
        target: connection.target,
        sourceHandle: connection.sourceHandle,
        // Which side the person dropped on doesn't matter: a branch always
        // enters on the left, the sequence always on the top.
        targetHandle: targetHandleFor(sourceOptionValue),
        label: optionLabel,
        ...edgeAppearance(sourceOptionValue, optionLabel),
      };
      const nextEdges = addEdge(newEdge, filtered);
      commitGraph(nodesRef.current, nextEdges);
      void persistGraph(nodesRef.current, nextEdges);
    },
    [commitGraph, persistGraph],
  );

  const onReconnect = useCallback<OnReconnect>(
    (oldEdge, connection) => {
      if (!connection.source || !connection.target) return;

      const sourceOptionValue = optionValueFromHandle(connection.sourceHandle);
      const sourceNode = nodesRef.current.find((node) => node.id === connection.source);
      const optionLabel = sourceOptionValue
        ? sourceNode?.data.options.find((option) => option.value === sourceOptionValue)?.label
        : undefined;
      const normalizedConnection: Connection = {
        ...connection,
        targetHandle: targetHandleFor(sourceOptionValue),
      };

      // Each output represents one route. Reconnecting to an occupied output
      // replaces its previous route instead of creating two ambiguous paths.
      const withoutConflictingOutput = edgesRef.current.filter(
        (edge) =>
          edge.id === oldEdge.id ||
          !(edge.source === connection.source && edge.sourceHandle === connection.sourceHandle),
      );
      const reconnected = reconnectEdge(
        oldEdge,
        normalizedConnection,
        withoutConflictingOutput,
        { shouldReplaceId: false },
      ).map((edge) =>
        edge.id === oldEdge.id
          ? {
              ...edge,
              label: optionLabel,
              ...edgeAppearance(sourceOptionValue, optionLabel),
            }
          : edge,
      );

      commitGraph(nodesRef.current, reconnected);
      void persistGraph(nodesRef.current, reconnected);
    },
    [commitGraph, persistGraph],
  );

  const handleCreateSubmit = useCallback(
    async (values: QuestionFormValues, group?: NewQuestionGroup) => {
      if (!dialog) return;

      if (dialog.mode === "edit") {
        const newNodes = nodesRef.current.map((n) =>
          n.id === dialog.questionId
            ? {
                ...n,
                data: {
                  ...n.data,
                  title: values.title,
                  type: values.type,
                  options: values.options,
                  required: values.required,
                  scoringEnabled: values.scoringEnabled,
                  minSelections: values.minSelections,
                  maxSelections: values.maxSelections,
                  selectionErrorMessage: values.selectionErrorMessage,
                  requiredErrorMessage: values.requiredErrorMessage,
                  description: values.description,
                  randomizeOptions: values.randomizeOptions,
                  orderMode: values.orderMode,
                  keepLastOption: values.keepLastOption,
                },
              }
            : n,
        );
        let newEdges = edgesRef.current
          .filter((e) => {
            if (e.source !== dialog.questionId) return true;
            const optValue = optionValueFromHandle(e.sourceHandle);
            if (optValue === null) return true;
            return values.options.some((o) => o.value === optValue);
          })
          .map((edge) => {
            if (edge.source !== dialog.questionId) return edge;
            const sourceOptionValue = optionValueFromHandle(edge.sourceHandle);
            const optionLabel = sourceOptionValue
              ? values.options.find((option) => option.value === sourceOptionValue)?.label
              : undefined;
            return {
              ...edge,
              label: optionLabel,
              ...edgeAppearance(sourceOptionValue, optionLabel),
            };
          });
        newEdges = applyOptionLogic(
          newEdges,
          dialog.questionId,
          values.optionLogic,
          values.options,
        );
        commitGraph(newNodes, newEdges);
        await persistGraph(newNodes, newEdges, { successToast: "Pregunta guardada" });
        return;
      }

      const newId = `tmp_${crypto.randomUUID()}`;
      const isRoot = nodesRef.current.length === 0;
      const sourceNode =
        dialog.mode === "create-after"
          ? nodesRef.current.find((n) => n.id === dialog.afterQuestionId)
          : undefined;
      const position = placeNewQuestion(
        sourceNode ? { ...sourceNode.position, height: sourceNode.measured?.height } : null,
        dialog.mode === "create-after" && dialog.branchOption !== undefined,
        nodesRef.current.map((n) => n.position),
      );

      const newNode: QuestionNode = {
        id: newId,
        type: "question",
        position,
        data: {
          questionId: newId,
          code: "",
          title: values.title,
          type: values.type,
          options: values.options,
          isRoot,
          required: values.required,
          scoringEnabled: values.scoringEnabled,
          minSelections: values.minSelections,
          maxSelections: values.maxSelections,
          selectionErrorMessage: values.selectionErrorMessage,
          requiredErrorMessage: values.requiredErrorMessage,
          description: values.description,
          randomizeOptions: values.randomizeOptions,
          orderMode: values.orderMode,
          keepLastOption: values.keepLastOption,
          onEdit: () => {},
          onDelete: () => {},
          onAddNext: () => {},
          onAddBranch: () => {},
        },
      };

      let newEdges = edgesRef.current;
      if (dialog.mode === "create-after") {
        const sourceOptionValue = dialog.branchOption?.value ?? null;
        const sourceHandle = sourceOptionValue ? `option-${sourceOptionValue}` : "default";
        const filtered = edgesRef.current.filter(
          (e) => !(e.source === dialog.afterQuestionId && e.sourceHandle === sourceHandle),
        );
        const newEdge: Edge = {
          id: `tmp_${crypto.randomUUID()}`,
          source: dialog.afterQuestionId,
          target: newId,
          sourceHandle,
          targetHandle: targetHandleFor(sourceOptionValue),
          label: dialog.branchOption?.label,
          ...edgeAppearance(sourceOptionValue, dialog.branchOption?.label),
        };
        newEdges = [...filtered, newEdge];
      }

      const nextNodes = [...nodesRef.current, newNode];
      newEdges = applyOptionLogic(newEdges, newId, values.optionLogic, values.options);
      commitGraph(nextNodes, newEdges);
      // Joining the source card's group shows up at once; saving it follows the question's own save.
      const sourceGroupId = dialog.mode === "create-after" ? membershipRef.current[dialog.afterQuestionId] : undefined;
      if (group?.mode === "same" && sourceGroupId) {
        setMembership((current) => ({ ...current, [newId]: sourceGroupId }));
      }
      const idMap = await persistGraph(nextNodes, newEdges, { successToast: "Pregunta guardada" });
      const savedId = idMap?.[newId] ?? newId;
      if (group?.mode === "same" && sourceGroupId) {
        const result = await setQuestionsGroup(surveyId, [savedId], sourceGroupId);
        if (result.error) {
          toast.error(result.error);
          setMembership((current) => Object.fromEntries(Object.entries(current).filter(([q]) => q !== savedId)));
        }
      } else if (group?.mode === "new") {
        const result = await createQuestionGroup(surveyId, group.name, [savedId]);
        if (result.error || !result.id) {
          toast.error(result.error ?? "No se pudo crear el grupo");
        } else {
          const createdId = result.id;
          setGroups((current) => [
            ...current,
            { id: createdId, name: group.name, color: GROUP_COLORS[current.length % GROUP_COLORS.length] },
          ]);
          setMembership((current) => ({ ...current, [savedId]: createdId }));
        }
      }
      setFocusQuestionId(savedId);
      centerViewportOnQuestion(savedId, position);
    },
    [dialog, commitGraph, persistGraph, centerViewportOnQuestion, surveyId],
  );

  const handleApply = useCallback(async () => {
    try {
      await persistGraph(undefined, undefined, { successToast: "Cambios aplicados" });
    } catch {
      /* toast already shown in persistGraph */
    }
  }, [persistGraph]);

  const codes = useMemo(
    () =>
      computeQuestionCodes(
        nodes.map((n) => ({ id: n.id, isRoot: n.data.isRoot, options: n.data.options })),
        edges.map((e) => ({
          sourceQuestionId: e.source,
          targetQuestionId: e.target,
          sourceOptionValue: optionValueFromHandle(e.sourceHandle),
        })),
      ),
    [nodes, edges],
  );

  const orderedQuestions = useMemo(
    () =>
      [...nodes]
        .map((node) => ({
          id: node.id,
          code: codes.get(node.id) ?? "?",
          title: node.data.title,
          position: node.position,
        }))
        .sort((a, b) => a.code.localeCompare(b.code, undefined, { numeric: true })),
    [nodes, codes],
  );

  useEffect(() => {
    if (orderedQuestions.length === 0) {
      if (focusQuestionId !== null) setFocusQuestionId(null);
      return;
    }
    if (!focusQuestionId || !orderedQuestions.some((question) => question.id === focusQuestionId)) {
      setFocusQuestionId(orderedQuestions[0]!.id);
    }
  }, [orderedQuestions, focusQuestionId]);

  const focusIndex = Math.max(
    0,
    orderedQuestions.findIndex((question) => question.id === focusQuestionId),
  );
  const focusedQuestion = orderedQuestions[focusIndex] ?? null;
  const openCommentCount = comments.filter((c) => !c.parentId && !c.resolved).length;
  // Right-hand panels share the space with the live preview: opening one closes the other.
  function toggleSidePanel(panel: "options" | "comments") {
    setSidePanel((current) => (current === panel ? null : panel));
    setPreviewOpen(false);
  }

  const jumpToQuestion = useCallback(
    (questionId: string) => {
      const target = orderedQuestions.find((question) => question.id === questionId);
      if (!target) return;
      setFocusQuestionId(target.id);
      setNodes((current) =>
        current.map((node) => ({ ...node, selected: node.id === target.id })),
      );
      centerViewportOnQuestion(target.id, target.position, { delayMs: 0 });
      setPreviewFocusQuestionId(target.id);
    },
    [orderedQuestions, setNodes, centerViewportOnQuestion],
  );

  useEffect(() => {
    try {
      if (window.localStorage.getItem(CANVAS_PREVIEW_OPEN_KEY) === "1") {
        setPreviewOpen(true);
      }
    } catch {
      /* ignore private mode */
    }
    setPreviewPrefLoaded(true);
  }, []);

  useEffect(() => {
    if (!previewPrefLoaded) return;
    try {
      window.localStorage.setItem(CANVAS_PREVIEW_OPEN_KEY, previewOpen ? "1" : "0");
    } catch {
      /* ignore quota / private mode */
    }
  }, [previewOpen, previewPrefLoaded]);

  useEffect(() => {
    if (!previewOpen) {
      lastPreviewQuestionRef.current = null;
      setPreviewFocusQuestionId(null);
      return;
    }
    if (nodes.length === 0) setPreviewOpen(false);
  }, [previewOpen, nodes.length]);

  const handlePreviewState = useCallback(
    (state: SurveyPreviewState) => {
      const questionId = state.currentQuestionId;
      if (!questionId || !state.started || state.finished) return;
      if (questionId === lastPreviewQuestionRef.current) return;
      lastPreviewQuestionRef.current = questionId;
      jumpToQuestion(questionId);
    },
    [jumpToQuestion],
  );

  // Selecting a node on the canvas always moves the open preview to it. Changes
  // that originate from the preview itself already updated the ref, so they
  // don't bounce back here.
  const selectedQuestionId = useMemo(
    () => nodes.find((node) => node.selected)?.id ?? null,
    [nodes],
  );
  useEffect(() => {
    if (!previewOpen || !selectedQuestionId) return;
    if (selectedQuestionId === lastPreviewQuestionRef.current) return;
    if (!orderedQuestions.some((question) => question.id === selectedQuestionId)) return;
    lastPreviewQuestionRef.current = selectedQuestionId;
    setFocusQuestionId(selectedQuestionId);
    setPreviewFocusQuestionId(selectedQuestionId);
  }, [previewOpen, selectedQuestionId, orderedQuestions]);

  const resolvePreviewStartId = useCallback(() => {
    const selectedId = nodesRef.current.find((node) => node.selected)?.id ?? null;
    if (selectedId && orderedQuestions.some((question) => question.id === selectedId)) {
      return selectedId;
    }
    return (
      orderedQuestions[0]?.id ??
      nodesRef.current.find((node) => node.data.isRoot)?.id ??
      nodesRef.current[0]?.id ??
      null
    );
  }, [orderedQuestions]);

  const togglePreview = useCallback(() => {
    if (previewOpen) {
      setPreviewOpen(false);
      return;
    }
    setSidePanel(null);
    const startId = resolvePreviewStartId();
    // Seed focus before mount so SurveyRunner's first paint matches selection.
    lastPreviewQuestionRef.current = startId;
    if (startId) {
      setFocusQuestionId(startId);
      setNodes((current) =>
        current.map((node) => ({ ...node, selected: node.id === startId })),
      );
      setPreviewFocusQuestionId(startId);
      const target = orderedQuestions.find((question) => question.id === startId);
      if (target) centerViewportOnQuestion(target.id, target.position, { delayMs: 0 });
    }
    setPreviewRunKey((key) => key + 1);
    setPreviewOpen(true);
  }, [
    previewOpen,
    resolvePreviewStartId,
    orderedQuestions,
    setNodes,
    centerViewportOnQuestion,
  ]);

  const navigateQuestion = useCallback(
    (delta: number) => {
      if (orderedQuestions.length === 0) return;
      const nextIndex = Math.min(
        orderedQuestions.length - 1,
        Math.max(0, focusIndex + delta),
      );
      const target = orderedQuestions[nextIndex];
      if (!target) return;
      jumpToQuestion(target.id);
    },
    [orderedQuestions, focusIndex, jumpToQuestion],
  );

  const newQuestionGroupContext = (() => {
    if (!dialog || dialog.mode !== "create-after") return null;
    const groupId = membership[dialog.afterQuestionId];
    const group = groupId ? groups.find((g) => g.id === groupId) : undefined;
    return group ? { name: group.name } : null;
  })();

  const selectedCardIds = useMemo(() => nodes.filter((n) => n.selected).map((n) => n.id), [nodes]);

  const [groupPending, setGroupPending] = useState(false);
  /** Group under the card being dragged (it will join that group on drop). */
  const [dropGroupId, setDropGroupId] = useState<string | null>(null);
  /** Ctrl/⌘ + drag on a grouped card: the group's frame stays put so the card can be dragged out of it. */
  const [leaving, setLeaving] = useState<{
    groupId: string;
    rect: { x: number; y: number; w: number; h: number };
    outside: boolean;
  } | null>(null);
  const dragStartRef = useRef<{ groupId: string; rect: { x: number; y: number; w: number; h: number } } | null>(null);

  function handleRenameGroup(id: string, name: string) {
    const previous = groups.find((g) => g.id === id)?.name;
    setGroups((current) => current.map((g) => (g.id === id ? { ...g, name } : g)));
    void renameQuestionGroup(surveyId, id, name).then((result) => {
      if (result.error) {
        toast.error(result.error);
        if (previous) setGroups((current) => current.map((g) => (g.id === id ? { ...g, name: previous } : g)));
      }
    });
  }

  function handleUngroup(id: string) {
    setGroups((current) => current.filter((g) => g.id !== id));
    setMembership((current) => Object.fromEntries(Object.entries(current).filter(([, g]) => g !== id)));
    void deleteQuestionGroup(surveyId, id).then((result) => {
      if (result.error) toast.error(result.error);
    });
  }

  async function handleGroupConfirm(ids: string[], choice: GroupChoice, successMessage = "Grupo actualizado") {
    setGroupPending(true);
    try {
      let targetId: string;
      if ("newName" in choice) {
        const result = await createQuestionGroup(surveyId, choice.newName, ids);
        if (result.error || !result.id) {
          toast.error(result.error ?? "No se pudo crear el grupo");
          return;
        }
        targetId = result.id;
        const created = choice.newName.trim();
        setGroups((current) => [
          ...current,
          { id: targetId, name: created, color: GROUP_COLORS[current.length % GROUP_COLORS.length] },
        ]);
      } else {
        const result = await setQuestionsGroup(surveyId, ids, choice.groupId);
        if (result.error) {
          toast.error(result.error);
          return;
        }
        targetId = choice.groupId;
      }
      setMembership((current) => ({ ...current, ...Object.fromEntries(ids.map((q) => [q, targetId])) }));
      // Groups left empty by moving cards out disappear on both sides.
      setGroups((current) => current.filter((g) => g.id === targetId || Object.values({ ...membershipRef.current, ...Object.fromEntries(ids.map((q) => [q, targetId])) }).includes(g.id)));
      setGroupDialog(null);
      toast.success(successMessage);
    } finally {
      setGroupPending(false);
    }
  }

  function handleGroupClick() {
    if (selectedCardIds.length === 0) {
      toast.error("Primero selecciona las preguntas que quieres agrupar", {
        description:
          "Haz clic en una pregunta y suma otras manteniendo Shift + clic, o mantén Shift y arrastra un recuadro sobre el canvas. Después pulsa Agrupar y elige el nombre del grupo.",
        duration: 9000,
      });
      return;
    }
    setGroupDialog({ ids: selectedCardIds });
  }

  async function handleRemoveFromGroup(ids: string[]) {
    const result = await setQuestionsGroup(surveyId, ids, null);
    if (result.error) {
      toast.error(result.error);
      return;
    }
    const next = Object.fromEntries(Object.entries(membershipRef.current).filter(([q]) => !ids.includes(q)));
    setMembership(next);
    setGroups((current) => current.filter((g) => Object.values(next).includes(g.id)));
  }

  const groupNodes = useMemo(() => {
    const result: GroupFlowNode[] = [];
    for (const group of groups) {
      const members = nodes.filter((n) => membership[n.id] === group.id);
      if (members.length === 0) continue;
      const rects = members.map((n) => ({
        x: n.position.x,
        y: n.position.y,
        w: n.measured?.width ?? DEFAULT_CARD_SIZE.width,
        h: n.measured?.height ?? DEFAULT_CARD_SIZE.height,
      }));
      const minX = Math.min(...rects.map((r) => r.x)) - GROUP_PADDING;
      const minY = Math.min(...rects.map((r) => r.y)) - GROUP_PADDING - GROUP_HEADER;
      const maxX = Math.max(...rects.map((r) => r.x + r.w)) + GROUP_PADDING;
      const maxY = Math.max(...rects.map((r) => r.y + r.h)) + GROUP_PADDING;
      const frozen = leaving?.groupId === group.id ? leaving.rect : null;
      const box = frozen ?? { x: minX, y: minY, w: maxX - minX, h: maxY - minY };
      result.push({
        id: GROUP_ID_PREFIX + group.id,
        type: "group",
        position: { x: box.x, y: box.y },
        width: box.w,
        height: box.h,
        style: { width: box.w, height: box.h },
        zIndex: -1,
        dragHandle: ".group-drag-handle",
        connectable: false,
        deletable: false,
        selectable: false,
        data: {
          name: group.name,
          color: group.color,
          count: members.length,
          highlight: group.id === dropGroupId,
          leaving: leaving?.groupId === group.id && leaving.outside,
          onRename: (name: string) => handleRenameGroup(group.id, name),
          onUngroup: () => handleUngroup(group.id),
        },
      });
    }
    return result;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [groups, membership, nodes, dropGroupId, leaving]);

  /** The other group whose box holds the centre of the dragged card, if any. */
  function groupUnderCard(node: { id: string; position: { x: number; y: number }; measured?: { width?: number; height?: number } }) {
    const cx = node.position.x + (node.measured?.width ?? DEFAULT_CARD_SIZE.width) / 2;
    const cy = node.position.y + (node.measured?.height ?? DEFAULT_CARD_SIZE.height) / 2;
    const own = membershipRef.current[node.id];
    for (const box of groupNodes) {
      const groupId = box.id.slice(GROUP_ID_PREFIX.length);
      if (groupId === own) continue;
      const w = box.width ?? 0;
      const h = box.height ?? 0;
      if (cx >= box.position.x && cx <= box.position.x + w && cy >= box.position.y && cy <= box.position.y + h) {
        return groupId;
      }
    }
    return null;
  }

  function handleNodeDragStart(_event: unknown, node: QuestionNode) {
    const groupId = node.type === "question" ? membershipRef.current[node.id] : undefined;
    const box = groupId ? groupNodes.find((g) => g.id === GROUP_ID_PREFIX + groupId) : undefined;
    dragStartRef.current =
      groupId && box
        ? { groupId, rect: { x: box.position.x, y: box.position.y, w: box.width ?? 0, h: box.height ?? 0 } }
        : null;
  }

  function handleNodeDrag(event: unknown, node: QuestionNode) {
    if (node.type !== "question") return;
    const target = groupUnderCard(node);
    setDropGroupId((current) => (current === target ? current : target));

    // Holding Ctrl (⌘) while dragging a grouped card lets it leave: the frame stays where it was.
    const mouse = event as { ctrlKey?: boolean; metaKey?: boolean };
    const start = dragStartRef.current;
    if ((mouse.ctrlKey || mouse.metaKey) && start && membershipRef.current[node.id] === start.groupId) {
      const cx = node.position.x + (node.measured?.width ?? DEFAULT_CARD_SIZE.width) / 2;
      const cy = node.position.y + (node.measured?.height ?? DEFAULT_CARD_SIZE.height) / 2;
      const { x, y, w, h } = start.rect;
      const outside = cx < x || cx > x + w || cy < y || cy > y + h;
      setLeaving((current) =>
        current && current.groupId === start.groupId && current.outside === outside
          ? current
          : { groupId: start.groupId, rect: start.rect, outside },
      );
    } else {
      setLeaving((current) => (current === null ? current : null));
    }
  }

  /** Takes the cards out of their group: instant on screen, saved in the background, undone on failure. */
  function removeCardsFromGroupOptimistic(ids: string[]) {
    const previousMembership = membershipRef.current;
    const previousGroups = groups;
    const nextMembership = Object.fromEntries(Object.entries(previousMembership).filter(([q]) => !ids.includes(q)));
    setMembership(nextMembership);
    setGroups((current) => current.filter((g) => Object.values(nextMembership).includes(g.id)));
    void setQuestionsGroup(surveyId, ids, null)
      .then((result) => {
        if (result.error) throw new Error(result.error);
        toast.success(ids.length > 1 ? "Preguntas quitadas del grupo" : "Pregunta quitada del grupo");
      })
      .catch((error: unknown) => {
        setMembership(previousMembership);
        setGroups(previousGroups);
        toast.error(error instanceof Error ? error.message : "No se pudo quitar la pregunta del grupo");
      });
  }

  function handleNodeDragStop(_event: unknown, node: QuestionNode, dragged: QuestionNode[]) {
    const target = dropGroupId;
    const wasLeaving = leaving;
    setDropGroupId(null);
    setLeaving(null);
    dragStartRef.current = null;
    if (node.type !== "question") return;
    const ids = (dragged.length > 0 ? dragged : [node]).filter((n) => n.type === "question").map((n) => n.id);
    if (!target) {
      // Dropped outside the frame it started in while holding Ctrl (⌘): the cards leave the group.
      if (wasLeaving?.outside) {
        const exiting = ids.filter((id) => membershipRef.current[id] === wasLeaving.groupId);
        if (exiting.length > 0) removeCardsFromGroupOptimistic(exiting);
      }
      return;
    }
    const name = groups.find((g) => g.id === target)?.name ?? "";

    // Optimistic: the card joins the group on screen right away; saving happens in the background
    // and is rolled back (with a message) if the server refuses.
    const previousMembership = membershipRef.current;
    const previousGroups = groups;
    const nextMembership = { ...previousMembership, ...Object.fromEntries(ids.map((q) => [q, target])) };
    setMembership(nextMembership);
    setGroups((current) => current.filter((g) => Object.values(nextMembership).includes(g.id)));

    void setQuestionsGroup(surveyId, ids, target)
      .then((result) => {
        if (result.error) throw new Error(result.error);
        toast.success(`Agregada al grupo «${name}»`);
      })
      .catch((error: unknown) => {
        setMembership(previousMembership);
        setGroups(previousGroups);
        toast.error(error instanceof Error ? error.message : "No se pudo agregar la pregunta al grupo");
      });
  }

  useEffect(() => {
    groupBoxesRef.current = new Map(
      groupNodes.map((g) => [g.id.slice(GROUP_ID_PREFIX.length), g.position]),
    );
  }, [groupNodes]);

  const nodesForFlow = useMemo(
    () => [
      ...(groupNodes as unknown as QuestionNode[]),
      ...nodes.map((n) => ({
        ...n,
        data: {
          ...n.data,
          code: codes.get(n.id) ?? "?",
          onEdit: () => setDialog({ mode: "edit", questionId: n.id }),
          onDelete: () => handleDeleteQuestion(n.id),
          onAddNext: () => setDialog({ mode: "create-after", afterQuestionId: n.id }),
          onAddBranch: (option: QuestionOption) =>
            setDialog({ mode: "create-after", afterQuestionId: n.id, branchOption: option }),
        },
      })),
    ],
    [nodes, codes, handleDeleteQuestion, groupNodes],
  );

  const edgesForFlow = useMemo(
    () =>
      edges.map((edge) => {
        const sourceOptionValue = optionValueFromHandle(edge.sourceHandle);
        const reconnectable = edge.selected ? "target" as const : false;
        const markerEnd = edge.selected
          ? { ...edgeMarker, color: SELECTED_CONNECTOR_COLOR }
          : edge.markerEnd;
        if (sourceOptionValue !== null) return { ...edge, reconnectable, markerEnd };

        const sourceCode = codes.get(edge.source);
        return {
          ...edge,
          reconnectable,
          markerEnd,
          label: sourceCode,
          ariaLabel: sourceCode
            ? `Siguiente desde la pregunta ${sourceCode}`
            : "Siguiente pregunta",
        };
      }),
    [edges, codes],
  );

  const editingNode = dialog?.mode === "edit" ? nodes.find((n) => n.id === dialog.questionId) : undefined;
  const initialValues: QuestionFormValues | undefined = editingNode
    ? {
        title: editingNode.data.title,
        type: editingNode.data.type,
        options: editingNode.data.options,
        required: editingNode.data.required,
        scoringEnabled: editingNode.data.scoringEnabled ?? false,
        minSelections: editingNode.data.minSelections ?? null,
        maxSelections: editingNode.data.maxSelections ?? null,
        selectionErrorMessage: editingNode.data.selectionErrorMessage ?? null,
        requiredErrorMessage: editingNode.data.requiredErrorMessage ?? null,
        description: editingNode.data.description ?? null,
        randomizeOptions: editingNode.data.randomizeOptions ?? false,
        orderMode: editingNode.data.orderMode ?? null,
        keepLastOption: editingNode.data.keepLastOption ?? false,
        optionLogic: Object.fromEntries(
          edges
            .filter((edge) => edge.source === editingNode.id)
            .map((edge) => {
              const optionValue = optionValueFromHandle(edge.sourceHandle);
              return [optionValue ?? "__default__", edge.target] as const;
            }),
        ),
      }
    : undefined;
  const editingCode = editingNode ? codes.get(editingNode.id) : undefined;
  const logicTargets = nodes
    .filter((n) => n.id !== editingNode?.id)
    .map((n) => ({
      id: n.id,
      code: codes.get(n.id) ?? "?",
      title: n.data.title,
    }));

  // Preview always reflects the live canvas — including unsaved edits — so
  // it never touches the database (see `preview` on SurveyRunner).
  const previewQuestions = useMemo(
    () =>
      nodes.map((n) => ({
        id: n.id,
        title: n.data.title,
        type: n.data.type,
        options: n.data.options,
        required: n.data.required,
        scoringEnabled: n.data.scoringEnabled ?? false,
        minSelections: n.data.minSelections ?? null,
        maxSelections: n.data.maxSelections ?? null,
        selectionErrorMessage: n.data.selectionErrorMessage ?? null,
        requiredErrorMessage: n.data.requiredErrorMessage ?? null,
        description: n.data.description ?? null,
        randomizeOptions: n.data.randomizeOptions ?? false,
        orderMode: n.data.orderMode ?? null,
        keepLastOption: n.data.keepLastOption ?? false,
      })),
    [nodes],
  );
  const previewEdges = useMemo(
    () =>
      edges.map((e) => ({
        sourceQuestionId: e.source,
        targetQuestionId: e.target,
        sourceOptionValue: optionValueFromHandle(e.sourceHandle),
      })),
    [edges],
  );
  // Prefer canvas code order (same as preg N), not RF array order / stale isRoot.
  // Falling back to nodes[0] was starting preview on the wrong card when isRoot
  // was missing — e.g. "Nivel?" first in the array while "pais?" is code 1.
  const previewRootId =
    orderedQuestions[0]?.id ??
    nodes.find((n) => n.data.isRoot)?.id ??
    nodes[0]?.id ??
    null;

  const questionCodesRecord = useMemo(
    () => Object.fromEntries(codes.entries()),
    [codes],
  );

  useEffect(() => {
    if (!previewOpen) return;
    const startId = resolvePreviewStartId();
    if (!startId) return;
    // Prefer selected question when opening; otherwise first in code order.
    // Seed lastPreview so the runner's initial sync doesn't yank selection back.
    lastPreviewQuestionRef.current = startId;
    jumpToQuestion(startId);
    // Only when the panel opens / remounts — not when selection updates.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [previewOpen, previewRunKey]);

  return (
    <div className="flex h-full w-full min-h-0">
      <div className="relative min-h-0 min-w-0 flex-1">
        <ReactFlow
          nodes={nodesForFlow}
          edges={edgesForFlow}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onConnect={onConnect}
          onReconnect={onReconnect}
          onInit={(instance) => {
            flowRef.current = instance;
          }}
          colorMode={canvasColorMode}
          edgesReconnectable
          reconnectRadius={EDGE_RECONNECT_RADIUS}
          elevateEdgesOnSelect
          onNodeDragStart={handleNodeDragStart as never}
          onNodeDrag={handleNodeDrag as never}
          onNodeDragStop={handleNodeDragStop as never}
          multiSelectionKeyCode="Shift"
          selectionKeyCode="Shift"
          nodeTypes={nodeTypes}
          fitView
          fitViewOptions={{ maxZoom: 1 }}
          proOptions={{ hideAttribution: true }}
        >
          <Background />
          <Controls />
          <MiniMap pannable zoomable className="!bg-card" />
          <Panel position="top-right" className="flex items-center gap-2">
            {dirty && (
              <span className="rounded-md bg-amber-100 px-2 py-1 text-xs font-medium text-amber-950 dark:bg-amber-950/40 dark:text-amber-100">
                Hay cambios sin guardar
              </span>
            )}
            <Button
              size="sm"
              variant="outline"
              onClick={handleGroupClick}
              disabled={nodes.length === 0}
            >
              <Group className="size-4" />
              Agrupar{selectedCardIds.length > 1 ? ` (${selectedCardIds.length})` : ""}
            </Button>
            {selectedCardIds.some((id) => membership[id]) ? (
              <Button size="sm" variant="ghost" onClick={() => void handleRemoveFromGroup(selectedCardIds)}>
                Quitar del grupo
              </Button>
            ) : null}
            <Button size="sm" variant="outline" onClick={handleAlign} disabled={nodes.length === 0}>
              <LayoutGrid className="size-4" />
              Alinear
            </Button>
            <Button
              size="sm"
              variant={sidePanel === "options" ? "secondary" : "outline"}
              onClick={() => toggleSidePanel("options")}
              aria-pressed={sidePanel === "options"}
            >
              <Settings className="size-4" />
              Opciones
            </Button>
            <Button
              size="sm"
              variant={sidePanel === "comments" ? "secondary" : "outline"}
              onClick={() => toggleSidePanel("comments")}
              aria-pressed={sidePanel === "comments"}
            >
              <MessageSquare className="size-4" />
              Comentarios
              {openCommentCount > 0 ? (
                <span className="rounded-full bg-primary px-1.5 text-[10px] font-semibold text-primary-foreground">
                  {openCommentCount}
                </span>
              ) : null}
            </Button>
            <Button
              size="sm"
              variant={previewOpen ? "secondary" : "outline"}
              onClick={togglePreview}
              disabled={nodes.length === 0}
              aria-pressed={previewOpen}
            >
              <Eye className="size-4" />
              {previewOpen ? "Ocultar previa" : "Vista previa"}
            </Button>
            <Button size="sm" onClick={handleApply} disabled={!dirty || applying}>
              <Save className="size-4" />
              {applying ? "Guardando..." : dirty ? "Guardar posiciones" : "Guardado"}
            </Button>
          </Panel>
        </ReactFlow>

        {/* Outside React Flow panels: RF bottom-right Panel CSS resets margin and
            the MiniMap was covering the navigator. Sit just above the MiniMap. */}
        {orderedQuestions.length > 0 ? (
          <div
            className="absolute right-4 z-20 flex items-center gap-0.5 rounded-lg border bg-card p-1 shadow-md"
            style={{ bottom: 178 }}
            role="navigation"
            aria-label="Navegar preguntas del lienzo"
          >
            <Button
              type="button"
              size="icon-sm"
              variant="ghost"
              disabled={focusIndex <= 0}
              onClick={() => navigateQuestion(-1)}
              aria-label="Pregunta anterior"
            >
              <ChevronLeft className="size-4" />
            </Button>
            <Select
              value={focusedQuestion?.id}
              onValueChange={(value) => {
                if (typeof value === "string" && value) jumpToQuestion(value);
              }}
            >
              <SelectTrigger
                size="sm"
                className={cn(
                  "h-7 min-w-[4.5rem] border-0 bg-transparent px-1.5 shadow-none",
                  "focus-visible:ring-0 data-placeholder:text-foreground",
                )}
                aria-label="Saltar a pregunta"
              >
                <SelectValue>
                  {() =>
                    focusedQuestion ? `preg ${focusedQuestion.code}` : "—"
                  }
                </SelectValue>
              </SelectTrigger>
              <SelectContent align="center" className="max-h-72 min-w-56">
                {orderedQuestions.map((question) => (
                  <SelectItem key={question.id} value={question.id}>
                    <span className="flex min-w-0 items-center gap-2">
                      <span className="shrink-0 font-medium tabular-nums">
                        preg {question.code}
                      </span>
                      <span className="truncate text-muted-foreground">
                        {question.title || "Sin título"}
                      </span>
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button
              type="button"
              size="icon-sm"
              variant="ghost"
              disabled={focusIndex >= orderedQuestions.length - 1}
              onClick={() => navigateQuestion(1)}
              aria-label="Pregunta siguiente"
            >
              <ChevronRight className="size-4" />
            </Button>
          </div>
        ) : null}

        {nodes.length === 0 && (
          <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
            <Button className="pointer-events-auto" onClick={() => setDialog({ mode: "create-root" })}>
              <Plus className="size-4" /> Agregar primera pregunta
            </Button>
          </div>
        )}

        {groupDialog ? (
          <GroupDialog
            count={groupDialog.ids.length}
            groups={groups}
            pending={groupPending}
            onCancel={() => setGroupDialog(null)}
            onConfirm={(choice) => void handleGroupConfirm(groupDialog.ids, choice)}
          />
        ) : null}

        <EditQuestionPanel
          open={dialog !== null}
          onOpenChange={(open) => !open && setDialog(null)}
          initialValues={initialValues}
          code={editingCode}
          logicTargets={logicTargets}
          groupContext={newQuestionGroupContext}
          onSubmit={handleCreateSubmit}
        />
      </div>

      {previewOpen && nodes.length > 0 ? (
        <aside
          className={cn(
            "flex min-h-0 shrink-0 flex-col border-l bg-background",
            "w-full max-w-md md:w-[min(420px,42%)]",
            "max-md:absolute max-md:inset-y-0 max-md:right-0 max-md:z-30 max-md:shadow-xl",
          )}
          aria-label="Vista previa en vivo"
        >
          <header className="flex shrink-0 items-center justify-between gap-2 border-b px-3 py-2">
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold">Vista previa</p>
              <p className="truncate text-xs text-muted-foreground">
                Respuestas no se guardan
              </p>
            </div>
            <Button
              size="icon-sm"
              variant="ghost"
              onClick={() => setPreviewOpen(false)}
              aria-label="Cerrar vista previa"
            >
              <X className="size-4" />
            </Button>
          </header>
          <div className="min-h-0 flex-1 overflow-y-auto">
            <div key={previewRunKey} className="flex min-h-full flex-col">
              <SurveyRunner
                preview
                title={title}
                description={description}
                questions={previewQuestions}
                edges={previewEdges}
                rootQuestionId={previewRootId}
                questionCodes={questionCodesRecord}
                previewFocusQuestionId={previewFocusQuestionId}
                design={liveDesign}
                options={liveOptions}
                onPreviewStateChange={handlePreviewState}
              />
            </div>
          </div>
        </aside>
      ) : null}

      {sidePanel === "options" ? (
        <OptionsPanel
          value={optionsState}
          onChange={(next) => {
            setOptionsState(next);
            void updateSurveyOptions(surveyId, next).then((result) => {
              if (result.error) toast.error(result.error);
            });
          }}
          onClose={() => setSidePanel(null)}
        />
      ) : null}

      {sidePanel === "comments" ? (
        <CommentsPanel
          surveyId={surveyId}
          comments={comments}
          onCommentsChange={setComments}
          targets={orderedQuestions.map((q) => ({ id: q.id, code: q.code, title: q.title }))}
          defaultQuestionId={null}
          currentUserId={currentUserId}
          onClose={() => setSidePanel(null)}
        />
      ) : null}
    </div>
  );
}
