"use client";

import { useEffect, useRef, useState } from "react";
import { Check, Pencil, Ungroup } from "lucide-react";
import type { Node, NodeProps } from "@xyflow/react";
import { cn } from "@/lib/utils";
import type { GroupColor } from "@/lib/question-groups";

export type GroupNodeData = {
  name: string;
  color: GroupColor;
  count: number;
  /** A card is being dragged over this group: it will be added on drop. */
  highlight?: boolean;
  onRename: (name: string) => void;
  onUngroup: () => void;
  [key: string]: unknown;
};

export type GroupFlowNode = Node<GroupNodeData, "group">;

const TONES: Record<GroupColor, { box: string; header: string }> = {
  slate: { box: "border-slate-400/60 bg-slate-500/5", header: "bg-slate-500/15 text-slate-700 dark:text-slate-200" },
  blue: { box: "border-blue-400/60 bg-blue-500/5", header: "bg-blue-500/15 text-blue-700 dark:text-blue-200" },
  green: { box: "border-emerald-400/60 bg-emerald-500/5", header: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-200" },
  amber: { box: "border-amber-400/60 bg-amber-500/5", header: "bg-amber-500/15 text-amber-700 dark:text-amber-200" },
  rose: { box: "border-rose-400/60 bg-rose-500/5", header: "bg-rose-500/15 text-rose-700 dark:text-rose-200" },
  violet: { box: "border-violet-400/60 bg-violet-500/5", header: "bg-violet-500/15 text-violet-700 dark:text-violet-200" },
};

/**
 * A labelled box drawn behind a set of question cards. Only the header is draggable (the body lets
 * clicks through so the cards inside stay selectable); dragging the header moves every card in it.
 */
export function GroupNode({ data }: NodeProps<GroupFlowNode>) {
  const tone = TONES[data.color];
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(data.name);
  const inputRef = useRef<HTMLInputElement>(null);

  // React Flow grabs focus when a card is clicked, so focus the field after it has settled.
  useEffect(() => {
    if (!editing) return;
    const id = window.setTimeout(() => {
      inputRef.current?.focus();
      inputRef.current?.select();
    }, 0);
    return () => window.clearTimeout(id);
  }, [editing]);

  function commit() {
    const name = draft.trim();
    setEditing(false);
    if (name && name !== data.name) data.onRename(name);
    else setDraft(data.name);
  }

  return (
    <div
      className={cn(
        "pointer-events-none h-full w-full rounded-2xl border-2 border-dashed transition-shadow",
        tone.box,
        data.highlight && "border-solid shadow-[0_0_0_6px] shadow-foreground/15 ring-2 ring-foreground/60",
      )}
    >
      <div
        className={cn(
          "group-drag-handle pointer-events-auto flex h-9 cursor-grab items-center gap-2 rounded-t-[13px] px-3 text-sm font-semibold active:cursor-grabbing",
          tone.header,
        )}
      >
        {editing ? (
          <input
            ref={inputRef}
            value={draft}
            maxLength={60}
            onChange={(e) => setDraft(e.target.value)}
            onBlur={commit}
            onKeyDown={(e) => {
              if (e.key === "Enter") commit();
              if (e.key === "Escape") {
                setDraft(data.name);
                setEditing(false);
              }
            }}
            aria-label="Nombre del grupo"
            className="nodrag min-w-0 flex-1 rounded bg-background/80 px-1.5 py-0.5 text-sm font-semibold text-foreground outline-none"
          />
        ) : (
          <span className="min-w-0 flex-1 truncate" onDoubleClick={() => { setDraft(data.name); setEditing(true); }}>
            {data.name}
          </span>
        )}
        {data.highlight ? (
          <span className="shrink-0 rounded-full bg-foreground px-2 py-0.5 text-xs font-medium text-background">Suelta para agregar</span>
        ) : null}
        <span className="shrink-0 text-xs font-normal opacity-70">{data.count}</span>
        {editing ? (
          <button type="button" aria-label="Guardar nombre" onMouseDown={(e) => e.preventDefault()} onClick={commit} className="nodrag rounded p-1 hover:bg-background/50">
            <Check className="size-3.5" />
          </button>
        ) : (
          <button type="button" aria-label="Renombrar grupo" onClick={() => { setDraft(data.name); setEditing(true); }} className="nodrag rounded p-1 hover:bg-background/50">
            <Pencil className="size-3.5" />
          </button>
        )}
        <button type="button" aria-label="Desagrupar" title="Desagrupar (las preguntas se mantienen)" onClick={data.onUngroup} className="nodrag rounded p-1 hover:bg-background/50">
          <Ungroup className="size-3.5" />
        </button>
      </div>
    </div>
  );
}
