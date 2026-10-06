import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/guard";

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const guard = await requireRole("sewing_supervisor");
  if (!guard.ok) return guard.response;

  const { id } = await params;
  const orderId = Number(id);
  if (!Number.isInteger(orderId) || orderId < 1) {
    return NextResponse.json({ error: "Invalid order id" }, { status: 400 });
  }

  const updated = await prisma.cuttingOrder.updateMany({
    where: { id: orderId, status: "VERIFIED" },
    data: { status: "SEWING_STARTED" },
  });

  if (updated.count !== 1) {
    return NextResponse.json(
      { error: "Order not found in the sewing queue" },
      { status: 404 }
    );
  }

  return NextResponse.json({ orderId, status: "SEWING_STARTED" });
}