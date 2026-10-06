import { NextResponse } from "next/server";
import { requireRole } from "@/lib/guard";
import { getSewingQueue } from "@/lib/sewing-queue";

export async function GET() {
  const guard = await requireRole("sewing_supervisor");
  if (!guard.ok) return guard.response;

  const orders = await getSewingQueue();
  return NextResponse.json({ orders });
}