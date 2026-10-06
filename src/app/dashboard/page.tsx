import { getSession } from "@/lib/session";
import { roleLabels } from "@/lib/roles";
import { prisma } from "@/lib/prisma";
import { getSewingQueue } from "@/lib/sewing-queue";
import SupervisorPanel from "@/components/SupervisorPanel";
import VerifierPanel from "@/components/VerifierPanel";
import SewingPanel from "@/components/SewingPanel";
import { redirect } from "next/navigation";

export default async function DashboardPage() {
  const session = await getSession();
  if (!session) redirect("/");

  if (session.role === "cutting_supervisor") {
    const orders = await prisma.cuttingOrder.findMany({
      orderBy: { createdAt: "desc" },
      include: {
        recipe: { select: { recipeCode: true, name: true } },
        logs: {
          where: { decision: "REJECTED" },
          orderBy: { timestamp: "desc" },
          take: 1,
          select: { rejectionNote: true },
        },
      },
    });

    const rows = orders.map((o) => ({
      id: o.id,
      orderNo: o.orderNo,
      recipeCode: o.recipe.recipeCode,
      recipeName: o.recipe.name,
      targetQty: o.targetQty,
      fabricRollId: o.fabricRollId,
      actualFabricYds: o.actualFabricYds,
      status: o.status,
      createdAt: o.createdAt.toISOString(),
      rejectionNote: o.logs[0]?.rejectionNote ?? null,
    }));

    return <SupervisorPanel orders={rows} />;
  }

  if (session.role === "cutting_verifier") {
    const orders = await prisma.cuttingOrder.findMany({
      where: { status: "PENDING_VERIFICATION" },
      orderBy: { createdAt: "asc" },
      include: {
        recipe: { select: { recipeCode: true, name: true } },
        items: {
          orderBy: { id: "asc" },
          include: { component: { select: { componentName: true } } },
        },
      },
    });

    const rows = orders.map((o) => ({
      id: o.id,
      orderNo: o.orderNo,
      recipeCode: o.recipe.recipeCode,
      recipeName: o.recipe.name,
      targetQty: o.targetQty,
      fabricRollId: o.fabricRollId,
      actualFabricYds: o.actualFabricYds,
      items: o.items.map((i) => ({
        id: i.id,
        componentId: i.componentId,
        componentName: i.component.componentName,
        expectedQty: i.expectedQty,
        actualQty: i.actualQty,
      })),
    }));

    return <VerifierPanel orders={rows} />;
  }

  if (session.role === "sewing_supervisor") {
    const queue = await getSewingQueue();

    const rows = queue.map((o) => ({
      ...o,
      verifiedAt: o.verifiedAt ? o.verifiedAt.toISOString() : null,
    }));

    return <SewingPanel orders={rows} />;
  }

  return (
    <div className="rounded-lg border border-slate-300 bg-white p-6">
      <h1 className="text-xl font-bold text-slate-900">
        Welcome, {session.fullName}
      </h1>
      <p className="text-slate-700">
        You are signed in as {roleLabels[session.role]}.
      </p>
    </div>
  );
}