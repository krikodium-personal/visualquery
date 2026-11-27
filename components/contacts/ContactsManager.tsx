"use client";

import { useMemo, useState, useTransition } from "react";
import { MoreHorizontal, Plus, Search } from "lucide-react";
import { toast } from "sonner";
import {
  addContactsToGroup,
  createContact,
  createGroup,
  deleteContacts,
  deleteGroup,
  removeContactsFromGroup,
  renameGroup,
  updateContact,
} from "@/actions/contacts";
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
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { ActionResult } from "@/lib/action-result";
import type { ContactInput, ContactRow } from "@/lib/contacts";
import { ImportContactsDialog } from "@/components/contacts/ImportContactsDialog";
import { CONTACT_LANGUAGES, languageLabel } from "@/lib/languages";
import { cn } from "@/lib/utils";

type Group = { id: string; name: string };
type Dialogs =
  | { kind: "contact"; contact: ContactRow | null }
  | { kind: "import" }
  | { kind: "group"; group: Group | null }
  | { kind: "delete-contacts" }
  | { kind: "delete-group"; group: Group }
  | null;

const ALL = "all";

export function ContactsManager({ contacts, groups }: { contacts: ContactRow[]; groups: Group[] }) {
  const [groupId, setGroupId] = useState<string>(ALL);
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [dialog, setDialog] = useState<Dialogs>(null);
  const [pending, start] = useTransition();

  const activeGroup = groups.find((g) => g.id === groupId) ?? null;
  const counts = useMemo(() => {
    const map = new Map<string, number>();
    for (const c of contacts) for (const id of c.groupIds) map.set(id, (map.get(id) ?? 0) + 1);
    return map;
  }, [contacts]);

  const visible = useMemo(() => {
    const term = search.trim().toLowerCase();
    return contacts.filter((c) => {
      if (activeGroup && !c.groupIds.includes(activeGroup.id)) return false;
      if (!term) return true;
      return [c.email, c.firstName, c.lastName].some((v) => v?.toLowerCase().includes(term));
    });
  }, [contacts, activeGroup, search]);

  const selectedIds = visible.filter((c) => selected.has(c.id)).map((c) => c.id);
  const allSelected = visible.length > 0 && selectedIds.length === visible.length;

  function run(action: () => Promise<ActionResult>, success: string, after?: () => void) {
    start(async () => {
      const result = await action();
      if (result.error) toast.error(result.error);
      else {
        toast.success(success);
        after?.();
        setDialog(null);
      }
    });
  }

  function toggle(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-6 py-8">
      <h1 className="text-2xl font-semibold">Contactos</h1>

      <div className="grid gap-6 md:grid-cols-[240px_minmax(0,1fr)]">
        <aside className="flex flex-col gap-3">
          <p className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">Grupos</p>
          <ul className="flex flex-col gap-1">
            <GroupItem label="Todos los contactos" count={contacts.length} active={groupId === ALL} onClick={() => setGroupId(ALL)} />
            {groups.map((group) => (
              <GroupItem
                key={group.id}
                label={group.name}
                count={counts.get(group.id) ?? 0}
                active={groupId === group.id}
                onClick={() => setGroupId(group.id)}
                menu={
                  <>
                    <DropdownMenuItem onClick={() => setDialog({ kind: "group", group })}>Renombrar</DropdownMenuItem>
                    <DropdownMenuItem variant="destructive" onClick={() => setDialog({ kind: "delete-group", group })}>
                      Eliminar grupo
                    </DropdownMenuItem>
                  </>
                }
              />
            ))}
          </ul>
          <Button variant="outline" size="sm" className="self-start" onClick={() => setDialog({ kind: "group", group: null })}>
            <Plus className="size-3.5" /> Grupo
          </Button>
        </aside>

        <section className="flex min-w-0 flex-col gap-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-lg font-semibold">{activeGroup?.name ?? "Todos los contactos"}</h2>
            <div className="flex flex-wrap items-center gap-2">
              <div className="relative">
                <Search className="absolute top-2 left-2 size-4 text-muted-foreground" />
                <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Buscar" className="w-48 pl-8" />
              </div>
              <DropdownMenu>
                <DropdownMenuTrigger render={<Button />}>Agregar contactos</DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => setDialog({ kind: "contact", contact: null })}>Agregar un solo contacto</DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setDialog({ kind: "import" })}>Importar múltiples contactos</DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>

          {selectedIds.length > 0 ? (
            <div className="flex flex-wrap items-center gap-2 rounded-lg border bg-muted/40 px-3 py-2 text-sm">
              <span>{selectedIds.length} seleccionado{selectedIds.length === 1 ? "" : "s"}</span>
              {groups.length > 0 ? (
                <DropdownMenu>
                  <DropdownMenuTrigger render={<Button variant="outline" size="sm" />}>Agregar a grupo</DropdownMenuTrigger>
                  <DropdownMenuContent>
                    {groups.map((g) => (
                      <DropdownMenuItem
                        key={g.id}
                        onClick={() => run(() => addContactsToGroup(selectedIds, g.id), `Agregados a «${g.name}»`, () => setSelected(new Set()))}
                      >
                        {g.name}
                      </DropdownMenuItem>
                    ))}
                  </DropdownMenuContent>
                </DropdownMenu>
              ) : null}
              {activeGroup ? (
                <Button
                  variant="outline"
                  size="sm"
                  disabled={pending}
                  onClick={() => run(() => removeContactsFromGroup(selectedIds, activeGroup.id), "Quitados del grupo", () => setSelected(new Set()))}
                >
                  Quitar de este grupo
                </Button>
              ) : null}
              <Button variant="destructive" size="sm" onClick={() => setDialog({ kind: "delete-contacts" })}>
                Eliminar
              </Button>
            </div>
          ) : null}

          <div className="overflow-x-auto rounded-xl border">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/40 text-left text-muted-foreground">
                  <th className="w-10 px-3 py-2">
                    <input
                      type="checkbox"
                      aria-label="Seleccionar todos"
                      checked={allSelected}
                      onChange={() => setSelected(allSelected ? new Set() : new Set(visible.map((c) => c.id)))}
                    />
                  </th>
                  {["Correo electrónico", "Nombre", "Apellido", "Idioma", "Campo 1", "Campo 2", "Campo 3"].map((h) => (
                    <th key={h} className="px-3 py-2 font-medium whitespace-nowrap">{h}</th>
                  ))}
                  <th className="w-10" />
                </tr>
              </thead>
              <tbody>
                {visible.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="px-3 py-10 text-center text-muted-foreground">
                      {contacts.length === 0 ? "Todavía no tenés contactos. Agregá uno o pegá una lista." : "No hay contactos para mostrar."}
                    </td>
                  </tr>
                ) : (
                  visible.map((c) => (
                    <tr key={c.id} className="border-b last:border-0">
                      <td className="px-3 py-2">
                        <input type="checkbox" aria-label={`Seleccionar ${c.email}`} checked={selected.has(c.id)} onChange={() => toggle(c.id)} />
                      </td>
                      <td className="px-3 py-2">{c.email}</td>
                      <td className="px-3 py-2">{c.firstName}</td>
                      <td className="px-3 py-2">{c.lastName}</td>
                      <td className="px-3 py-2 whitespace-nowrap">{languageLabel(c.language)}</td>
                      <td className="px-3 py-2">{c.custom1}</td>
                      <td className="px-3 py-2">{c.custom2}</td>
                      <td className="px-3 py-2">{c.custom3}</td>
                      <td className="px-3 py-2">
                        <Button variant="ghost" size="icon-sm" aria-label={`Editar ${c.email}`} onClick={() => setDialog({ kind: "contact", contact: c })}>
                          <MoreHorizontal className="size-4" />
                        </Button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
          <p className="text-xs text-muted-foreground">
            {activeGroup ? `${activeGroup.name}` : "Todos los contactos"}: {visible.length}
          </p>
        </section>
      </div>

      {dialog?.kind === "contact" ? (
      <ContactDialog
        open
        contact={dialog?.kind === "contact" ? dialog.contact : null}
        pending={pending}
        onClose={() => setDialog(null)}
        groups={groups}
        defaultGroupId={activeGroup?.id ?? ""}
        onSubmit={(input, id, group) =>
          run(() => (id ? updateContact(id, input) : createContact(input, group)), id ? "Contacto actualizado" : "Contacto agregado")
        }
        onDelete={(id) => run(() => deleteContacts([id]), "Contacto eliminado")}
      />
      ) : null}
      {dialog?.kind === "import" ? (
        <ImportContactsDialog
          open
          groups={groups}
          defaultGroupId={activeGroup?.id ?? ""}
          onClose={() => setDialog(null)}
        />
      ) : null}
      <GroupDialog
        key={`group-${dialog?.kind === "group" ? (dialog.group?.id ?? "new") : "closed"}`}
        open={dialog?.kind === "group"}
        group={dialog?.kind === "group" ? dialog.group : null}
        pending={pending}
        onClose={() => setDialog(null)}
        onSubmit={(name, id) =>
          start(async () => {
            const result = id ? await renameGroup(id, name) : await createGroup(name);
            if (result.error) return void toast.error(result.error);
            if (!id && result.id) setGroupId(result.id);
            toast.success(id ? "Grupo renombrado" : "Grupo creado");
            setDialog(null);
          })
        }
      />
      <ConfirmDialog
        open={dialog?.kind === "delete-contacts"}
        title={`¿Eliminar ${selectedIds.length} contacto${selectedIds.length === 1 ? "" : "s"}?`}
        text="Se borran para siempre de todos tus grupos."
        pending={pending}
        onClose={() => setDialog(null)}
        onConfirm={() => run(() => deleteContacts(selectedIds), "Contactos eliminados", () => setSelected(new Set()))}
      />
      <ConfirmDialog
        open={dialog?.kind === "delete-group"}
        title={`¿Eliminar el grupo «${dialog?.kind === "delete-group" ? dialog.group.name : ""}»?`}
        text="Los contactos del grupo no se borran: siguen en «Todos los contactos»."
        pending={pending}
        onClose={() => setDialog(null)}
        onConfirm={() => {
          if (dialog?.kind !== "delete-group") return;
          const id = dialog.group.id;
          run(() => deleteGroup(id), "Grupo eliminado", () => setGroupId(ALL));
        }}
      />
    </div>
  );
}

function GroupItem({
  label, count, active, onClick, menu,
}: { label: string; count: number; active: boolean; onClick: () => void; menu?: React.ReactNode }) {
  return (
    <li className={cn("flex items-center rounded-lg border", active ? "border-foreground bg-muted/50" : "border-transparent hover:bg-muted/40")}>
      <button type="button" onClick={onClick} className="flex min-w-0 flex-1 items-center justify-between gap-2 px-3 py-2 text-left text-sm">
        <span className="truncate">{label}</span>
        <span className="text-xs text-muted-foreground">{count}</span>
      </button>
      {menu ? (
        <DropdownMenu>
          <DropdownMenuTrigger render={<Button variant="ghost" size="icon-xs" aria-label={`Opciones de ${label}`} />}>
            <MoreHorizontal className="size-3.5" />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">{menu}</DropdownMenuContent>
        </DropdownMenu>
      ) : null}
    </li>
  );
}

const FIELDS: { key: keyof ContactInput; label: string; type?: string }[] = [
  { key: "email", label: "Correo electrónico", type: "email" },
  { key: "firstName", label: "Nombre" },
  { key: "lastName", label: "Apellido" },
  { key: "language", label: "Idioma" },
  { key: "custom1", label: "Campo personalizado 1" },
  { key: "custom2", label: "Campo personalizado 2" },
  { key: "custom3", label: "Campo personalizado 3" },
];

const NEW_GROUP = "__new__";

function ContactDialog({
  open, contact, groups, defaultGroupId, pending, onClose, onSubmit, onDelete,
}: {
  open: boolean; contact: ContactRow | null; groups: Group[]; defaultGroupId: string; pending: boolean; onClose: () => void;
  onSubmit: (input: ContactInput, id?: string, group?: { id?: string; newName?: string }) => void; onDelete: (id: string) => void;
}) {
  const [groupChoice, setGroupChoice] = useState(defaultGroupId);
  const [newGroupName, setNewGroupName] = useState("");
  const [values, setValues] = useState<Record<string, string>>(() =>
    Object.fromEntries(FIELDS.map((f) => [f.key, (contact?.[f.key as keyof ContactRow] as string | null) ?? ""])),
  );
  return (
    <Dialog open={open} onOpenChange={(next) => !pending && !next && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{contact ? "Editar contacto" : "Agregar contacto"}</DialogTitle>
        </DialogHeader>
        <form
          id="contact-form"
          className="flex flex-col gap-3"
          onSubmit={(event) => {
            event.preventDefault();
            const group =
              groupChoice === NEW_GROUP
                ? { newName: newGroupName }
                : groupChoice
                  ? { id: groupChoice }
                  : undefined;
            onSubmit(values as unknown as ContactInput, contact?.id, group);
          }}
        >
          {FIELDS.map((f) => (
            <div key={f.key} className="flex flex-col gap-1.5">
              <Label>{f.label}</Label>
              {f.key === "language" ? (
                <select
                  value={values.language}
                  onChange={(e) => setValues({ ...values, language: e.target.value })}
                  className="h-8 w-full rounded-lg border border-input bg-transparent px-2 text-sm"
                >
                  <option value="">Elige un idioma</option>
                  {CONTACT_LANGUAGES.map((l) => (
                    <option key={l.code} value={l.code}>
                      {l.name} - {l.code}
                    </option>
                  ))}
                </select>
              ) : (
                <Input type={f.type} required={f.key === "email"} value={values[f.key]} onChange={(e) => setValues({ ...values, [f.key]: e.target.value })} />
              )}
            </div>
          ))}
          {contact ? null : (
            <div className="flex flex-col gap-1.5">
              <Label>Agregar a un grupo (opcional)</Label>
              <select
                value={groupChoice}
                onChange={(e) => setGroupChoice(e.target.value)}
                className="h-8 w-full rounded-lg border border-input bg-transparent px-2 text-sm"
              >
                <option value="">Sin grupo</option>
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
                  placeholder="Nombre del grupo nuevo"
                  aria-label="Nombre del grupo nuevo"
                  required
                />
              ) : null}
            </div>
          )}
        </form>
        <DialogFooter>
          {contact ? (
            <Button variant="destructive" className="mr-auto" disabled={pending} onClick={() => onDelete(contact.id)}>Eliminar</Button>
          ) : null}
          <Button variant="outline" disabled={pending} onClick={onClose}>Cancelar</Button>
          <Button type="submit" form="contact-form" disabled={pending}>Guardar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function GroupDialog({
  open, group, pending, onClose, onSubmit,
}: { open: boolean; group: Group | null; pending: boolean; onClose: () => void; onSubmit: (name: string, id?: string) => void }) {
  const [name, setName] = useState(group?.name ?? "");
  return (
    <Dialog open={open} onOpenChange={(next) => !pending && !next && onClose()}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>{group ? "Renombrar grupo" : "Nuevo grupo"}</DialogTitle>
        </DialogHeader>
        <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Nombre del grupo" aria-label="Nombre del grupo" />
        <DialogFooter>
          <Button variant="outline" disabled={pending} onClick={onClose}>Cancelar</Button>
          <Button disabled={pending || !name.trim()} onClick={() => onSubmit(name, group?.id)}>Guardar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function ConfirmDialog({
  open, title, text, pending, onClose, onConfirm,
}: { open: boolean; title: string; text: string; pending: boolean; onClose: () => void; onConfirm: () => void }) {
  return (
    <Dialog open={open} onOpenChange={(next) => !pending && !next && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{text}</DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="outline" disabled={pending} onClick={onClose}>Cancelar</Button>
          <Button variant="destructive" disabled={pending} onClick={onConfirm}>{pending ? "Eliminando…" : "Eliminar"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
