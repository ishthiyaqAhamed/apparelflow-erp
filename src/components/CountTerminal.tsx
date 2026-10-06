"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { ItemStatus } from "@prisma/client";
import { getItemStatus } from "@/lib/traffic-light";

export type VerifierItem = {
  id: number;
  componentId: number;
  componentName: string;
  expectedQty: number;
  actualQty: number | null;
};

export type VerifierOrder = {
  id: number;
  orderNo: string;
  recipeCode: string;
  recipeName: string;
  targetQty: number;
  fabricRollId: string;
  actualFabricYds: number;
  items: VerifierItem[];
};

const badges: Record<ItemStatus | "NONE", { label: string; cls: string }> = {
  GREEN: { label: "Match", cls: "bg-green-200 text-green-950" },
  YELLOW: { label: "Excess", cls: "bg-amber-200 text-amber-950" },
  RED: { label: "Shortage", cls: "bg-red-200 text-red-950" },
  NONE: { label: "Not counted", cls: "bg-slate-200 text-slate-900" },
};

function parseCount(value: string): number | null {
  const trimmed = value.trim();
  if (!/^\d+$/.test(trimmed)) return null;
  const n = Number(trimmed);
  return n <= 1000000 ? n : null;
}

export default function CountTerminal({ order }: { order: VerifierOrder }) {
  const router = useRouter();

  const [values, setValues] = useState<Record<number, string>>(() =>
    Object.fromEntries(
      order.items.map((i) => [
        i.componentId,
        i.actualQty === null ? "" : String(i.actualQty),
      ])
    )
  );
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [saving, setSaving] = useState(false);
  const [approving, setApproving] = useState(false);

  const [rejectOpen, setRejectOpen] = useState(false);
  const [note, setNote] = useState("");
  const [noteError, setNoteError] = useState("");
  const [rejecting, setRejecting] = useState(false);

  const rows = order.items.map((item) => {
    const raw = values[item.componentId] ?? "";
    const parsed = parseCount(raw);
    const invalid = raw.trim() !== "" && parsed === null;
    const status = parsed === null ? null : getItemStatus(parsed, item.expectedQty);
    const savedRaw = item.actualQty === null ? "" : String(item.actualQty);
    const changed = raw.trim() !== savedRaw;
    return { item, raw, invalid, status, changed };
  });

  const hasRed = rows.some((r) => r.status === "RED");
  const hasInvalid = rows.some((r) => r.invalid);
  const hasUnsavedChanges = rows.some((r) => r.changed);
  const allSaved = order.items.every((i) => i.actualQty !== null);
  const savedRed = order.items.some(
    (i) => i.actualQty !== null && getItemStatus(i.actualQty, i.expectedQty) === "RED"
  );

  let approveBlockedReason = "";
  if (hasInvalid) approveBlockedReason = "Fix the invalid counts first";
  else if (hasRed || savedRed) approveBlockedReason = "Shortage detected: reject this batch instead";
  else if (hasUnsavedChanges) approveBlockedReason = "Save your counts before approving";
  else if (!allSaved) approveBlockedReason = "Count and save every component first";

  const canApprove = approveBlockedReason === "";

  async function handleSave() {
    setError("");
    setMessage("");

    const counts: { componentId: number; actualQty: number }[] = [];
    for (const r of rows) {
      if (r.raw.trim() === "") continue;
      const parsed = parseCount(r.raw);
      if (parsed === null) {
        setError("Fix the highlighted counts: whole numbers only, no negatives or decimals");
        return;
      }
      counts.push({ componentId: r.item.componentId, actualQty: parsed });
    }

    if (counts.length === 0) {
      setError("Enter at least one count before saving");
      return;
    }

    setSaving(true);
    try {
      const res = await fetch(`/api/orders/${order.id}/count`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ counts }),
      });
      const data = await res.json();

      if (!res.ok) {
        setError(data.error ?? "Could not save the counts");
        return;
      }

      setMessage("Counts saved");
      router.refresh();
    } catch {
      setError("Could not reach the server. Try again.");
    } finally {
      setSaving(false);
    }
  }

  async function handleApprove() {
    setError("");
    setMessage("");
    setApproving(true);
    try {
      const res = await fetch(`/api/orders/${order.id}/approve`, { method: "POST" });
      const data = await res.json();

      if (!res.ok) {
        const blocking: string[] = data.blocking ?? [];
        setError(
          blocking.length > 0
            ? `${data.error} (${blocking.join(", ")})`
            : data.error ?? "Could not approve the batch"
        );
        return;
      }

      router.refresh();
    } catch {
      setError("Could not reach the server. Try again.");
    } finally {
      setApproving(false);
    }
  }

  async function handleReject() {
    setNoteError("");
    setError("");

    const trimmed = note.trim();
    if (trimmed.length < 5) {
      setNoteError("Enter a reason of at least 5 characters");
      return;
    }
    if (trimmed.length > 500) {
      setNoteError("Reason cannot exceed 500 characters");
      return;
    }

    setRejecting(true);
    try {
      const res = await fetch(`/api/orders/${order.id}/reject`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ note: trimmed }),
      });
      const data = await res.json();

      if (!res.ok) {
        setNoteError(data.error ?? "Could not reject the batch");
        return;
      }

      router.refresh();
    } catch {
      setNoteError("Could not reach the server. Try again.");
    } finally {
      setRejecting(false);
    }
  }

  return (
    <div className="rounded-lg border border-slate-300 bg-white p-6">
      <h2 className="text-lg font-bold text-slate-900">
        {order.orderNo} · {order.recipeName}
      </h2>
      <p className="text-sm text-slate-700">
        {order.recipeCode} · {order.targetQty} garments · Roll {order.fabricRollId} ·{" "}
        {order.actualFabricYds} yds used
      </p>

      <div className="mt-4 overflow-x-auto">
        <table className="w-full text-left text-sm text-slate-900">
          <thead>
            <tr className="border-b border-slate-300 text-slate-700">
              <th className="py-2 pr-4 font-semibold">Component</th>
              <th className="py-2 pr-4 font-semibold">Expected</th>
              <th className="py-2 pr-4 font-semibold">Counted</th>
              <th className="py-2 font-semibold">Status</th>
            </tr>
          </thead>
          <tbody>
            {rows.map(({ item, raw, invalid, status }) => {
              const badge = badges[status ?? "NONE"];
              return (
                <tr key={item.id} className="border-b border-slate-200 align-top">
                  <td className="py-3 pr-4 font-medium">{item.componentName}</td>
                  <td className="py-3 pr-4">{item.expectedQty}</td>
                  <td className="py-3 pr-4">
                    <input
                      type="text"
                      inputMode="numeric"
                      aria-label={`Counted ${item.componentName}`}
                      aria-invalid={invalid}
                      value={raw}
                      onChange={(e) =>
                        setValues((v) => ({ ...v, [item.componentId]: e.target.value }))
                      }
                      className={`w-24 rounded border bg-white px-2 py-1 text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-600 ${
                        invalid ? "border-red-700" : "border-slate-400"
                      }`}
                    />
                    {invalid && (
                      <p className="mt-1 text-xs font-medium text-red-700">
                        Whole number only
                      </p>
                    )}
                  </td>
                  <td className="py-3">
                    <span
                      className={`inline-block rounded px-2 py-0.5 text-xs font-semibold ${badge.cls}`}
                    >
                      {badge.label}
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {(hasRed || savedRed) && (
        <p
          role="alert"
          className="mt-4 rounded border border-red-700 bg-red-50 p-3 text-sm font-medium text-red-900"
        >
          Shortage detected. This batch cannot be approved. It must be rejected with a reason.
        </p>
      )}

      {error && (
        <p role="alert" className="mt-4 text-sm font-medium text-red-700">
          {error}
        </p>
      )}
      {message && (
        <p role="status" className="mt-4 text-sm font-medium text-green-800">
          {message}
        </p>
      )}

      <div className="mt-4 flex flex-wrap items-center gap-3">
        <button
          onClick={handleSave}
          disabled={saving || approving || rejecting}
          className="rounded border border-blue-700 bg-white px-4 py-2 font-medium text-blue-800 hover:bg-blue-50 disabled:opacity-60"
        >
          {saving ? "Saving..." : "Save counts"}
        </button>

        <button
          onClick={handleApprove}
          disabled={!canApprove || approving || saving || rejecting}
          className="rounded bg-green-700 px-4 py-2 font-medium text-white hover:bg-green-800 disabled:cursor-not-allowed disabled:bg-slate-300 disabled:text-slate-700"
        >
          {approving ? "Approving..." : "Approve Batch"}
        </button>

        <button
          onClick={() => {
            setRejectOpen(true);
            setNoteError("");
          }}
          disabled={saving || approving || rejecting}
          className="rounded bg-red-700 px-4 py-2 font-medium text-white hover:bg-red-800 disabled:opacity-60"
        >
          Reject Batch
        </button>
      </div>

      {!canApprove && (
        <p className="mt-2 text-sm text-slate-700">Approve is disabled: {approveBlockedReason}</p>
      )}

      {rejectOpen && (
        <div className="mt-4 rounded border border-slate-300 bg-slate-50 p-4">
          <label htmlFor="reject-note" className="mb-1 block text-sm font-medium text-slate-900">
            Reason for rejection (required)
          </label>
          <textarea
            id="reject-note"
            rows={3}
            maxLength={500}
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="e.g. Sleeve cuffs short by 3 pieces, fabric defect on roll"
            className="w-full rounded border border-slate-400 bg-white px-3 py-2 text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-600"
          />
          {noteError && (
            <p role="alert" className="mt-1 text-sm font-medium text-red-700">
              {noteError}
            </p>
          )}
          <div className="mt-3 flex gap-2">
            <button
              onClick={handleReject}
              disabled={rejecting}
              className="rounded bg-red-700 px-4 py-2 font-medium text-white hover:bg-red-800 disabled:opacity-60"
            >
              {rejecting ? "Rejecting..." : "Confirm rejection"}
            </button>
            <button
              onClick={() => {
                setRejectOpen(false);
                setNote("");
                setNoteError("");
              }}
              disabled={rejecting}
              className="rounded border border-slate-400 bg-white px-4 py-2 text-slate-900 hover:bg-slate-100"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}