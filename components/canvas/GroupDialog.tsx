"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import type { CanvasGroup } from "@/lib/question-groups";

export type GroupChoice = { newName: string } | { groupId: string };

export function GroupDialog({
  count,
  groups,
  pending,
  onCancel,
  onConfirm,
}: {
  count: number;
  groups: CanvasGroup[];
  pending: boolean;
  onCancel: () => void;
  onConfirm: (choice: GroupChoice) => void;
}) {
  const [mode, setMode] = useState<"new" | "existing">(groups.length === 0 ? "new" : "existing");
  const [name, setName] = useState("");
  const [groupId, setGroupId] = useState(groups[0]?.id ?? "");

  const canConfirm = mode === "new" ? name.trim().length > 0 : groupId !== "";

  return (
    <Dialog open onOpenChange={(next) => !pending && !next && onCancel()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Agrupar {count === 1 ? "la pregunta" : `${count} preguntas`}</DialogTitle>
          <DialogDescription>
            Las preguntas de un grupo se mueven juntas en el canvas. Una pregunta puede estar en un solo grupo.
          </DialogDescription>
        </DialogHeader>
        <form
          id="group-form"
          className="flex flex-col gap-4"
          onSubmit={(event) => {
            event.preventDefault();
            if (!canConfirm) return;
            onConfirm(mode === "new" ? { newName: name } : { groupId });
          }}
        >
          <label className="flex items-center gap-2 text-sm">
            <input type="radio" checked={mode === "new"} onChange={() => setMode("new")} />
            Grupo nuevo
          </label>
          {mode === "new" ? (
            <Input
              autoFocus
              value={name}
              maxLength={60}
              onChange={(e) => setName(e.target.value)}
              placeholder="Por ejemplo: Datos personales"
              aria-label="Nombre del grupo"
            />
          ) : null}
          {groups.length > 0 ? (
            <>
              <label className="flex items-center gap-2 text-sm">
                <input type="radio" checked={mode === "existing"} onChange={() => setMode("existing")} />
                Agregar a un grupo existente
              </label>
              {mode === "existing" ? (
                <select
                  value={groupId}
                  onChange={(e) => setGroupId(e.target.value)}
                  aria-label="Grupo"
                  className="h-8 rounded-lg border border-input bg-transparent px-2 text-sm"
                >
                  {groups.map((g) => (
                    <option key={g.id} value={g.id}>
                      {g.name}
                    </option>
                  ))}
                </select>
              ) : null}
            </>
          ) : null}
        </form>
        <DialogFooter>
          <Button variant="outline" disabled={pending} onClick={onCancel}>
            Cancelar
          </Button>
          <Button type="submit" form="group-form" disabled={pending || !canConfirm}>
            {pending ? "Agrupando..." : "Agrupar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
