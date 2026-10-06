"use client";

import { useState } from "react";
import type { OrderStatus } from "@prisma/client";
import CreateOrderModal from "@/components/CreateOrderModal";
import { statusLabels, statusStyles } from "@/lib/status";

export type OrderRow = {
  id: number;
  orderNo: string;
  recipeCode: string;
  recipeName: string;
  targetQty: number;
  fabricRollId: string;
  actualFabricYds: number;
  status: OrderStatus;
  createdAt: string;
  rejectionNote: string | null;
};

const dateFormat = new Intl.DateTimeFormat("en-GB", {
  dateStyle: "medium",
  timeStyle: "short",
  timeZone: "Asia/Colombo",
});

export default function SupervisorPanel({ orders }: { orders: OrderRow[] }) {
  const [open, setOpen] = useState(false);

  return (
    <div className="rounded-lg border border-slate-300 bg-white p-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-slate-900">Cutting Orders</h1>
        <button
          onClick={() => setOpen(true)}
          className="rounded bg-blue-700 px-4 py-2 font-medium text-white hover:bg-blue-800"
        >
          New Cutting Order
        </button>
      </div>

      {orders.length === 0 ? (
        <p className="mt-6 text-slate-700">
          No cutting orders yet. Create the first one to get started.
        </p>
      ) : (
        <div className="mt-6 overflow-x-auto">
          <table className="w-full text-left text-sm text-slate-900">
            <thead>
              <tr className="border-b border-slate-300 text-slate-700">
                <th className="py-2 pr-4 font-semibold">Order</th>
                <th className="py-2 pr-4 font-semibold">Recipe</th>
                <th className="py-2 pr-4 font-semibold">Qty</th>
                <th className="py-2 pr-4 font-semibold">Fabric roll</th>
                <th className="py-2 pr-4 font-semibold">Yards</th>
                <th className="py-2 pr-4 font-semibold">Status</th>
                <th className="py-2 font-semibold">Created</th>
              </tr>
            </thead>
            <tbody>
              {orders.map((o) => (
                <tr key={o.id} className="border-b border-slate-200 align-top">
                  <td className="py-3 pr-4 font-medium">{o.orderNo}</td>
                  <td className="py-3 pr-4">
                    {o.recipeName}
                    <span className="block text-xs text-slate-700">{o.recipeCode}</span>
                  </td>
                  <td className="py-3 pr-4">{o.targetQty}</td>
                  <td className="py-3 pr-4">{o.fabricRollId}</td>
                  <td className="py-3 pr-4">{o.actualFabricYds}</td>
                  <td className="py-3 pr-4">
                    <span
                      className={`inline-block rounded px-2 py-0.5 text-xs font-semibold ${statusStyles[o.status]}`}
                    >
                      {statusLabels[o.status]}
                    </span>
                    {o.status === "REJECTED" && o.rejectionNote && (
                      <p className="mt-1 max-w-xs text-xs text-red-800">
                        Reason: {o.rejectionNote}
                      </p>
                    )}
                  </td>
                  <td className="py-3 whitespace-nowrap">
                    {dateFormat.format(new Date(o.createdAt))}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {open && <CreateOrderModal onClose={() => setOpen(false)} />}
    </div>
  );
}