import Link from "next/link";
import { redirect } from "next/navigation";
import { auth, signOut } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { AccountMenu } from "@/components/account/AccountMenu";
import { NotificationCenter } from "@/components/notifications/NotificationCenter";
import { DashboardHeaderActions } from "@/components/theme/DashboardHeader";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  if (!session?.user) {
    redirect("/login");
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { name: true, email: true },
  });

  return (
    <div className="flex h-dvh flex-col bg-background text-foreground">
      <header className="shrink-0 border-b bg-background">
        <div className="mx-auto flex w-full max-w-6xl items-center justify-between gap-3 px-6 py-4">
          <Link href="/dashboard" className="font-semibold">
            Visualquery
          </Link>
          <DashboardHeaderActions>
            <Link href="/precios" className="text-sm text-muted-foreground hover:text-foreground">
              Planes
            </Link>
            <NotificationCenter />
            <AccountMenu
              name={user?.name ?? null}
              email={user?.email ?? session.user.email ?? ""}
              signOutAction={async () => {
                "use server";
                await signOut({ redirectTo: "/" });
              }}
            />
          </DashboardHeaderActions>
        </div>
      </header>
      <main className="min-h-0 flex-1 overflow-y-auto bg-background">{children}</main>
    </div>
  );
}
