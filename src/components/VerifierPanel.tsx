"use client";

import { useState } from "react";
import CountTerminal, { type VerifierOrder } from "@/components/CountTerminal";

export default function VerifierPanel({ orders }: { orders: VerifierOrder[] }) {
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const selected = orders.find((o) => o.id === selectedId) ?? null;

  return (
    <div className="space-y-4">
      <div className="rounded-lg border border-slate-300 bg-white p-6">
        <h1 className="text-xl font-bold text-slate-900">Verification Queue</h1>
        <p className="text-sm text-slate-700">
          Batches waiting at the QC station. Select one to count its pieces.
        </p>

        {orders.length === 0 ? (
          <p className="mt-4 text-slate-700">No batches are waiting for verification.</p>
        ) : (
          <ul className="mt-4 space-y-2">
            {orders.map((o) => (
              <li key={o.id}>
                <button
                  onClick={() => setSelectedId(o.id)}
                  className={`w-full rounded border px-3 py-2 text-left text-slate-900 hover:bg-slate-100 ${
                    o.id === selectedId
                      ? "border-blue-700 bg-blue-50"
                      : "border-slate-400 bg-white"
                  }`}
                >
                  <span className="font-medium">{o.orderNo}</span>
                  <span className="block text-sm text-slate-700">
                    {o.recipeName} · {o.targetQty} garments · {o.fabricRollId}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      {selected && <CountTerminal key={selected.id} order={selected} />}
    </div>
  );
}