import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import { roleLabels } from "@/lib/roles";
import LogoutButton from "@/components/LogoutButton";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getSession();
  if (!session) redirect("/");

  return (
    <div className="min-h-screen">
      <header className="bg-white border-b border-slate-300">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3">
          <div>
            <p className="font-bold text-slate-900">ApparelFlow ERP</p>
            <p className="text-sm text-slate-700">
              {session.fullName} · {roleLabels[session.role]}
            </p>
          </div>
          <LogoutButton />
        </div>
      </header>
      <main className="mx-auto max-w-5xl p-4">{children}</main>
    </div>
  );
}