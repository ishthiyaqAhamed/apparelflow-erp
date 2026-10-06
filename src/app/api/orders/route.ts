import { NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/guard";

function isPositiveInt(value: unknown): value is number {
  return typeof value === "number" && Number.isInteger(value) && value > 0;
}

export async function POST(request: Request) {
  const guard = await requireRole("cutting_supervisor");
  if (!guard.ok) return guard.response;
  const { session } = guard;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const { recipeId, targetQty, fabricRollId, actualFabricYds } = (body ?? {}) as {
    recipeId?: unknown;
    targetQty?: unknown;
    fabricRollId?: unknown;
    actualFabricYds?: unknown;
  };

  const errors: Record<string, string> = {};

  if (!isPositiveInt(recipeId)) {
    errors.recipeId = "Select a recipe";
  }
  if (!isPositiveInt(targetQty) || targetQty > 100000) {
    errors.targetQty = "Quantity must be a whole number between 1 and 100000";
  }
  if (
    typeof fabricRollId !== "string" ||
    fabricRollId.trim().length === 0 ||
    fabricRollId.trim().length > 50
  ) {
    errors.fabricRollId = "Fabric roll ID is required (max 50 characters)";
  }
  if (
    typeof actualFabricYds !== "number" ||
    !Number.isFinite(actualFabricYds) ||
    actualFabricYds <= 0 ||
    actualFabricYds > 100000
  ) {
    errors.actualFabricYds = "Fabric used must be a number greater than 0";
  }

  if (Object.keys(errors).length > 0) {
    return NextResponse.json({ error: "Validation failed", errors }, { status: 400 });
  }

  const recipe = await prisma.recipe.findUnique({
    where: { id: recipeId as number },
    include: { components: true },
  });

  if (!recipe) {
    return NextResponse.json({ error: "Recipe not found" }, { status: 404 });
  }

  const qty = targetQty as number;

  const order = await prisma.$transaction(async (tx) => {
    const created = await tx.cuttingOrder.create({
      data: {
        orderNo: `TMP-${randomUUID()}`,
        recipeId: recipe.id,
        targetQty: qty,
        fabricRollId: (fabricRollId as string).trim(),
        actualFabricYds: actualFabricYds as number,
        status: "PENDING_VERIFICATION",
        createdBy: session.userId,
        items: {
          create: recipe.components.map((c) => ({
            componentId: c.id,
            expectedQty: qty * c.piecesPerGarment,
          })),
        },
      },
    });

    return tx.cuttingOrder.update({
      where: { id: created.id },
      data: { orderNo: `ORD-${String(created.id).padStart(4, "0")}` },
      include: { items: true },
    });
  });

  return NextResponse.json({ order }, { status: 201 });
}