"use client";

import { useRef, useState, useTransition, type ComponentType } from "react";
import { AtSign, Building2, FileSpreadsheet, Keyboard, Briefcase, Mail, Upload } from "lucide-react";
import { toast } from "sonner";
import { importContacts } from "@/actions/contacts";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

type Group = { id: string; name: string };
type Source = "csv" | "gmail" | "yahoo" | "outlook" | "office365" | "linkedin" | "manual";

const SOURCES: { id: Source; label: string; icon: ComponentType<{ className?: string }> }[] = [
  { id: "csv", label: "Archivo .CSV", icon: FileSpreadsheet },
  { id: "gmail", label: "Gmail", icon: Mail },
  { id: "yahoo", label: "Yahoo! Mail", icon: AtSign },
  { id: "outlook", label: "Outlook.com", icon: Mail },
  { id: "office365", label: "Office 365", icon: Building2 },
  { id: "linkedin", label: "LinkedIn", icon: Briefcase },
  { id: "manual", label: "Manual", icon: Keyboard },
];

const FIELD_ORDER =
  "Correo electrónico, Nombre, Apellido, Idioma, Datos personalizados 1, Datos personalizados 2, Datos personalizados 3";
const NEW_GROUP = "__new__";

export function ImportContactsDialog({
  open,
  groups,
  defaultGroupId,
  onClose,
}: {
  open: boolean;
  groups: Group[];
  defaultGroupId: string;
  onClose: () => void;
}) {
  const [source, setSource] = useState<Source | null>(null);
  const [text, setText] = useState("");
  const [fileName, setFileName] = useState("");
  const [includesLanguage, setIncludesLanguage] = useState(false);
  const [useGroup, setUseGroup] = useState(Boolean(defaultGroupId));
  const [groupChoice, setGroupChoice] = useState(defaultGroupId || (groups[0]?.id ?? NEW_GROUP));
  const [newGroupName, setNewGroupName] = useState("");
  const [onExisting, setOnExisting] = useState<"update" | "ignore">("update");
  const [pending, start] = useTransition();
  const fileRef = useRef<HTMLInputElement>(null);

  const sourceLabel = SOURCES.find((s) => s.id === source)?.label ?? "";
  const canSubmit =
    text.trim().length > 0 && (!useGroup || groupChoice !== NEW_GROUP || newGroupName.trim().length > 0);

  function submit() {
    const group = !useGroup ? undefined : groupChoice === NEW_GROUP ? { newName: newGroupName } : { id: groupChoice };
    start(async () => {
      const result = await importContacts(text, { group, includesLanguage, onExisting });
      if (result.error) return void toast.error(result.error);
      const parts = [
        `${result.added} agregado${result.added === 1 ? "" : "s"}`,
        result.updated ? `${result.updated} actualizado${result.updated === 1 ? "" : "s"}` : "",
        result.ignored ? `${result.ignored} ya existía${result.ignored === 1 ? "" : "n"} (ignorado${result.ignored === 1 ? "" : "s"})` : "",
        result.invalid ? `${result.invalid} inválido${result.invalid === 1 ? "" : "s"}` : "",
      ].filter(Boolean);
      toast.success(parts.join(", "));
      onClose();
    });
  }

  return (
    <Dialog open={open} onOpenChange={(next) => !pending && !next && onClose()}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Importar múltiples contactos</DialogTitle>
        </DialogHeader>

        <div className="flex flex-col gap-5">
          <div>
            <p className="mb-2 text-sm font-medium">Agregar desde una de las siguientes opciones:</p>
            <div className="grid grid-cols-3 gap-2 sm:grid-cols-4 md:grid-cols-7">
              {SOURCES.map(({ id, label, icon: Icon }) => (
                <button
                  key={id}
                  type="button"
                  onClick={() => setSource(id)}
                  className={cn(
                    "flex flex-col items-center gap-2 rounded-lg border px-2 py-3 text-xs text-muted-foreground hover:bg-muted/50",
                    source === id && "border-foreground bg-muted/50 text-foreground",
                  )}
                >
                  <Icon className="size-6" />
                  {label}
                </button>
              ))}
            </div>
          </div>

          {source === "manual" ? (
            <div className="flex flex-col gap-2">
              <p className="text-sm text-muted-foreground">
                Coloca cada contacto en su propia línea. Agrega una coma entre los valores de los campos. Si no
                tienes información para un campo, deja un espacio en blanco entre las comas.
              </p>
              <p className="text-xs text-muted-foreground">Orden de los campos: {FIELD_ORDER}</p>
              <Textarea
                rows={6}
                value={text}
                onChange={(e) => setText(e.target.value)}
                placeholder={"ana@ejemplo.com, Ana, Pérez, es\nluis@ejemplo.com"}
                aria-label="Contactos"
              />
            </div>
          ) : source ? (
            <div className="flex flex-col gap-2 rounded-lg border bg-muted/20 p-4">
              {source !== "csv" ? (
                <p className="text-sm text-muted-foreground">
                  Todavía no podemos conectarnos con {sourceLabel}. Exportá tus contactos de {sourceLabel} como
                  archivo CSV y cargalo acá.
                </p>
              ) : null}
              <p className="text-xs text-muted-foreground">
                Orden de los campos (si el archivo no tiene encabezados): {FIELD_ORDER}. Con encabezados se
                reconocen por nombre.
              </p>
              <div className="flex items-center gap-3">
                <Button type="button" variant="outline" size="sm" onClick={() => fileRef.current?.click()}>
                  <Upload className="size-3.5" /> Elegir archivo
                </Button>
                <span className="text-sm text-muted-foreground">{fileName || "Ningún archivo seleccionado"}</span>
                <input
                  ref={fileRef}
                  type="file"
                  accept=".csv,.txt"
                  className="hidden"
                  aria-label="Elegir archivo CSV"
                  onChange={async (event) => {
                    const file = event.target.files?.[0];
                    if (!file) return;
                    setFileName(file.name);
                    setText(await file.text());
                  }}
                />
              </div>
            </div>
          ) : null}

          <div className="flex flex-col gap-4 border-t pt-4">
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={includesLanguage} onChange={(e) => setIncludesLanguage(e.target.checked)} />
              Mi lista incluye idiomas
              <span className="text-xs text-muted-foreground">(código como «es» o nombre como «Español»)</span>
            </label>

            <div className="flex flex-col gap-2">
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" checked={useGroup} onChange={(e) => setUseGroup(e.target.checked)} />
                Agregar a un grupo <span className="text-muted-foreground">(opcional)</span>
              </label>
              {useGroup ? (
                <div className="flex flex-wrap items-center gap-2 pl-6">
                  <select
                    value={groupChoice}
                    onChange={(e) => setGroupChoice(e.target.value)}
                    aria-label="Grupo"
                    className="h-8 rounded-lg border border-input bg-transparent px-2 text-sm"
                  >
                    {groups.map((g) => (
                      <option key={g.id} value={g.id}>
                        {g.name}
                      </option>
                    ))}
                    <option value={NEW_GROUP}>+ Crear grupo nuevo…</option>
                  </select>
                  {groupChoice === NEW_GROUP ? (
                    <Input
                      value={newGroupName}
                      onChange={(e) => setNewGroupName(e.target.value)}
                      placeholder="Nombre del grupo"
                      aria-label="Nombre del grupo nuevo"
                      className="w-56"
                    />
                  ) : null}
                </div>
              ) : null}
            </div>

            <label className="flex flex-wrap items-center gap-2 text-sm">
              Si un contacto ya existe,
              <select
                value={onExisting}
                onChange={(e) => setOnExisting(e.target.value as "update" | "ignore")}
                aria-label="Si un contacto ya existe"
                className="h-8 rounded-lg border border-input bg-transparent px-2 text-sm"
              >
                <option value="update">actualizar información de contacto</option>
                <option value="ignore">ignorar información de importación</option>
              </select>
            </label>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" disabled={pending} onClick={onClose}>
            Cancelar
          </Button>
          <Button disabled={pending || !canSubmit} onClick={submit}>
            Agregar contactos
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
