"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Lock, MoreHorizontal } from "lucide-react";
import { toast } from "sonner";
import { deleteSurvey, duplicateSurvey } from "@/actions/surveys";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export function SurveyRowActions({
  surveyId,
  title,
  status,
  slug,
}: {
  surveyId: string;
  title: string;
  status: "draft" | "published" | "closed";
  slug: string;
}) {
  const router = useRouter();
  const [menuOpen, setMenuOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

  function copyShareLink() {
    const url = `${window.location.origin}/s/${slug}`;
    void navigator.clipboard.writeText(url);
    toast.success("Link de la encuesta copiado");
  }

  function handleDuplicate() {
    startTransition(async () => {
      try {
        const newId = await duplicateSurvey(surveyId);
        toast.success("Copia creada");
        router.push(`/surveys/${newId}/questions`);
        router.refresh();
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "No se pudo copiar");
      }
    });
  }

  function handleDelete() {
    startTransition(async () => {
      try {
        await deleteSurvey(surveyId);
        toast.success("Encuesta eliminada");
        setDeleteOpen(false);
        router.refresh();
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "No se pudo eliminar");
      }
    });
  }

  return (
    <>
      <DropdownMenu open={menuOpen} onOpenChange={setMenuOpen}>
        <DropdownMenuTrigger
          render={
            <Button
              variant="ghost"
              size="icon-sm"
              aria-label={`Opciones de ${title}`}
              className="shrink-0"
            />
          }
        >
          <MoreHorizontal className="size-4" />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="min-w-64 p-1" sideOffset={6}>
          <p className="truncate px-2 py-1.5 text-sm font-semibold">{title}</p>

          <DropdownMenuItem
            className="cursor-pointer px-2 py-2"
            onClick={() => router.push(`/surveys/${surveyId}/questions`)}
          >
            Editar encuesta
          </DropdownMenuItem>
          <DropdownMenuItem
            className="cursor-pointer px-2 py-2"
            onClick={() => {
              if (status === "published") {
                window.open(`/s/${slug}`, "_blank", "noopener,noreferrer");
              } else {
                router.push(`/surveys/${surveyId}/design`);
                toast.message("Vista previa desde Diseño (la encuesta aún no está abierta)");
              }
            }}
          >
            Checa la encuesta
          </DropdownMenuItem>
          <DropdownMenuItem
            className="cursor-pointer px-2 py-2"
            onClick={() => router.push(`/surveys/${surveyId}/publish`)}
          >
            Envía tu encuesta
          </DropdownMenuItem>
          <DropdownMenuItem
            className="cursor-pointer px-2 py-2"
            onClick={() => router.push(`/surveys/${surveyId}/results`)}
          >
            Analiza los resultados
          </DropdownMenuItem>
          <DropdownMenuItem disabled className="px-2 py-2 opacity-50">
            Elegir un público
          </DropdownMenuItem>

          <DropdownMenuSeparator />

          <DropdownMenuItem disabled className="px-2 py-2 opacity-50">
            Administrar notificaciones
          </DropdownMenuItem>
          <DropdownMenuItem disabled className="px-2 py-2 opacity-50">
            Mover a carpeta
          </DropdownMenuItem>
          <DropdownMenuItem disabled className="px-2 py-2 opacity-50">
            <span className="flex w-full items-center justify-between gap-2">
              Agregar al programa
              <span className="rounded bg-teal-100 px-1.5 py-0.5 text-[10px] font-semibold text-teal-900">
                Nuevo
              </span>
            </span>
          </DropdownMenuItem>
          <DropdownMenuItem disabled className="px-2 py-2 opacity-50">
            Transferir
          </DropdownMenuItem>
          <DropdownMenuItem
            className="cursor-pointer px-2 py-2"
            onClick={() => {
              if (status === "published") copyShareLink();
              else {
                router.push(`/surveys/${surveyId}/publish`);
                toast.message("Abrí la encuesta para compartir el link público");
              }
            }}
          >
            <span className="flex w-full items-center justify-between gap-2">
              Compartir
              <Lock className="size-3.5 opacity-70" />
            </span>
          </DropdownMenuItem>
          <DropdownMenuItem
            className="cursor-pointer px-2 py-2"
            disabled={isPending}
            onClick={handleDuplicate}
          >
            Hacer una copia
          </DropdownMenuItem>
          <DropdownMenuItem
            variant="destructive"
            className="cursor-pointer px-2 py-2"
            onClick={() => {
              setMenuOpen(false);
              setDeleteOpen(true);
            }}
          >
            Eliminar
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <Dialog
        open={deleteOpen}
        onOpenChange={(next) => {
          if (!isPending) setDeleteOpen(next);
        }}
      >
        <DialogContent showCloseButton={!isPending} className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>¿Eliminar esta encuesta?</DialogTitle>
            <DialogDescription>
              Se va a borrar permanentemente «{title}», con sus preguntas y respuestas. Esta
              acción no se puede deshacer.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              disabled={isPending}
              onClick={() => setDeleteOpen(false)}
            >
              Cancelar
            </Button>
            <Button
              type="button"
              variant="destructive"
              disabled={isPending}
              onClick={handleDelete}
            >
              {isPending ? "Eliminando…" : "Eliminar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
