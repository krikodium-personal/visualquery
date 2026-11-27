"use client";

import Link from "next/link";
import { BookOpen, History, LogOut, Plug, UserRound, Users } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

function initialsOf(name: string | null, email: string): string {
  const source = (name?.trim() || email.split("@")[0]).split(/[\s._-]+/).filter(Boolean);
  return source
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");
}

const ITEMS = [
  { href: "/account", label: "Mi cuenta", icon: UserRound },
  { href: "/library", label: "Biblioteca", icon: BookOpen },
  { href: "/contacts", label: "Contactos", icon: Users },
  { href: "/integrations", label: "Aplicaciones e integraciones", icon: Plug },
  { href: "/changelog", label: "Novedades", icon: History },
];

export function AccountMenu({
  name,
  email,
  signOutAction,
}: {
  name: string | null;
  email: string;
  signOutAction: () => Promise<void>;
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <button
            type="button"
            aria-label="Abrir el menú de la cuenta"
            className="flex size-8 items-center justify-center rounded-full bg-primary text-xs font-semibold text-primary-foreground outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
          />
        }
      >
        {initialsOf(name, email)}
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="min-w-64 p-1" sideOffset={8}>
        <div className="px-2 py-1.5">
          <p className="truncate text-sm font-semibold">{name || email}</p>
          {name ? <p className="truncate text-xs text-muted-foreground">{email}</p> : null}
        </div>
        <DropdownMenuSeparator />
        {ITEMS.map(({ href, label, icon: Icon }) => (
          <DropdownMenuItem
            key={href}
            className="cursor-pointer gap-2 px-2 py-2"
            render={<Link href={href} />}
          >
            <Icon className="size-4 text-muted-foreground" />
            {label}
          </DropdownMenuItem>
        ))}
        <DropdownMenuSeparator />
        <form action={signOutAction}>
          <DropdownMenuItem
            className="cursor-pointer gap-2 px-2 py-2"
            nativeButton
            render={<button type="submit" className="w-full" />}
          >
            <LogOut className="size-4 text-muted-foreground" />
            Cerrar sesión
          </DropdownMenuItem>
        </form>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
