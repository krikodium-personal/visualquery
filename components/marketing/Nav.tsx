import Link from "next/link";
import { Button } from "@/components/ui/button";

const LINKS = [
  { href: "#como-funciona", label: "Cómo funciona" },
  { href: "#funciones", label: "Funciones" },
  { href: "/precios", label: "Planes" },
  { href: "#preguntas", label: "Preguntas frecuentes" },
];

export function MarketingNav({ loggedIn }: { loggedIn: boolean }) {
  return (
    <header className="sticky top-0 z-40 border-b bg-background/85 backdrop-blur">
      <div className="mx-auto flex w-full max-w-6xl items-center justify-between gap-4 px-6 py-3">
        <Link href="/" className="text-lg font-semibold tracking-tight">
          Visualquery
        </Link>
        <nav aria-label="Principal" className="hidden items-center gap-6 text-sm text-muted-foreground md:flex">
          {LINKS.map((link) => (
            <Link key={link.href} href={link.href} className="hover:text-foreground">
              {link.label}
            </Link>
          ))}
        </nav>
        <div className="flex items-center gap-2">
          {loggedIn ? (
            <Button size="sm" nativeButton={false} render={<Link href="/dashboard">Ir a mis encuestas</Link>} />
          ) : (
            <>
              <Button variant="ghost" size="sm" nativeButton={false} render={<Link href="/login">Iniciar sesión</Link>} />
              <Button size="sm" nativeButton={false} render={<Link href="/signup">Empezar gratis</Link>} />
            </>
          )}
        </div>
      </div>
    </header>
  );
}
