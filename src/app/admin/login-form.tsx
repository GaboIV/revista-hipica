"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function AdminLoginForm() {
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");

    const res = await fetch("/admin/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password }),
    });

    if (res.ok) {
      router.refresh();
    } else {
      const data = await res.json();
      setError(data.error || "Error desconocido");
      setLoading(false);
    }
  }

  return (
    <div className="w-full max-w-sm">
      <div className="rounded-xl border border-borde bg-surface p-8 shadow-sm">
        <div className="mb-6 text-center">
          <p className="text-3xl">🏇</p>
          <h1 className="font-display mt-2 text-xl font-bold">Panel Admin</h1>
          <p className="mt-1 text-sm text-muted">
            Ingresa la contraseña de administrador
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label
              htmlFor="admin-password"
              className="mb-1.5 block text-sm font-medium"
            >
              Contraseña
            </label>
            <input
              id="admin-password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              autoFocus
              className="w-full rounded-lg border border-borde bg-background px-3 py-2.5 text-sm outline-none transition focus:border-vino focus:ring-2 focus:ring-vino/20"
              placeholder="••••••••"
            />
          </div>

          {error && (
            <p className="rounded-lg bg-red-50 px-3 py-2 text-sm font-medium text-red-700 dark:bg-red-950/40 dark:text-red-400">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-lg bg-vino px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-vino-deep disabled:opacity-60"
          >
            {loading ? "Verificando…" : "Ingresar"}
          </button>
        </form>
      </div>
    </div>
  );
}
