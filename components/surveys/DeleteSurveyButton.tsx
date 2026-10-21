"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { deleteSurvey } from "@/actions/surveys";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

export function DeleteSurveyButton({
  surveyId,
  surveyTitle,
}: {
  surveyId: string;
  surveyTitle: string;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!isPending) setOpen(next);
      }}
    >
      <DialogTrigger
        render={
          <Button
            size="sm"
            variant="ghost"
            className="text-destructive hover:text-destructive"
          />
        }
      >
        Eliminar
      </DialogTrigger>
      <DialogContent showCloseButton={!isPending} className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>¿Eliminar esta encuesta?</DialogTitle>
          <DialogDescription>
            Se va a borrar permanentemente «{surveyTitle}», con sus preguntas y
            respuestas. Esta acción no se puede deshacer.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            disabled={isPending}
            onClick={() => setOpen(false)}
          >
            Cancelar
          </Button>
          <Button
            type="button"
            variant="destructive"
            disabled={isPending}
            onClick={() => {
              startTransition(async () => {
                try {
                  await deleteSurvey(surveyId);
                  toast.success("Encuesta eliminada");
                  router.push("/dashboard");
                  router.refresh();
                } catch (error) {
                  toast.error(
                    error instanceof Error
                      ? error.message
                      : "No se pudo eliminar la encuesta",
                  );
                }
              });
            }}
          >
            {isPending ? "Eliminando..." : "Eliminar encuesta"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
