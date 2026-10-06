"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { ItemStatus } from "@prisma/client";

export type SewingItem = {
  componentName: string;
  expectedQty: number;
  actualQty: number | null;
  variance: number | null;
  status: ItemStatus | null;
};

export type SewingOrder = {
  id: number;
  orderNo: string;
  recipeCode: string;
  recipeName: string;
  targetQty: number;
  fabricRollId: string;
  actualFabricYds: number;
  verifiedBy: string | null;
  verifiedAt: string | null;
  wastagePct: number | null;
  items: SewingItem[];
};

const badges: Record<ItemStatus, { label: string; cls: string }> = {
  GREEN: { label: "Match", cls: "bg-green-200 text-green-950" },
  YELLOW: { label: "Excess", cls: "bg-amber-200 text-amber-950" },
  RED: { label: "Shortage", cls: "bg-red-200 text-red-950" },
};

const dateFormat = new Intl.DateTimeFormat("en-GB", {
  dateStyle: "medium",
  timeStyle: "short",
  timeZone: "Asia/Colombo",
});

function SewingCard({ order }: { order: SewingOrder }) {
  const router = useRouter();
  const [starting, setStarting] = useState(false);
  const [error, setError] = useState("");

  async function handleStart() {
    setError("");
    setStarting(true);
    try {
      const res = await fetch(`/api/sewing/${order.id}/start`, { method: "POST" });
      const data = await res.json();

      if (!res.ok) {
        setError(data.error ?? "Could not start sewing");
        return;
      }
      router.refresh();
    } catch {
      setError("Could not reach the server. Try again.");
    } finally {
      setStarting(false);
    }
  }

  return (
    <div className="rounded-lg border border-slate-300 bg-white p-6">
      <h2 className="text-lg font-bold text-slate-900">
        {order.orderNo} · {order.recipeName}
      </h2>
      <p className="text-sm text-slate-700">
        {order.recipeCode} · {order.targetQty} garments · Roll {order.fabricRollId}
      </p>

      <div className="mt-3 rounded border border-slate-300 bg-slate-50 p-3 text-sm text-slate-900">
        <p>
          <span className="font-semibold">Verified by:</span> {order.verifiedBy ?? "Unknown"}
        </p>
        <p>
          <span className="font-semibold">Verified at:</span>{" "}
          {order.verifiedAt ? dateFormat.format(new Date(order.verifiedAt)) : "Unknown"}
        </p>
        <p>
          <span className="font-semibold">Fabric used:</span> {order.actualFabricYds} yds
        </p>
        <p>
          <span className="font-semibold">Fabric wastage:</span>{" "}
          {order.wastagePct === null ? "Not recorded" : `${order.wastagePct}%`}
        </p>
      </div>

      <div className="mt-4 overflow-x-auto">
        <table className="w-full text-left text-sm text-slate-900">
          <thead>
            <tr className="border-b border-slate-300 text-slate-700">
              <th className="py-2 pr-4 font-semibold">Component</th>
              <th className="py-2 pr-4 font-semibold">Expected</th>
              <th className="py-2 pr-4 font-semibold">Counted</th>
              <th className="py-2 pr-4 font-semibold">Variance</th>
              <th className="py-2 font-semibold">Status</th>
            </tr>
          </thead>
          <tbody>
            {order.items.map((i) => (
              <tr key={i.componentName} className="border-b border-slate-200">
                <td className="py-2 pr-4 font-medium">{i.componentName}</td>
                <td className="py-2 pr-4">{i.expectedQty}</td>
                <td className="py-2 pr-4">{i.actualQty ?? "-"}</td>
                <td className="py-2 pr-4">
                  {i.variance === null ? "-" : i.variance > 0 ? `+${i.variance}` : i.variance}
                </td>
                <td className="py-2">
                  {i.status && (
                    <span
                      className={`inline-block rounded px-2 py-0.5 text-xs font-semibold ${badges[i.status].cls}`}
                    >
                      {badges[i.status].label}
                    </span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {error && (
        <p role="alert" className="mt-4 text-sm font-medium text-red-700">
          {error}
        </p>
      )}

      <div className="mt-4">
        <button
          onClick={handleStart}
          disabled={starting}
          className="rounded bg-blue-700 px-4 py-2 font-medium text-white hover:bg-blue-800 disabled:opacity-60"
        >
          {starting ? "Starting..." : "Start Sewing Assembly"}
        </button>
      </div>
    </div>
  );
}

export default function SewingPanel({ orders }: { orders: SewingOrder[] }) {
  return (
    <div className="space-y-4">
      <div className="rounded-lg border border-slate-300 bg-white p-6">
        <h1 className="text-xl font-bold text-slate-900">Sewing Queue</h1>
        <p className="text-sm text-slate-700">
          Verified batches released from the Cutting Department.
        </p>
        {orders.length === 0 && (
          <p className="mt-4 text-slate-700">No verified batches are waiting.</p>
        )}
      </div>

      {orders.map((o) => (
        <SewingCard key={o.id} order={o} />
      ))}
    </div>
  );
}