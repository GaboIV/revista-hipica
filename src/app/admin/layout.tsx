import { isAdmin } from "@/lib/admin-auth";
import { AdminLoginForm } from "./login-form";
import Link from "next/link";

export const dynamic = "force-dynamic";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const autenticado = await isAdmin();

  if (!autenticado) {
    return (
      <main className="flex min-h-[60vh] items-center justify-center px-4">
        <AdminLoginForm />
      </main>
    );
  }

  return (
    <div className="min-h-[60vh]">
      {/* Barra admin */}
      <div className="border-b border-borde bg-vino-deep text-white">
        <div className="mx-auto flex max-w-6xl items-center gap-6 px-4 py-3">
          <Link href="/admin" className="font-display text-lg font-bold tracking-wide">
            🏇 Admin
          </Link>
          <nav className="flex gap-4 text-sm">
            <Link href="/admin" className="opacity-80 transition hover:opacity-100">
              Reuniones
            </Link>
            <Link href="/" className="opacity-60 transition hover:opacity-100">
              ← Ver sitio
            </Link>
          </nav>
          <form action="/admin/logout" method="POST" className="ml-auto">
            <button
              type="submit"
              className="rounded-md border border-white/20 px-3 py-1 text-xs font-medium transition hover:bg-white/10"
            >
              Cerrar sesión
            </button>
          </form>
        </div>
      </div>
      <div className="mx-auto max-w-6xl px-4 py-8">{children}</div>
    </div>
  );
}
