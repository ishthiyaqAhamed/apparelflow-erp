import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/guard";
import { getItemStatus } from "@/lib/traffic-light";

type CountInput = { componentId: number; actualQty: number };

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const guard = await requireRole("cutting_verifier");
  if (!guard.ok) return guard.response;

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

  const rawCounts = (body as { counts?: unknown } | null)?.counts;
  if (!Array.isArray(rawCounts) || rawCounts.length === 0) {
    return NextResponse.json(
      { error: "counts must be a non-empty array" },
      { status: 400 }
    );
  }

  const counts: CountInput[] = [];
  const seen = new Set<number>();

  for (const entry of rawCounts) {
    const componentId = (entry as { componentId?: unknown })?.componentId;
    const actualQty = (entry as { actualQty?: unknown })?.actualQty;

    if (
      typeof componentId !== "number" ||
      !Number.isInteger(componentId) ||
      componentId < 1
    ) {
      return NextResponse.json({ error: "Invalid componentId" }, { status: 400 });
    }
    if (
      typeof actualQty !== "number" ||
      !Number.isInteger(actualQty) ||
      actualQty < 0 ||
      actualQty > 1000000
    ) {
      return NextResponse.json(
        { error: "actualQty must be a whole number of 0 or more" },
        { status: 400 }
      );
    }
    if (seen.has(componentId)) {
      return NextResponse.json(
        { error: "Duplicate componentId in counts" },
        { status: 400 }
      );
    }

    seen.add(componentId);
    counts.push({ componentId, actualQty });
  }

  const order = await prisma.cuttingOrder.findUnique({
    where: { id: orderId },
    include: { items: true },
  });

  if (!order) {
    return NextResponse.json({ error: "Order not found" }, { status: 404 });
  }
  if (order.status !== "PENDING_VERIFICATION") {
    return NextResponse.json(
      { error: "Only orders pending verification can be counted" },
      { status: 409 }
    );
  }

  const itemByComponent = new Map(order.items.map((i) => [i.componentId, i]));

  for (const c of counts) {
    if (!itemByComponent.has(c.componentId)) {
      return NextResponse.json(
        { error: `Component ${c.componentId} does not belong to this order` },
        { status: 400 }
      );
    }
  }

  await prisma.$transaction(
    counts.map((c) => {
      const item = itemByComponent.get(c.componentId)!;
      return prisma.verificationItem.update({
        where: { id: item.id },
        data: {
          actualQty: c.actualQty,
          status: getItemStatus(c.actualQty, item.expectedQty),
        },
      });
    })
  );

  const items = await prisma.verificationItem.findMany({
    where: { orderId },
    orderBy: { id: "asc" },
    include: { component: { select: { componentName: true } } },
  });

  return NextResponse.json({
    items,
    hasShortage: items.some((i) => i.status === "RED"),
    allCounted: items.every((i) => i.actualQty !== null),
  });
}