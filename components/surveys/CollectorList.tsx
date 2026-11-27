"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Link2, MoreHorizontal, Plus } from "lucide-react";
import { toast } from "sonner";
import {
  createCollector,
  deleteCollector,
  duplicateCollector,
  renameCollector,
  setCollectorOpen,
} from "@/actions/collectors";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export type CollectorRow = {
  id: string;
  name: string;
  slug: string;
  open: boolean;
  responseCount: number;
  responseLimit: number | null;
  createdAt: string;
};

type NameDialog = { mode: "create" } | { mode: "rename"; collector: CollectorRow } | null;

/** Every way of reaching respondents for this survey, each with its own link and counts. */
export function CollectorList({
  surveyId,
  origin,
  collectors,
  surveyOpen,
}: {
  surveyId: string;
  origin: string;
  collectors: CollectorRow[];
  surveyOpen: boolean;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [nameDialog, setNameDialog] = useState<NameDialog>(null);
  const [nameDraft, setNameDraft] = useState("");
  const [toDelete, setToDelete] = useState<CollectorRow | null>(null);

  const openNameDialog = (dialog: Exclude<NameDialog, null>) => {
    setNameDraft(dialog.mode === "rename" ? dialog.collector.name : `Enlace web ${collectors.length + 1}`);
    setNameDialog(dialog);
  };

  const submitName = () =>
    startTransition(async () => {
      if (!nameDialog) return;
      const result =
        nameDialog.mode === "create"
          ? await createCollector(surveyId, nameDraft)
          : await renameCollector(nameDialog.collector.id, nameDraft);
      if (result.error) {
        toast.error(result.error);
        return;
      }
      setNameDialog(null);
      if (nameDialog.mode === "create" && result.id) {
        toast.success("Recopilador creado");
        router.push(`/surveys/${surveyId}/publish/${result.id}`);
      } else {
        toast.success("Nombre actualizado");
        router.refresh();
      }
    });

  const run = (action: () => Promise<{ error?: string; id?: string }>, success: string) =>
    startTransition(async () => {
      const result = await action();
      if (result.error) {
        toast.error(result.error);
        return;
      }
      toast.success(success);
      router.refresh();
    });

  const copyUrl = async (collector: CollectorRow) => {
    await navigator.clipboard.writeText(`${origin}/s/${collector.slug}`);
    toast.success("Link copiado");
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between gap-3">
          <CardTitle className="text-base">Recopiladores</CardTitle>
          <Button size="sm" onClick={() => openNameDialog({ mode: "create" })}>
            <Plus className="size-4" /> Agregar recopilador
          </Button>
        </div>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        <p className="text-sm text-muted-foreground">
          Cada recopilador tiene su propio link, contraseña, límite y fecha de corte, y cuenta sus
          propias respuestas. Creá uno por canal (por ejemplo Instagram, mail o un evento) para ver
          de dónde llegan.
          {!surveyOpen ? " Mientras la encuesta no esté abierta, ningún link acepta respuestas." : ""}
        </p>
        <ul className="flex flex-col divide-y rounded-lg border">
          {collectors.map((collector) => (
            <li key={collector.id} className="flex items-center gap-3 px-3 py-3">
              <Link2 className="size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
              <div className="min-w-0 flex-1">
                <Link
                  href={`/surveys/${surveyId}/publish/${collector.id}`}
                  className="block truncate text-sm font-medium hover:underline"
                >
                  {collector.name}
                </Link>
                <div className="flex items-center gap-2">
                  <span className="truncate font-mono text-xs text-muted-foreground">
                    {origin}/s/{collector.slug}
                  </span>
                  <button
                    type="button"
                    className="shrink-0 text-xs text-primary underline-offset-2 hover:underline"
                    onClick={() => copyUrl(collector)}
                  >
                    Copiar
                  </button>
                </div>
              </div>
              <Badge variant={collector.open ? "secondary" : "outline"}>
                {collector.open ? "Abierto" : "Cerrado"}
              </Badge>
              <span className="w-24 shrink-0 text-right text-sm tabular-nums text-muted-foreground">
                {collector.responseCount}
                {collector.responseLimit !== null ? ` / ${collector.responseLimit}` : ""}{" "}
                {collector.responseCount === 1 ? "respuesta" : "respuestas"}
              </span>
              <DropdownMenu>
                <DropdownMenuTrigger
                  render={
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      aria-label={`Acciones de ${collector.name}`}
                      className="shrink-0"
                    />
                  }
                >
                  <MoreHorizontal className="size-4" />
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="min-w-52 p-1" sideOffset={6}>
                  <DropdownMenuItem
                    className="cursor-pointer px-2 py-2"
                    onClick={() => router.push(`/surveys/${surveyId}/publish/${collector.id}`)}
                  >
                    Editar recopilador
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    className="cursor-pointer px-2 py-2"
                    onClick={() =>
                      run(
                        () => setCollectorOpen(collector.id, !collector.open),
                        collector.open ? "Recopilador cerrado" : "Recopilador abierto",
                      )
                    }
                  >
                    {collector.open ? "Cerrar recopilador" : "Abrir recopilador"}
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    className="cursor-pointer px-2 py-2"
                    onClick={() => run(() => duplicateCollector(collector.id), "Recopilador copiado")}
                  >
                    Copiar recopilador
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    className="cursor-pointer px-2 py-2"
                    onClick={() => openNameDialog({ mode: "rename", collector })}
                  >
                    Cambiar el nombre
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    className="cursor-pointer px-2 py-2 text-destructive"
                    onClick={() => setToDelete(collector)}
                  >
                    Eliminar recopilador
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </li>
          ))}
        </ul>
      </CardContent>

      <Dialog open={nameDialog !== null} onOpenChange={(open) => !open && setNameDialog(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {nameDialog?.mode === "rename" ? "Cambiar el nombre" : "Agregar recopilador"}
            </DialogTitle>
            <DialogDescription>
              {nameDialog?.mode === "rename"
                ? "El nombre solo lo ves vos."
                : "Se crea un link web nuevo, con sus propios ajustes."}
            </DialogDescription>
          </DialogHeader>
          <form
            className="flex flex-col gap-3"
            onSubmit={(event) => {
              event.preventDefault();
              submitName();
            }}
          >
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="collector-name">Nombre</Label>
              <Input
                id="collector-name"
                value={nameDraft}
                maxLength={80}
                autoFocus
                onChange={(event) => setNameDraft(event.target.value)}
              />
            </div>
            <DialogFooter>
              <Button type="submit" disabled={isPending}>
                {isPending ? "Guardando..." : nameDialog?.mode === "rename" ? "Guardar" : "Crear"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={toDelete !== null} onOpenChange={(open) => !open && setToDelete(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Eliminar «{toDelete?.name}»</DialogTitle>
            <DialogDescription>
              Su link deja de funcionar. Las {toDelete?.responseCount ?? 0} respuestas que recibió se
              conservan en el análisis. No se puede deshacer.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setToDelete(null)}>
              Cancelar
            </Button>
            <Button
              variant="destructive"
              disabled={isPending}
              onClick={() => {
                const target = toDelete;
                if (!target) return;
                run(() => deleteCollector(target.id), "Recopilador eliminado");
                setToDelete(null);
              }}
            >
              Eliminar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
