import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/guard";
import { getItemStatus } from "@/lib/traffic-light";

type Result =
  | { ok: false; status: number; error: string; blocking?: string[] }
  | { ok: true; wastagePct: number; verifiedAt: Date };

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const guard = await requireRole("cutting_verifier");
  if (!guard.ok) return guard.response;
  const { session } = guard;

  const { id } = await params;
  const orderId = Number(id);
  if (!Number.isInteger(orderId) || orderId < 1) {
    return NextResponse.json({ error: "Invalid order id" }, { status: 400 });
  }

  const result = await prisma.$transaction(async (tx): Promise<Result> => {
    const order = await tx.cuttingOrder.findUnique({
      where: { id: orderId },
      include: {
        recipe: true,
        items: { include: { component: { select: { componentName: true } } } },
      },
    });

    if (!order) {
      return { ok: false, status: 404, error: "Order not found" };
    }
    if (order.status !== "PENDING_VERIFICATION") {
      return {
        ok: false,
        status: 409,
        error: "Only orders pending verification can be approved",
      };
    }

    if (order.items.length === 0) {
      return { ok: false, status: 422, error: "Order has no components to verify" };
    }

    const uncounted = order.items.filter((i) => i.actualQty === null);
    if (uncounted.length > 0) {
      return {
        ok: false,
        status: 422,
        error: "Every component must be counted before approval",
        blocking: uncounted.map((i) => i.component.componentName),
      };
    }

    const shortages = order.items.filter(
      (i) => getItemStatus(i.actualQty as number, i.expectedQty) === "RED"
    );
    if (shortages.length > 0) {
      return {
        ok: false,
        status: 422,
        error: "Shortage detected. Approval is blocked; reject the batch instead",
        blocking: shortages.map((i) => i.component.componentName),
      };
    }

    const expectedFabric = order.targetQty * order.recipe.stdFabricYards;
    const wastagePct =
      Math.round(
        ((order.actualFabricYds - expectedFabric) / expectedFabric) * 100 * 100
      ) / 100;

    const updated = await tx.cuttingOrder.updateMany({
      where: { id: orderId, status: "PENDING_VERIFICATION" },
      data: { status: "VERIFIED" },
    });
    if (updated.count !== 1) {
      return { ok: false, status: 409, error: "Order status changed. Try again" };
    }

    const log = await tx.verificationLog.create({
      data: {
        orderId,
        verifierId: session.userId,
        decision: "APPROVED",
        wastagePct,
      },
    });

    return { ok: true, wastagePct, verifiedAt: log.timestamp };
  });

  if (!result.ok) {
    return NextResponse.json(
      { error: result.error, blocking: result.blocking },
      { status: result.status }
    );
  }

  return NextResponse.json({
    orderId,
    status: "VERIFIED",
    wastagePct: result.wastagePct,
    verifierId: session.userId,
    verifiedAt: result.verifiedAt,
  });
}