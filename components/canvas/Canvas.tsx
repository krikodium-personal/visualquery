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
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Plus, Save, Eye, X, LayoutGrid } from "lucide-react";
import {
  QuestionNode,
  TARGET_BRANCH,
  TARGET_NEXT,
  type QuestionNodeData,
  type QuestionOption,
} from "./QuestionNode";
import { EditQuestionPanel, type QuestionFormValues } from "./EditQuestionPanel";
import { SurveyRunner } from "@/components/survey-runtime/SurveyRunner";
import { computeLayout, placeNewQuestion } from "@/lib/layout";
import type { SurveyDesign } from "@/lib/survey-design";
import { computeQuestionCodes } from "@/lib/question-codes";
import { applyCanvasChanges } from "@/actions/canvas";
import { togglePublish } from "@/actions/surveys";

const nodeTypes = { question: QuestionNode };
const edgeMarker = {
  type: MarkerType.ArrowClosed,
  width: 18,
  height: 18,
};
const EDGE_RECONNECT_RADIUS = 20;

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
  minSelections: number | null;
  maxSelections: number | null;
  selectionErrorMessage: string | null;
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
      minSelections: q.minSelections,
      maxSelections: q.maxSelections,
      selectionErrorMessage: q.selectionErrorMessage,
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
  status,
  design,
  questions,
  edges: surveyEdges,
}: {
  surveyId: string;
  title: string;
  description: string | null;
  status: "draft" | "published" | "closed";
  design: SurveyDesign;
  questions: SurveyQuestion[];
  edges: SurveyEdge[];
}) {
  const [dialog, setDialog] = useState<DialogState | null>(null);
  const [dirty, setDirty] = useState(false);
  const [applying, setApplying] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewStatus, setPreviewStatus] = useState(status);
  const [publishing, setPublishing] = useState(false);

  const initialNodes = useMemo(() => buildInitialNodes(questions), []); // eslint-disable-line react-hooks/exhaustive-deps
  const initialEdges = useMemo(() => buildInitialEdges(questions, surveyEdges), []); // eslint-disable-line react-hooks/exhaustive-deps

  const [nodes, setNodes, onNodesChangeBase] = useNodesState<QuestionNode>(initialNodes);
  const [edges, setEdges, onEdgesChangeBase] = useEdgesState(initialEdges);

  // Handlers need the *latest* nodes/edges without going stale, but should
  // keep a stable identity (they're baked into node `data` at creation time).
  // Refs give them that without re-creating the whole node/edge arrays on
  // every keystroke.
  const nodesRef = useRef(nodes);
  const edgesRef = useRef(edges);
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
      setDirty(true);
    },
    [setNodes, setEdges],
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
    },
    [commitGraph],
  );

  const onNodesChange = useCallback(
    (changes: NodeChange<QuestionNode>[]) => {
      onNodesChangeBase(changes);
      if (changes.some((c) => c.type === "position" && c.dragging === false)) {
        setDirty(true);
      }
    },
    [onNodesChangeBase],
  );

  const onEdgesChange = useCallback(
    (changes: EdgeChange[]) => {
      onEdgesChangeBase(changes);
      // Removing a connector never repositions cards — only adding a new
      // question/connection does, so the card stays exactly where it was.
      if (changes.some((c) => c.type === "remove")) {
        setDirty(true);
      }
    },
    [onEdgesChangeBase],
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
      commitGraph(nodesRef.current, addEdge(newEdge, filtered));
    },
    [commitGraph],
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
    },
    [commitGraph],
  );

  const handleCreateSubmit = useCallback(
    async (values: QuestionFormValues) => {
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
                  minSelections: values.minSelections,
                  maxSelections: values.maxSelections,
                  selectionErrorMessage: values.selectionErrorMessage,
                },
              }
            : n,
        );
        const newEdges = edgesRef.current
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
        commitGraph(newNodes, newEdges);
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
          minSelections: values.minSelections,
          maxSelections: values.maxSelections,
          selectionErrorMessage: values.selectionErrorMessage,
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

      commitGraph([...nodesRef.current, newNode], newEdges);
    },
    [dialog, commitGraph],
  );

  const handleApply = useCallback(async () => {
    setApplying(true);
    try {
      const payload = {
        questions: nodesRef.current.map((n) => ({
          id: n.id,
          title: n.data.title,
          type: n.data.type,
          options: n.data.options,
          positionX: n.position.x,
          positionY: n.position.y,
          isRoot: n.data.isRoot,
          required: n.data.required,
          minSelections: n.data.minSelections ?? null,
          maxSelections: n.data.maxSelections ?? null,
          selectionErrorMessage: n.data.selectionErrorMessage ?? null,
        })),
        edges: edgesRef.current.map((e) => ({
          sourceQuestionId: e.source,
          targetQuestionId: e.target,
          sourceOptionValue: optionValueFromHandle(e.sourceHandle),
        })),
      };
      const { questionIdMap } = await applyCanvasChanges(surveyId, payload);

      if (Object.keys(questionIdMap).length > 0) {
        setNodes((nds) =>
          nds.map((n) => {
            const realId = questionIdMap[n.id];
            if (!realId) return n;
            return { ...n, id: realId, data: { ...n.data, questionId: realId } };
          }),
        );
        setEdges((eds) =>
          eds.map((e) => ({
            ...e,
            source: questionIdMap[e.source] ?? e.source,
            target: questionIdMap[e.target] ?? e.target,
          })),
        );
      }

      setDirty(false);
      toast.success("Cambios aplicados");
    } catch {
      toast.error("No se pudieron aplicar los cambios");
    } finally {
      setApplying(false);
    }
  }, [surveyId, setNodes, setEdges]);

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

  const nodesForFlow = useMemo(
    () =>
      nodes.map((n) => ({
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
    [nodes, codes, handleDeleteQuestion],
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
        minSelections: editingNode.data.minSelections ?? null,
        maxSelections: editingNode.data.maxSelections ?? null,
        selectionErrorMessage: editingNode.data.selectionErrorMessage ?? null,
      }
    : undefined;
  const editingCode = editingNode ? codes.get(editingNode.id) : undefined;

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
        minSelections: n.data.minSelections ?? null,
        maxSelections: n.data.maxSelections ?? null,
        selectionErrorMessage: n.data.selectionErrorMessage ?? null,
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
  const previewRootId = nodes.find((n) => n.data.isRoot)?.id ?? nodes[0]?.id ?? null;

  const handleTogglePublish = useCallback(async () => {
    setPublishing(true);
    try {
      await togglePublish(surveyId);
      setPreviewStatus((s) => (s === "published" ? "closed" : "published"));
      toast.success(previewStatus === "published" ? "Encuesta cerrada" : "Encuesta abierta");
    } catch {
      toast.error("No se pudo cambiar el estado de publicación");
    } finally {
      setPublishing(false);
    }
  }, [surveyId, previewStatus]);

  return (
    <div className="relative h-full w-full">
      <ReactFlow
        nodes={nodesForFlow}
        edges={edgesForFlow}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        onReconnect={onReconnect}
        edgesReconnectable
        reconnectRadius={EDGE_RECONNECT_RADIUS}
        elevateEdgesOnSelect
        nodeTypes={nodeTypes}
        fitView
        fitViewOptions={{ maxZoom: 1 }}
        proOptions={{ hideAttribution: true }}
      >
        <Background />
        <Controls />
        <MiniMap pannable zoomable className="!bg-card" />
        <Panel position="top-right" className="flex items-center gap-2">
          {dirty && <span className="text-xs text-muted-foreground">Cambios sin aplicar</span>}
          <Button size="sm" variant="outline" onClick={handleAlign} disabled={nodes.length === 0}>
            <LayoutGrid className="size-4" />
            Alinear
          </Button>
          <Button size="sm" variant="outline" onClick={() => setPreviewOpen(true)} disabled={nodes.length === 0}>
            <Eye className="size-4" />
            Vista previa
          </Button>
          <Button size="sm" onClick={handleApply} disabled={!dirty || applying}>
            <Save className="size-4" />
            {applying ? "Aplicando..." : "Aplicar cambios"}
          </Button>
        </Panel>
      </ReactFlow>

      {nodes.length === 0 && (
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
          <Button className="pointer-events-auto" onClick={() => setDialog({ mode: "create-root" })}>
            <Plus className="size-4" /> Agregar primera pregunta
          </Button>
        </div>
      )}

      <EditQuestionPanel
        open={dialog !== null}
        onOpenChange={(open) => !open && setDialog(null)}
        initialValues={initialValues}
        code={editingCode}
        onSubmit={handleCreateSubmit}
      />

      {previewOpen && (
        <div className="fixed inset-0 z-50 flex flex-col bg-background">
          <header className="flex shrink-0 items-center justify-between border-b p-3">
            <Button variant="ghost" size="sm" onClick={() => setPreviewOpen(false)}>
              <X className="size-4" />
              Volver
            </Button>
            <Button size="sm" onClick={handleTogglePublish} disabled={publishing}>
              {publishing
                ? "Guardando..."
                : previewStatus === "published"
                  ? "Cerrar"
                  : "Abrir"}
            </Button>
          </header>
          <div className="flex flex-1 flex-col overflow-y-auto">
            <SurveyRunner
              preview
              title={title}
              description={description}
              questions={previewQuestions}
              edges={previewEdges}
              rootQuestionId={previewRootId}
              design={design}
            />
          </div>
        </div>
      )}
    </div>
  );
}
