"use client";

import { useRouter } from "next/navigation";

export default function LogoutButton() {
  const router = useRouter();

  async function handleLogout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/");
    router.refresh();
  }

  return (
    <button
      onClick={handleLogout}
      className="rounded border border-slate-400 bg-white px-3 py-1.5 text-sm font-medium text-slate-900 hover:bg-slate-100"
    >
      Log out
    </button>
  );
}