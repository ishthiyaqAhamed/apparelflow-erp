"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

const demoAccounts = [
  { label: "Cutting Supervisor", email: "supervisor@apparelflow.com" },
  { label: "Cutting Verifier", email: "verifier@apparelflow.com" },
  { label: "Sewing Supervisor", email: "sewing@apparelflow.com" },
];

const DEMO_PASSWORD = "Demo@1234";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    if (!email.trim() || !password) {
      setError("Enter your email and password");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();

      if (!res.ok) {
        setError(data.error ?? "Login failed");
        return;
      }
      router.push("/dashboard");
    } catch {
      setError("Could not reach the server. Try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen flex items-center justify-center p-4">
      <div className="w-full max-w-md space-y-6">
        <div className="bg-white rounded-lg border border-slate-300 p-6 shadow-sm">
          <h1 className="text-2xl font-bold text-slate-900">ApparelFlow ERP</h1>
          <p className="text-slate-700 mb-6">Cutting Operations Terminal</p>

          <form onSubmit={handleSubmit} className="space-y-4" noValidate>
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-slate-900 mb-1">
                Email
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full rounded border border-slate-400 bg-white px-3 py-2 text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-600"
              />
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-slate-900 mb-1">
                Password
              </label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full rounded border border-slate-400 bg-white px-3 py-2 text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-600"
              />
            </div>

            {error && (
              <p role="alert" className="text-sm font-medium text-red-700">
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full rounded bg-blue-700 px-4 py-2 font-medium text-white hover:bg-blue-800 disabled:opacity-60"
            >
              {loading ? "Signing in..." : "Sign in"}
            </button>
          </form>
        </div>

        <div className="bg-white rounded-lg border border-slate-300 p-6 shadow-sm">
          <h2 className="font-semibold text-slate-900">Demo credentials</h2>
          <p className="text-sm text-slate-700 mb-3">
            Click a role to fill the form. Password for all: {DEMO_PASSWORD}
          </p>
          <div className="space-y-2">
            {demoAccounts.map((acc) => (
              <button
                key={acc.email}
                type="button"
                onClick={() => {
                  setEmail(acc.email);
                  setPassword(DEMO_PASSWORD);
                  setError("");
                }}
                className="w-full text-left rounded border border-slate-400 px-3 py-2 text-slate-900 hover:bg-slate-100"
              >
                <span className="font-medium">{acc.label}</span>
                <span className="block text-sm text-slate-700">{acc.email}</span>
              </button>
            ))}
          </div>
        </div>
      </div>
    </main>
  );
}