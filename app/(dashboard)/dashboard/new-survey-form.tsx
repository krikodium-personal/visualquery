"use client";

import { useActionState, useState } from "react";
import { createSurvey } from "@/actions/surveys";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

export function NewSurveyForm() {
  const [open, setOpen] = useState(false);
  const [state, formAction, pending] = useActionState(createSurvey, undefined);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button>Nueva encuesta</Button>} />
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Nueva encuesta</DialogTitle>
        </DialogHeader>
        <form action={formAction} className="flex flex-col gap-4">
          <Input name="title" placeholder="Título de la encuesta" autoFocus required />
          {state?.error && <p className="text-sm text-destructive">{state.error}</p>}
          <Button type="submit" disabled={pending}>
            {pending ? "Creando..." : "Crear y editar"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
