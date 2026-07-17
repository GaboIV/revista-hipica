import Link from "next/link";

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-40 border-b border-vino-deep/40 bg-vino text-white shadow-md">
      <div className="mx-auto flex h-14 max-w-6xl items-center gap-6 px-4">
        <Link href="/" className="flex items-baseline gap-2">
          <span className="font-display text-xl font-bold tracking-tight">
            Revista Hípica
          </span>
          <span className="hidden text-[11px] font-semibold uppercase tracking-[0.2em] text-oro-bright sm:inline">
            Venezuela
          </span>
        </Link>
        <nav className="ml-auto flex items-center gap-1 text-sm">
          <Link
            href="/"
            className="rounded-md px-3 py-1.5 font-medium text-white/85 transition hover:bg-white/10 hover:text-white"
          >
            Programa
          </Link>
          <span
            className="cursor-default rounded-md px-3 py-1.5 font-medium text-white/40"
            title="Disponible en Fase 3"
          >
            Estadísticas
          </span>
          <span
            className="cursor-default rounded-md px-3 py-1.5 font-medium text-white/40"
            title="Próximamente"
          >
            Revista
          </span>
        </nav>
      </div>
      <div className="h-0.5 bg-gradient-to-r from-oro via-oro-bright to-oro" />
    </header>
  );
}
