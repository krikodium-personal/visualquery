import Link from "next/link";
import { auth } from "@/lib/auth";
import { Button } from "@/components/ui/button";

export default async function Home() {
  const session = await auth();

  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-6 p-6 text-center">
      <div className="max-w-xl space-y-3">
        <h1 className="text-4xl font-bold tracking-tight">Visual Survey</h1>
        <p className="text-muted-foreground text-lg">
          Armá encuestas con lógica condicional en un canvas visual: cada pregunta es una
          card, las ramas se conectan y se acomodan solas.
        </p>
      </div>
      <div className="flex gap-3">
        {session?.user ? (
          <Button
            size="lg"
            nativeButton={false}
            render={<Link href="/dashboard">Ir al dashboard</Link>}
          />
        ) : (
          <>
            <Button
              size="lg"
              nativeButton={false}
              render={<Link href="/signup">Crear cuenta</Link>}
            />
            <Button
              size="lg"
              variant="outline"
              nativeButton={false}
              render={<Link href="/login">Iniciar sesión</Link>}
            />
          </>
        )}
      </div>
    </div>
  );
}
