"use client";

import { useState } from "react";
import CreateOrderModal from "@/components/CreateOrderModal";

export default function SupervisorPanel() {
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

      {open && <CreateOrderModal onClose={() => setOpen(false)} />}
    </div>
  );
}