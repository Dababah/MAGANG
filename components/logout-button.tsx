"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function LogoutButton() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function logout() {
    setLoading(true);
    try {
      const response = await fetch("/api/auth/logout", { method: "POST" });
      const result = await response.json();
      if (!response.ok) throw new Error("Logout gagal");
      router.replace(result.redirectTo ?? "/login");
      router.refresh();
    } catch {
      setLoading(false);
    }
  }

  return (
    <button
      aria-label="Keluar dari akun"
      className="logout-button"
      disabled={loading}
      onClick={() => void logout()}
      type="button">
      <svg
        aria-hidden="true"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round">
        <path d="M10 17l5-5-5-5M15 12H3" />
        <path d="M12 3h6a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-6" />
      </svg>
      <span>{loading ? "Keluar..." : "Keluar"}</span>
    </button>
  );
}
