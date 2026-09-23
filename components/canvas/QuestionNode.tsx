"use client";

import { Handle, Position, type Node, type NodeProps } from "@xyflow/react";
import { Pencil, Plus, Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { QuestionOption } from "@/lib/question-options";
import { optionPoints } from "@/lib/question-options";
import { BRANCHABLE_TYPES, QUESTION_TYPE_LABELS, type QuestionType } from "@/lib/question-types";
import { QuestionTypeIcon } from "@/components/questions/QuestionTypeIcon";

export type { QuestionOption };

/** Target handle ids: a question is entered from the top when it follows the
 * previous one in sequence, and from the left when it's a branch. */
export const TARGET_NEXT = "target-next";
export const TARGET_BRANCH = "target-branch";

export type QuestionNodeData = {
  questionId: string;
  code: string;
  title: string;
  type: QuestionType;
  options: QuestionOption[];
  isRoot: boolean;
  required: boolean;
  scoringEnabled: boolean;
  minSelections: number | null;
  maxSelections: number | null;
  selectionErrorMessage: string | null;
  onEdit: () => void;
  onDelete: () => void;
  onAddNext: () => void;
  onAddBranch: (option: QuestionOption) => void;
};

export type QuestionNode = Node<QuestionNodeData, "question">;

const isBranchable = (type: QuestionNodeData["type"]) => BRANCHABLE_TYPES.includes(type);

export function QuestionNode({ data, selected }: NodeProps<QuestionNode>) {
  const branchable = isBranchable(data.type);

  return (
    <div
      className={cn(
        "relative w-64 rounded-xl border bg-card text-card-foreground shadow-sm",
        selected && "ring-2 ring-ring",
      )}
    >
      <span
        className="absolute -top-2.5 -left-2.5 flex size-6 items-center justify-center rounded-full border bg-background text-[10px] font-semibold tabular-nums"
        title={`Pregunta ${data.code}`}
      >
        {data.code}
      </span>

      {/* Two ways in: from the previous question in the sequence (top), or
          from a branch coming off the right side of another card (left). */}
      <Handle
        type="target"
        id={TARGET_NEXT}
        position={Position.Top}
        className="!bg-muted-foreground"
      />
      <Handle
        type="target"
        id={TARGET_BRANCH}
        position={Position.Left}
        className="!bg-muted-foreground"
      />

      <div className="flex items-start justify-between gap-2 border-b p-3">
        <div className="min-w-0">
          <div className="mb-1 flex flex-wrap gap-1">
            <Badge variant="secondary">
              <QuestionTypeIcon type={data.type} className="size-3" />
              {QUESTION_TYPE_LABELS[data.type]}
            </Badge>
            {!data.required && <Badge variant="outline">Opcional</Badge>}
            {data.scoringEnabled && <Badge variant="outline">Test</Badge>}
          </div>
          <p className="line-clamp-2 text-sm font-medium">{data.title}</p>
        </div>
        <div className="flex shrink-0 gap-1">
          <Button size="icon-xs" variant="ghost" onClick={data.onEdit} aria-label="Editar">
            <Pencil className="size-3" />
          </Button>
          <Button
            size="icon-xs"
            variant="ghost"
            className="text-destructive hover:text-destructive"
            onClick={data.onDelete}
            aria-label="Eliminar"
          >
            <Trash2 className="size-3" />
          </Button>
        </div>
      </div>

      {branchable && data.options.length > 0 && (
        <div className="flex flex-col divide-y">
          {data.options.map((option) => {
            const points = data.scoringEnabled ? optionPoints(option) : 0;
            return (
              <div key={option.value} className="relative flex items-center justify-between gap-2 px-3 py-2 text-xs">
                <span className="min-w-0 truncate">{option.label}</span>
                <div className="flex shrink-0 items-center gap-1.5">
                  {points > 0 && (
                    <span
                      className="flex size-5 items-center justify-center rounded-full bg-emerald-600 text-[10px] font-semibold tabular-nums text-white"
                      title={`${points} ${points === 1 ? "punto" : "puntos"}`}
                      aria-label={`${points} ${points === 1 ? "punto" : "puntos"}`}
                    >
                      {points}
                    </span>
                  )}
                  <button
                    type="button"
                    onClick={() => data.onAddBranch(option)}
                    className="flex size-5 items-center justify-center rounded-full border text-muted-foreground hover:bg-muted"
                    title={`Agregar pregunta si responde "${option.label}"`}
                  >
                    <Plus className="size-3" />
                  </button>
                </div>
                <Handle
                  type="source"
                  position={Position.Right}
                  id={`option-${option.value}`}
                  className="!bg-primary"
                  style={{ top: "50%" }}
                />
              </div>
            );
          })}
        </div>
      )}

      <div className="relative flex items-center justify-center border-t p-2">
        <button
          type="button"
          onClick={data.onAddNext}
          className="flex items-center gap-1 rounded-md px-2 py-1 text-xs text-muted-foreground hover:bg-muted"
          title="Agregar siguiente pregunta"
        >
          <Plus className="size-3" /> Siguiente
        </button>
        <Handle
          type="source"
          position={Position.Bottom}
          id="default"
          className="!bg-primary"
        />
      </div>
    </div>
  );
}
