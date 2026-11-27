"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

/** «Planes» header link; remembers the survey page you came from so /precios can lead back to it. */
export function PlansLink() {
  const pathname = usePathname();
  const from = pathname.startsWith("/surveys/") ? `?from=${encodeURIComponent(pathname)}` : "";
  return (
    <Link href={`/precios${from}`} className="text-sm text-muted-foreground hover:text-foreground">
      Planes
    </Link>
  );
}
