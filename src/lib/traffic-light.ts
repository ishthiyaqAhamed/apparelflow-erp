import type { ItemStatus } from "@prisma/client";

export function getItemStatus(actual: number, expected: number): ItemStatus {
  if (actual === expected) return "GREEN";
  if (actual > expected) return "YELLOW";
  return "RED";
}