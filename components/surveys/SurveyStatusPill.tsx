"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { setSurveyStatus } from "@/actions/surveys";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

type Status = "draft" | "published" | "closed";

const STATES = [
  { value: "draft", label: "Borrador", description: "En preparación. No acepta respuestas.", style: "border-[#B1ABA0] bg-[#E2DFDA]" },
  { value: "published", label: "Abierta", description: "Disponible para responder desde el link público.", style: "border-[#B9DD46] bg-[#E2EDAF]" },
  { value: "closed", label: "Cerrado", description: "No acepta nuevas respuestas. Conserva los resultados.", style: "border-[#EDBF16] bg-[#F5E5A7]" },
] as const;

const pillClass = "inline-flex rounded-md border px-2.5 py-1 text-sm font-semibold text-[#4B4945]";

export function SurveyStatusPill({ surveyId, status, className }: { surveyId: string; status: Status; className?: string }) {
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const current = STATES.find((state) => state.value === status)!;

  const changeStatus = (next: Status) => {
    if (next === status) { setOpen(false); return; }
    startTransition(async () => {
      try {
        await setSurveyStatus(surveyId, next);
        setOpen(false);
        toast.success("Estado actualizado");
      } catch (error) {
        const emptySurvey =
          error instanceof Error &&
          error.message.includes("Agregá al menos una pregunta");
        toast.error(
          emptySurvey
            ? "Agregá al menos una pregunta antes de abrir la encuesta"
            : "No se pudo cambiar el estado. Intentá de nuevo.",
        );
      }
    });
  };

  return (
    <Dialog open={open} onOpenChange={(next) => { if (!pending) setOpen(next); }}>
      <DialogTrigger render={<button type="button" />} className={cn(pillClass, current.style, "cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2", className)} aria-label={`Cambiar estado: ${current.label}`}>
        {current.label}
      </DialogTrigger>
      <DialogContent showCloseButton={!pending}>
        <DialogHeader>
          <DialogTitle>Cambiar estado</DialogTitle>
          <DialogDescription>Elegí el estado de la encuesta. Se guarda al seleccionarlo.</DialogDescription>
        </DialogHeader>
        <div className="flex flex-col gap-2" aria-busy={pending}>
          {STATES.map((state) => (
            <button key={state.value} type="button" disabled={pending} onClick={() => changeStatus(state.value)} aria-pressed={status === state.value} className="flex cursor-pointer flex-col items-start gap-2 rounded-lg border p-3 text-left hover:bg-muted/50 focus-visible:outline-2 disabled:cursor-wait disabled:opacity-50 aria-pressed:ring-1 aria-pressed:ring-[#B1ABA0]">
              <span className={cn(pillClass, state.style)}>{state.label}</span>
              <span className="text-xs text-muted-foreground">{state.description}{status === state.value ? " · Estado actual" : ""}</span>
            </button>
          ))}
        </div>
        {pending && <p role="status" className="text-sm text-muted-foreground">Guardando...</p>}
      </DialogContent>
    </Dialog>
  );
}
