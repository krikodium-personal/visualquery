"use client";

import { useMemo } from "react";
import { Layer, Rectangle, ResponsiveContainer, Sankey, Tooltip } from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  buildResponseFlowGraph,
  FLOW_COMPLETE_ID,
  FLOW_DROPOUT_ID,
  type FlowNodeKind,
  type ResponseFlowGraph,
} from "@/lib/response-flow";
import type { AnalysisEdge, AnalysisQuestion, AnalysisResponse } from "@/lib/analysis";

const NODE_COLORS: Record<FlowNodeKind, string> = {
  start: "hsl(0 0% 96%)",
  question: "hsl(152 55% 42%)",
  complete: "hsl(152 60% 36%)",
  dropout: "hsl(4 80% 56%)",
};

export function ResponseFlowChart({
  questions,
  edges,
  responses,
}: {
  questions: AnalysisQuestion[];
  edges: AnalysisEdge[];
  responses: AnalysisResponse[];
}) {
  const graph = useMemo(
    () => buildResponseFlowGraph(questions, edges, responses),
    [questions, edges, responses],
  );

  if (responses.length === 0) {
    return (
      <Card>
        <CardContent className="py-12 text-center text-muted-foreground">
          Todavía no hay respuestas para armar el flujo.
        </CardContent>
      </Card>
    );
  }

  if (graph.links.length === 0) {
    return (
      <Card>
        <CardContent className="py-12 text-center text-muted-foreground">
          No se pudo reconstruir el flujo con las respuestas actuales.
        </CardContent>
      </Card>
    );
  }

  const height = Math.max(320, Math.min(720, 80 + graph.nodes.length * 48));
  const sankeyData = {
    nodes: graph.nodes.map((node) => ({
      name: node.name,
      kind: node.kind,
      count: node.count,
      id: node.id,
    })),
    links: graph.links.map((link) => ({
      source: link.source,
      target: link.target,
      value: link.value,
      label: link.label,
      toDropout: link.targetId === FLOW_DROPOUT_ID,
      toComplete: link.targetId === FLOW_COMPLETE_ID,
    })),
  };

  return (
    <Card>
      <CardHeader className="gap-2">
        <CardTitle className="text-base">Flujo de respuestas</CardTitle>
        <p className="text-sm text-muted-foreground">
          Cómo avanzan los encuestados por las preguntas y ramas. El grosor indica
          volumen; el rojo marca abandonos.
        </p>
        <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
          <LegendDot color={NODE_COLORS.question} label="Pregunta" />
          <LegendDot color={NODE_COLORS.complete} label={`Completada (${graph.completedCount})`} />
          <LegendDot color={NODE_COLORS.dropout} label={`Abandono (${graph.dropoutCount})`} />
        </div>
      </CardHeader>
      <CardContent>
        <div style={{ height }} className="w-full">
          <ResponsiveContainer width="100%" height="100%">
            <Sankey
              data={sankeyData}
              nodeWidth={14}
              nodePadding={28}
              iterations={64}
              margin={{ left: 8, right: 160, top: 12, bottom: 12 }}
              linkCurvature={0.5}
              node={<FlowNode />}
              link={<FlowLink />}
            >
              <Tooltip content={<FlowTooltip graph={graph} />} />
            </Sankey>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}

function LegendDot({ color, label }: { color: string; label: string }) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <span className="size-2.5 rounded-sm" style={{ background: color }} />
      {label}
    </span>
  );
}

function FlowNode(props: {
  x?: number;
  y?: number;
  width?: number;
  height?: number;
  payload?: { name?: string; kind?: FlowNodeKind; count?: number };
}) {
  const { x = 0, y = 0, width = 0, height = 0, payload } = props;
  const kind = payload?.kind ?? "question";
  const fill = NODE_COLORS[kind];
  const label = payload?.name ?? "";
  const count = payload?.count ?? 0;

  return (
    <Layer>
      <Rectangle
        x={x}
        y={y}
        width={width}
        height={height}
        fill={fill}
        stroke={kind === "start" ? "hsl(0 0% 80%)" : fill}
        radius={2}
      />
      {kind === "dropout" ? (
        <Rectangle
          x={x + width + 2}
          y={y}
          width={4}
          height={height}
          fill={NODE_COLORS.dropout}
          radius={1}
        />
      ) : null}
      <text
        x={x + width + 10}
        y={y + height / 2}
        textAnchor="start"
        dominantBaseline="middle"
        style={{ fontSize: 12, fill: "var(--foreground)" }}
      >
        <tspan x={x + width + 10} dy="-0.35em" style={{ fontWeight: 600 }}>
          {label}
        </tspan>
        <tspan
          x={x + width + 10}
          dy="1.25em"
          style={{ fill: "var(--muted-foreground)", fontSize: 11 }}
        >
          {count.toLocaleString("es-AR")}
        </tspan>
      </text>
    </Layer>
  );
}

function FlowLink(props: {
  sourceX?: number;
  targetX?: number;
  sourceY?: number;
  targetY?: number;
  sourceControlX?: number;
  targetControlX?: number;
  linkWidth?: number;
  payload?: { toDropout?: boolean; toComplete?: boolean };
}) {
  const {
    sourceX = 0,
    targetX = 0,
    sourceY = 0,
    targetY = 0,
    sourceControlX = 0,
    targetControlX = 0,
    linkWidth = 0,
    payload,
  } = props;

  const stroke = payload?.toDropout
    ? "hsla(4, 80%, 56%, 0.45)"
    : payload?.toComplete
      ? "hsla(152, 55%, 40%, 0.35)"
      : "hsla(0, 0%, 45%, 0.28)";

  return (
    <path
      d={`
        M${sourceX},${sourceY}
        C${sourceControlX},${sourceY} ${targetControlX},${targetY} ${targetX},${targetY}
      `}
      fill="none"
      stroke={stroke}
      strokeWidth={Math.max(linkWidth, 1)}
    />
  );
}

function FlowTooltip({
  active,
  payload,
  graph,
}: {
  active?: boolean;
  payload?: Array<{ payload?: Record<string, unknown> }>;
  graph: ResponseFlowGraph;
}) {
  if (!active || !payload?.length) return null;
  const item = payload[0]?.payload ?? {};

  // Link tooltip
  if (typeof item.source === "number" && typeof item.target === "number") {
    const sourceNode = graph.nodes[item.source as number];
    const targetNode = graph.nodes[item.target as number];
    const value = Number(item.value ?? 0);
    const label = typeof item.label === "string" ? item.label : undefined;
    return (
      <div className="rounded-lg border bg-popover px-3 py-2 text-xs text-popover-foreground shadow-md">
        <p className="font-medium">
          {sourceNode?.name ?? "?"} → {targetNode?.name ?? "?"}
        </p>
        {label ? <p className="text-muted-foreground">Rama: {label}</p> : null}
        <p className="mt-1 tabular-nums">{value.toLocaleString("es-AR")} respuestas</p>
      </div>
    );
  }

  // Node tooltip
  const name = typeof item.name === "string" ? item.name : "Nodo";
  const count = Number(item.count ?? 0);
  return (
    <div className="rounded-lg border bg-popover px-3 py-2 text-xs text-popover-foreground shadow-md">
      <p className="font-medium">{name}</p>
      <p className="mt-1 tabular-nums">{count.toLocaleString("es-AR")} llegadas</p>
    </div>
  );
}
