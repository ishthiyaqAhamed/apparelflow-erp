import { describe, it, expect, vi, afterEach, afterAll } from "vitest";

vi.mock("@/lib/session", () => ({
  getSession: vi.fn(),
}));

import { getSession } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { POST as approve } from "@/app/api/orders/[id]/approve/route";
import {
  getSessionFor,
  createPendingOrder,
  cleanupTestOrders,
} from "./helpers";

function callApprove(orderId: number) {
  return approve(
    new Request(`http://localhost/api/orders/${orderId}/approve`, {
      method: "POST",
    }),
    { params: Promise.resolve({ id: String(orderId) }) }
  );
}

afterEach(async () => {
  await cleanupTestOrders();
});

afterAll(async () => {
  await prisma.$disconnect();
});

describe("approving a batch", () => {
  it("lets a verifier approve an order where every component is GREEN", async () => {
    const order = await createPendingOrder([50, 50, 100, 50, 100]);
    const verifier = await getSessionFor("cutting_verifier");
    vi.mocked(getSession).mockResolvedValue(verifier);

    const res = await callApprove(order.id);
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.status).toBe("VERIFIED");

    const saved = await prisma.cuttingOrder.findUniqueOrThrow({
      where: { id: order.id },
    });
    expect(saved.status).toBe("VERIFIED");

    const log = await prisma.verificationLog.findFirstOrThrow({
      where: { orderId: order.id },
    });
    expect(log.decision).toBe("APPROVED");
    expect(log.verifierId).toBe(verifier.userId);
    expect(log.wastagePct).toBe(2.22);
  });

  it("blocks approval with 422 when any component is RED (shortage)", async () => {
    const order = await createPendingOrder([50, 50, 100, 50, 97]);
    const verifier = await getSessionFor("cutting_verifier");
    vi.mocked(getSession).mockResolvedValue(verifier);

    const res = await callApprove(order.id);
    const body = await res.json();

    expect(res.status).toBe(422);
    expect(body.blocking).toContain("Sleeve Cuffs");

    const saved = await prisma.cuttingOrder.findUniqueOrThrow({
      where: { id: order.id },
    });
    expect(saved.status).toBe("PENDING_VERIFICATION");

    const logs = await prisma.verificationLog.count({
      where: { orderId: order.id },
    });
    expect(logs).toBe(0);
  });
});