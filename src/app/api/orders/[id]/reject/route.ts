import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/guard";
import { calculateWastagePct } from "@/lib/wastage";

type Result =
  | { ok: false; status: number; error: string }
  | { ok: true; rejectedAt: Date };

export async function POST(
  request: Request,
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

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const rawNote = (body as { note?: unknown } | null)?.note;
  const note = typeof rawNote === "string" ? rawNote.trim() : "";

  if (note.length < 5) {
    return NextResponse.json(
      { error: "A rejection reason of at least 5 characters is required" },
      { status: 400 }
    );
  }
  if (note.length > 500) {
    return NextResponse.json(
      { error: "Rejection reason cannot exceed 500 characters" },
      { status: 400 }
    );
  }

  const result = await prisma.$transaction(async (tx): Promise<Result> => {
    const order = await tx.cuttingOrder.findUnique({
      where: { id: orderId },
      include: { recipe: true },
    });

    if (!order) {
      return { ok: false, status: 404, error: "Order not found" };
    }
    if (order.status !== "PENDING_VERIFICATION") {
      return {
        ok: false,
        status: 409,
        error: "Only orders pending verification can be rejected",
      };
    }

    const wastagePct = calculateWastagePct(
      order.actualFabricYds,
      order.targetQty,
      order.recipe.stdFabricYards
    );

    const updated = await tx.cuttingOrder.updateMany({
      where: { id: orderId, status: "PENDING_VERIFICATION" },
      data: { status: "REJECTED" },
    });
    if (updated.count !== 1) {
      return { ok: false, status: 409, error: "Order status changed. Try again" };
    }

    const log = await tx.verificationLog.create({
      data: {
        orderId,
        verifierId: session.userId,
        decision: "REJECTED",
        rejectionNote: note,
        wastagePct,
      },
    });

    return { ok: true, rejectedAt: log.timestamp };
  });

  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: result.status });
  }

  return NextResponse.json({
    orderId,
    status: "REJECTED",
    verifierId: session.userId,
    rejectedAt: result.rejectedAt,
  });
}