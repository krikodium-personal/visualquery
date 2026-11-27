"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Dialog as DialogPrimitive } from "@base-ui/react/dialog";
import { Bell, XIcon } from "lucide-react";
import {
  getNotifications,
  markAllNotificationsRead,
  markNotificationRead,
  type NotificationItem,
} from "@/actions/notifications";
import { Button } from "@/components/ui/button";

const REFRESH_MS = 60_000;

function formatWhen(iso: string): string {
  return new Date(iso)
    .toLocaleString("es-AR", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit", hour12: false })
    .replace(".", "")
    .replace(",", " ");
}

function destination(item: NotificationItem): string {
  return item.type === "limit_reached"
    ? `/surveys/${item.surveyId}/publish`
    : `/surveys/${item.surveyId}/results`;
}

function NotificationText({ item }: { item: NotificationItem }) {
  const title = `«${item.surveyTitle}»`;
  if (item.type === "limit_reached") {
    return (
      <>
        <span className="font-medium underline underline-offset-2">{title}</span> alcanzó el
        límite de respuestas.
      </>
    );
  }
  return (
    <>
      Resumen del día:{" "}
      <span className="font-medium text-primary underline underline-offset-2">
        {item.count === 1 ? "1 respuesta nueva" : `${item.count} respuestas nuevas`}
      </span>{" "}
      a {title}
    </>
  );
}

/** Bell with an unread badge that opens a side panel with the owner's notifications. */
export function NotificationCenter() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<NotificationItem[]>([]);
  const [unread, setUnread] = useState(0);
  const [loaded, setLoaded] = useState(false);

  const refresh = useCallback(async () => {
    try {
      const result = await getNotifications();
      setItems(result.items);
      setUnread(result.unread);
    } catch {
      // Signed out or offline: keep what we have.
    } finally {
      setLoaded(true);
    }
  }, []);

  useEffect(() => {
    // Initial load plus a slow poll so the badge catches responses that arrive meanwhile.
    const first = setTimeout(refresh, 0);
    const interval = setInterval(() => {
      if (document.visibilityState === "visible") void refresh();
    }, REFRESH_MS);
    return () => {
      clearTimeout(first);
      clearInterval(interval);
    };
  }, [refresh]);

  const handleOpenChange = (next: boolean) => {
    setOpen(next);
    if (next) void refresh();
  };

  const openItem = async (item: NotificationItem) => {
    setOpen(false);
    if (!item.read) {
      setItems((current) => current.map((entry) => (entry.id === item.id ? { ...entry, read: true } : entry)));
      setUnread((count) => Math.max(0, count - 1));
      void markNotificationRead(item.id);
    }
    router.push(destination(item));
  };

  const markAllRead = async () => {
    setItems((current) => current.map((entry) => ({ ...entry, read: true })));
    setUnread(0);
    await markAllNotificationsRead();
  };

  return (
    <DialogPrimitive.Root open={open} onOpenChange={handleOpenChange}>
      <DialogPrimitive.Trigger
        render={
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            className="relative"
            aria-label={unread > 0 ? `Notificaciones (${unread} sin leer)` : "Notificaciones"}
          />
        }
      >
        <Bell className="size-4" />
        {unread > 0 ? (
          <span className="absolute -top-1 -right-1 flex min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] leading-4 font-semibold text-white">
            {unread > 9 ? "9+" : unread}
          </span>
        ) : null}
      </DialogPrimitive.Trigger>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Backdrop className="fixed inset-0 z-50 bg-black/30 duration-150 data-open:animate-in data-open:fade-in-0 data-closed:animate-out data-closed:fade-out-0" />
        <DialogPrimitive.Popup className="fixed inset-y-0 right-0 z-50 flex w-full max-w-sm flex-col bg-popover text-sm text-popover-foreground shadow-xl ring-1 ring-foreground/10 outline-none duration-150 data-open:animate-in data-open:slide-in-from-right data-closed:animate-out data-closed:slide-out-to-right">
          <div className="flex items-center justify-between px-5 pt-5">
            <DialogPrimitive.Title className="text-lg font-semibold">
              Centro de notificaciones
            </DialogPrimitive.Title>
            <DialogPrimitive.Close
              render={<Button type="button" variant="ghost" size="icon-sm" aria-label="Cerrar" />}
            >
              <XIcon className="size-4" />
            </DialogPrimitive.Close>
          </div>
          <div className="flex justify-end px-5 pt-3">
            <Button type="button" variant="outline" size="sm" disabled={unread === 0} onClick={markAllRead}>
              Marcar todo como leído
            </Button>
          </div>
          <div className="mt-2 flex-1 overflow-y-auto px-5 pb-5">
            {!loaded ? (
              <p className="py-10 text-center text-muted-foreground">Cargando…</p>
            ) : items.length === 0 ? (
              <p className="py-10 text-center text-muted-foreground">
                Todavía no tenés notificaciones. Te avisamos cuando lleguen respuestas nuevas.
              </p>
            ) : (
              <ul className="flex flex-col">
                {items.map((item) => (
                  <li key={item.id} className="border-b last:border-b-0">
                    <button
                      type="button"
                      onClick={() => openItem(item)}
                      className="relative flex w-full flex-col gap-1 py-4 pl-4 text-left hover:bg-muted/50"
                    >
                      {!item.read ? (
                        <span
                          aria-label="Sin leer"
                          className="absolute top-[2.15rem] left-0 size-2 rounded-full bg-fuchsia-700"
                        />
                      ) : null}
                      <span className="text-xs text-muted-foreground">{formatWhen(item.updatedAt)}</span>
                      <span className={item.read ? "text-muted-foreground" : "font-medium"}>
                        <NotificationText item={item} />
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
            {loaded && items.length > 0 ? (
              <p className="mt-6 text-center text-muted-foreground">
                Estas son todas tus notificaciones de los últimos 30 días.
              </p>
            ) : null}
          </div>
        </DialogPrimitive.Popup>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}
