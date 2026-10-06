import type { OrderStatus } from "@prisma/client";

export const statusLabels: Record<OrderStatus, string> = {
  CUTTING_IN_PROGRESS: "Cutting in progress",
  PENDING_VERIFICATION: "Pending verification",
  REJECTED: "Rejected",
  VERIFIED: "Verified",
  SEWING_STARTED: "Sewing started",
};

export const statusStyles: Record<OrderStatus, string> = {
  CUTTING_IN_PROGRESS: "bg-slate-200 text-slate-900",
  PENDING_VERIFICATION: "bg-amber-200 text-amber-950",
  REJECTED: "bg-red-200 text-red-950",
  VERIFIED: "bg-green-200 text-green-950",
  SEWING_STARTED: "bg-blue-200 text-blue-950",
};