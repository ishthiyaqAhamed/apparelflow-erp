import { describe, it, expect, vi, afterEach, afterAll } from "vitest";

vi.mock("@/lib/session", () => ({
  getSession: vi.fn(),
}));

import { getSession } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { POST as approve } from "@/app/api/orders/[id]/approve/route";
import { POST as reject } from "@/app/api/orders/[id]/reject/route";
import { getSewingQueue } from "@/lib/sewing-queue";
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

function callReject(orderId: number, body: unknown) {
  return reject(
    new Request(`http://localhost/api/orders/${orderId}/reject`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
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

describe("rejecting a batch", () => {
  it("refuses a rejection with no reason note (400) and leaves the order pending", async () => {
    const order = await createPendingOrder([50, 50, 100, 50, 97]);
    vi.mocked(getSession).mockResolvedValue(await getSessionFor("cutting_verifier"));

    const noNote = await callReject(order.id, {});
    const blankNote = await callReject(order.id, { note: "     " });

    expect(noNote.status).toBe(400);
    expect(blankNote.status).toBe(400);

    const saved = await prisma.cuttingOrder.findUniqueOrThrow({
      where: { id: order.id },
    });
    expect(saved.status).toBe("PENDING_VERIFICATION");
    expect(await prisma.verificationLog.count({ where: { orderId: order.id } })).toBe(0);
  });
});

describe("role enforcement", () => {
  it("returns 403 when a non-verifier role tries to approve or reject", async () => {
    const order = await createPendingOrder([50, 50, 100, 50, 100]);

    for (const role of ["cutting_supervisor", "sewing_supervisor"] as const) {
      vi.mocked(getSession).mockResolvedValue(await getSessionFor(role));

      const approveRes = await callApprove(order.id);
      const rejectRes = await callReject(order.id, { note: "Not my job to do this" });

      expect(approveRes.status).toBe(403);
      expect(rejectRes.status).toBe(403);
    }

    const saved = await prisma.cuttingOrder.findUniqueOrThrow({
      where: { id: order.id },
    });
    expect(saved.status).toBe("PENDING_VERIFICATION");
  });
});

describe("sewing queue isolation", () => {
  it("never returns pending or rejected orders, only verified ones", async () => {
    const pending = await createPendingOrder([50, 50, 100, 50, 100]);
    const rejected = await createPendingOrder([50, 50, 100, 50, 97]);
    const verified = await createPendingOrder([50, 50, 100, 50, 100]);

    await prisma.cuttingOrder.update({
      where: { id: rejected.id },
      data: { status: "REJECTED" },
    });
    await prisma.cuttingOrder.update({
      where: { id: verified.id },
      data: { status: "VERIFIED" },
    });

    const queue = await getSewingQueue();
    const ids = queue.map((o) => o.id);

    expect(ids).toContain(verified.id);
    expect(ids).not.toContain(pending.id);
    expect(ids).not.toContain(rejected.id);
  });
});