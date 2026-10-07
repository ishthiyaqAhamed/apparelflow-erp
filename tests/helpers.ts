import { randomUUID } from "crypto";
import type { Role } from "@prisma/client";
import { prisma } from "@/lib/prisma";

const USER_EMAILS: Record<Role, string> = {
  cutting_supervisor: "supervisor@apparelflow.com",
  cutting_verifier: "verifier@apparelflow.com",
  sewing_supervisor: "sewing@apparelflow.com",
};

export async function getSessionFor(role: Role) {
  const user = await prisma.user.findUniqueOrThrow({
    where: { email: USER_EMAILS[role] },
  });
  return { userId: user.id, role: user.role, fullName: user.fullName };
}

export async function createPendingOrder(counts: (number | null)[]) {
  const supervisor = await prisma.user.findUniqueOrThrow({
    where: { email: USER_EMAILS.cutting_supervisor },
  });
  const recipe = await prisma.recipe.findUniqueOrThrow({
    where: { recipeCode: "REC-BL01" },
    include: { components: { orderBy: { id: "asc" } } },
  });

  const targetQty = 50;

  return prisma.cuttingOrder.create({
    data: {
      orderNo: `TEST-${randomUUID()}`,
      recipeId: recipe.id,
      targetQty,
      fabricRollId: "TEST-ROLL",
      actualFabricYds: 92,
      status: "PENDING_VERIFICATION",
      createdBy: supervisor.id,
      items: {
        create: recipe.components.map((c, index) => {
          const expectedQty = targetQty * c.piecesPerGarment;
          const actualQty = counts[index] ?? null;
          return {
            componentId: c.id,
            expectedQty,
            actualQty,
            status:
              actualQty === null
                ? null
                : actualQty === expectedQty
                  ? "GREEN"
                  : actualQty > expectedQty
                    ? "YELLOW"
                    : "RED",
          };
        }),
      },
    },
  });
}

export async function cleanupTestOrders() {
  const testOrders = await prisma.cuttingOrder.findMany({
    where: { orderNo: { startsWith: "TEST-" } },
    select: { id: true },
  });
  const ids = testOrders.map((o) => o.id);

  await prisma.verificationLog.deleteMany({ where: { orderId: { in: ids } } });
  await prisma.cuttingOrder.deleteMany({ where: { id: { in: ids } } });
}