import { AccountTabs } from "@/components/account/AccountTabs";

export default function AccountLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="mx-auto flex w-full max-w-4xl flex-col gap-6 px-6 py-8">
      <h1 className="text-2xl font-semibold">Mi cuenta</h1>
      <AccountTabs />
      {children}
    </div>
  );
}
