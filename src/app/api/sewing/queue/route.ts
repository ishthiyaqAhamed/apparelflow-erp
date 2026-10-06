import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/guard";

export async function GET() {
  const guard = await requireRole("sewing_supervisor");
  if (!guard.ok) return guard.response;

  const orders = await prisma.cuttingOrder.findMany({
    where: { status: "VERIFIED" },
    orderBy: { updatedAt: "asc" },
    include: {
      recipe: { select: { recipeCode: true, name: true } },
      items: {
        orderBy: { id: "asc" },
        include: { component: { select: { componentName: true } } },
      },
      logs: {
        where: { decision: "APPROVED" },
        orderBy: { timestamp: "desc" },
        take: 1,
        include: { verifier: { select: { fullName: true } } },
      },
    },
  });

  const queue = orders.map((o) => {
    const approval = o.logs[0];
    return {
      id: o.id,
      orderNo: o.orderNo,
      recipeCode: o.recipe.recipeCode,
      recipeName: o.recipe.name,
      targetQty: o.targetQty,
      fabricRollId: o.fabricRollId,
      actualFabricYds: o.actualFabricYds,
      verifiedBy: approval?.verifier.fullName ?? null,
      verifiedAt: approval?.timestamp ?? null,
      wastagePct: approval?.wastagePct ?? null,
      items: o.items.map((i) => ({
        componentName: i.component.componentName,
        expectedQty: i.expectedQty,
        actualQty: i.actualQty,
        variance: i.actualQty === null ? null : i.actualQty - i.expectedQty,
        status: i.status,
      })),
    };
  });

  return NextResponse.json({ orders: queue });
}