import Link from "next/link";
import { redirect } from "next/navigation";
import { auth, signOut } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { DashboardHeaderActions } from "@/components/theme/DashboardHeader";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  if (!session?.user) {
    redirect("/login");
  }

  return (
    <div className="flex h-dvh flex-col bg-background text-foreground">
      <header className="shrink-0 border-b bg-background">
        <div className="mx-auto flex w-full max-w-6xl items-center justify-between gap-3 px-6 py-4">
          <Link href="/dashboard" className="font-semibold">
            Visualquery
          </Link>
          <DashboardHeaderActions>
            <form
              action={async () => {
                "use server";
                await signOut({ redirectTo: "/" });
              }}
            >
              <Button type="submit" variant="ghost" size="sm">
                Cerrar sesión ({session.user.email})
              </Button>
            </form>
          </DashboardHeaderActions>
        </div>
      </header>
      <main className="min-h-0 flex-1 overflow-y-auto bg-background">{children}</main>
    </div>
  );
}
