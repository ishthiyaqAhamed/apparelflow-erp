import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/guard";

export async function GET() {
  const guard = await requireRole("cutting_supervisor");
  if (!guard.ok) return guard.response;

  const recipes = await prisma.recipe.findMany({
    orderBy: { recipeCode: "asc" },
    include: {
      components: {
        orderBy: { id: "asc" },
        select: {
          id: true,
          componentName: true,
          piecesPerGarment: true,
        },
      },
    },
  });

  return NextResponse.json({ recipes });
}