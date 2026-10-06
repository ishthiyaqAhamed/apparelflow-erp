import { getSession } from "@/lib/session";
import { roleLabels } from "@/lib/roles";
import SupervisorPanel from "@/components/SupervisorPanel";

export default async function DashboardPage() {
  const session = await getSession();

  if (session?.role === "cutting_supervisor") {
    return <SupervisorPanel />;
  }

  return (
    <div className="rounded-lg border border-slate-300 bg-white p-6">
      <h1 className="text-xl font-bold text-slate-900">
        Welcome, {session?.fullName}
      </h1>
      <p className="text-slate-700">
        You are signed in as {session ? roleLabels[session.role] : ""}.
      </p>
    </div>
  );
}