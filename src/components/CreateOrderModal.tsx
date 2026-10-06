"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

type RecipeComponent = {
  id: number;
  componentName: string;
  piecesPerGarment: number;
};

type Recipe = {
  id: number;
  recipeCode: string;
  name: string;
  components: RecipeComponent[];
};

type FieldErrors = Partial<
  Record<"recipeId" | "targetQty" | "fabricRollId" | "actualFabricYds", string>
>;

const inputClass =
  "w-full rounded border border-slate-400 bg-white px-3 py-2 text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-600";

export default function CreateOrderModal({ onClose }: { onClose: () => void }) {
  const router = useRouter();
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [loadError, setLoadError] = useState("");

  const [recipeId, setRecipeId] = useState("");
  const [targetQty, setTargetQty] = useState("");
  const [fabricRollId, setFabricRollId] = useState("");
  const [actualFabricYds, setActualFabricYds] = useState("");

  const [errors, setErrors] = useState<FieldErrors>({});
  const [formError, setFormError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    async function loadRecipes() {
      try {
        const res = await fetch("/api/recipes");
        if (!res.ok) throw new Error();
        const data = await res.json();
        setRecipes(data.recipes);
      } catch {
        setLoadError("Could not load recipes. Close and try again.");
      }
    }
    loadRecipes();
  }, []);

  const selectedRecipe = recipes.find((r) => String(r.id) === recipeId);
  const qtyIsValid = /^\d+$/.test(targetQty) && Number(targetQty) > 0;

  function validate(): FieldErrors {
    const e: FieldErrors = {};

    if (!recipeId) e.recipeId = "Select a recipe";

    if (!/^\d+$/.test(targetQty) || Number(targetQty) < 1) {
      e.targetQty = "Enter a whole number of 1 or more (no decimals or negatives)";
    } else if (Number(targetQty) > 100000) {
      e.targetQty = "Quantity cannot exceed 100000";
    }

    if (!fabricRollId.trim()) {
      e.fabricRollId = "Fabric roll ID is required";
    } else if (fabricRollId.trim().length > 50) {
      e.fabricRollId = "Fabric roll ID is too long (max 50 characters)";
    }

    if (!/^\d+(\.\d{1,2})?$/.test(actualFabricYds) || Number(actualFabricYds) <= 0) {
      e.actualFabricYds = "Enter yards greater than 0 (up to 2 decimals, e.g. 92.5)";
    } else if (Number(actualFabricYds) > 100000) {
      e.actualFabricYds = "Yards cannot exceed 100000";
    }

    return e;
  }

  async function handleSubmit(ev: React.FormEvent) {
    ev.preventDefault();
    setFormError("");

    const found = validate();
    setErrors(found);
    if (Object.keys(found).length > 0) return;

    setSubmitting(true);
    try {
      const res = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          recipeId: Number(recipeId),
          targetQty: Number(targetQty),
          fabricRollId: fabricRollId.trim(),
          actualFabricYds: Number(actualFabricYds),
        }),
      });
      const data = await res.json();

      if (!res.ok) {
        if (data.errors) setErrors(data.errors);
        setFormError(data.error ?? "Could not create the order");
        return;
      }

      router.refresh();
      onClose();
    } catch {
      setFormError("Could not reach the server. Try again.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-slate-900/60 p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="create-order-title"
    >
      <div className="w-full max-w-lg rounded-lg bg-white p-6 shadow-lg">
        <h2 id="create-order-title" className="text-xl font-bold text-slate-900">
          New Cutting Order
        </h2>

        {loadError && (
          <p role="alert" className="mt-2 text-sm font-medium text-red-700">
            {loadError}
          </p>
        )}

        <form onSubmit={handleSubmit} noValidate className="mt-4 space-y-4">
          <div>
            <label htmlFor="recipe" className="mb-1 block text-sm font-medium text-slate-900">
              Recipe
            </label>
            <select
              id="recipe"
              value={recipeId}
              onChange={(e) => setRecipeId(e.target.value)}
              className={inputClass}
            >
              <option value="">Select a recipe</option>
              {recipes.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.recipeCode} - {r.name}
                </option>
              ))}
            </select>
            {errors.recipeId && (
              <p className="mt-1 text-sm font-medium text-red-700">{errors.recipeId}</p>
            )}
          </div>

          <div>
            <label htmlFor="qty" className="mb-1 block text-sm font-medium text-slate-900">
              Target batch quantity (garments)
            </label>
            <input
              id="qty"
              type="text"
              inputMode="numeric"
              value={targetQty}
              onChange={(e) => setTargetQty(e.target.value)}
              placeholder="e.g. 50"
              className={inputClass}
            />
            {errors.targetQty && (
              <p className="mt-1 text-sm font-medium text-red-700">{errors.targetQty}</p>
            )}
          </div>

          <div>
            <label htmlFor="roll" className="mb-1 block text-sm font-medium text-slate-900">
              Fabric roll ID
            </label>
            <input
              id="roll"
              type="text"
              value={fabricRollId}
              onChange={(e) => setFabricRollId(e.target.value)}
              placeholder="e.g. FAB-ROLL-882"
              className={inputClass}
            />
            {errors.fabricRollId && (
              <p className="mt-1 text-sm font-medium text-red-700">{errors.fabricRollId}</p>
            )}
          </div>

          <div>
            <label htmlFor="yards" className="mb-1 block text-sm font-medium text-slate-900">
              Actual fabric used (yards)
            </label>
            <input
              id="yards"
              type="text"
              inputMode="decimal"
              value={actualFabricYds}
              onChange={(e) => setActualFabricYds(e.target.value)}
              placeholder="e.g. 92.5"
              className={inputClass}
            />
            {errors.actualFabricYds && (
              <p className="mt-1 text-sm font-medium text-red-700">{errors.actualFabricYds}</p>
            )}
          </div>

          {selectedRecipe && qtyIsValid && (
            <div className="rounded border border-slate-300 bg-slate-50 p-3">
              <p className="mb-2 text-sm font-semibold text-slate-900">
                Expected component counts
              </p>
              <ul className="space-y-1 text-sm text-slate-900">
                {selectedRecipe.components.map((c) => (
                  <li key={c.id} className="flex justify-between">
                    <span>{c.componentName}</span>
                    <span className="font-medium">
                      {Number(targetQty) * c.piecesPerGarment} pcs
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {formError && (
            <p role="alert" className="text-sm font-medium text-red-700">
              {formError}
            </p>
          )}

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded border border-slate-400 bg-white px-4 py-2 text-slate-900 hover:bg-slate-100"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting || !!loadError}
              className="rounded bg-blue-700 px-4 py-2 font-medium text-white hover:bg-blue-800 disabled:opacity-60"
            >
              {submitting ? "Submitting..." : "Submit for verification"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}