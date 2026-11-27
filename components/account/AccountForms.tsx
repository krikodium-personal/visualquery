"use client";

import { useState, useTransition, type ReactNode } from "react";
import { toast } from "sonner";
import {
  changeEmail,
  changePassword,
  deleteAccount,
  setResponseAlerts,
  updateProfileName,
} from "@/actions/account";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import type { ActionResult } from "@/lib/action-result";

function useAction() {
  const [pending, start] = useTransition();
  function run(action: () => Promise<ActionResult>, success: string, after?: () => void) {
    start(async () => {
      const result = await action();
      if (result.error) toast.error(result.error);
      else {
        toast.success(success);
        after?.();
      }
    });
  }
  return { pending, run };
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex flex-col gap-1.5">
      <Label>{label}</Label>
      {children}
    </div>
  );
}

export function NameForm({ initial }: { initial: string }) {
  const [name, setName] = useState(initial);
  const { pending, run } = useAction();
  return (
    <form
      className="flex items-end gap-2"
      onSubmit={(event) => {
        event.preventDefault();
        run(() => updateProfileName(name), "Nombre actualizado");
      }}
    >
      <Field label="Nombre">
        <Input value={name} onChange={(e) => setName(e.target.value)} className="w-64" />
      </Field>
      <Button type="submit" variant="outline" disabled={pending || name.trim() === initial}>
        Guardar
      </Button>
    </form>
  );
}

export function EmailForm({ initial }: { initial: string }) {
  const [email, setEmail] = useState(initial);
  const [password, setPassword] = useState("");
  const { pending, run } = useAction();
  return (
    <form
      className="flex flex-wrap items-end gap-2"
      onSubmit={(event) => {
        event.preventDefault();
        run(() => changeEmail(email, password), "Email actualizado", () => setPassword(""));
      }}
    >
      <Field label="Correo electrónico">
        <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="w-64" />
      </Field>
      <Field label="Contraseña actual">
        <Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} className="w-48" />
      </Field>
      <Button type="submit" variant="outline" disabled={pending || !password || email === initial}>
        Cambiar correo
      </Button>
    </form>
  );
}

export function PasswordForm() {
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const { pending, run } = useAction();
  return (
    <form
      className="flex flex-wrap items-end gap-2"
      onSubmit={(event) => {
        event.preventDefault();
        run(() => changePassword(current, next), "Contraseña actualizada", () => {
          setCurrent("");
          setNext("");
        });
      }}
    >
      <Field label="Contraseña actual">
        <Input type="password" value={current} onChange={(e) => setCurrent(e.target.value)} className="w-48" />
      </Field>
      <Field label="Contraseña nueva">
        <Input type="password" value={next} onChange={(e) => setNext(e.target.value)} className="w-48" />
      </Field>
      <Button type="submit" variant="outline" disabled={pending || !current || next.length < 8}>
        Cambiar contraseña
      </Button>
    </form>
  );
}

export function ResponseAlertsToggle({ initial }: { initial: boolean }) {
  const [enabled, setEnabled] = useState(initial);
  const { run } = useAction();
  return (
    <div className="flex items-start justify-between gap-6">
      <div>
        <p className="text-sm font-medium">Alertas de respuestas</p>
        <p className="mt-1 text-sm text-muted-foreground">
          Recibí avisos en el centro de notificaciones cuando lleguen nuevas respuestas a tus
          encuestas. Los avisos de límite alcanzado se envían siempre.
        </p>
      </div>
      <Switch
        checked={enabled}
        aria-label="Alertas de respuestas"
        onCheckedChange={(next) => {
          setEnabled(next);
          run(() => setResponseAlerts(next), next ? "Alertas activadas" : "Alertas desactivadas");
        }}
      />
    </div>
  );
}

export function DeleteAccount() {
  const [open, setOpen] = useState(false);
  const [password, setPassword] = useState("");
  const { pending, run } = useAction();
  return (
    <>
      <Button variant="destructive" onClick={() => setOpen(true)}>
        Eliminar cuenta permanentemente
      </Button>
      <Dialog open={open} onOpenChange={(next) => !pending && setOpen(next)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>¿Eliminar tu cuenta?</DialogTitle>
            <DialogDescription>
              Se borran para siempre tu cuenta, todas tus encuestas y sus respuestas. Esta acción
              no se puede deshacer. Escribí tu contraseña para confirmar.
            </DialogDescription>
          </DialogHeader>
          <Input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            aria-label="Contraseña"
          />
          <DialogFooter>
            <Button variant="outline" disabled={pending} onClick={() => setOpen(false)}>
              Cancelar
            </Button>
            <Button
              variant="destructive"
              disabled={pending || !password}
              onClick={() => run(() => deleteAccount(password), "Cuenta eliminada")}
            >
              {pending ? "Eliminando…" : "Eliminar cuenta"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
