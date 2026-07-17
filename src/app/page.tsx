// Portada provisional (Fase 0): prueba end-to-end de Next.js + Prisma + PostgreSQL.
// El diseño real (selector de fecha, tabs, etc.) llega en Fase 1 — ver PLAN.md.
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

export default async function Home() {
  const reunion = await prisma.reunion.findFirst({
    orderBy: { fecha: "desc" },
    include: {
      hipodromo: true,
      carreras: {
        orderBy: { nroCarrera: "asc" },
        include: { _count: { select: { inscripciones: true } } },
      },
    },
  });

  if (!reunion) {
    return (
      <main className="mx-auto max-w-3xl p-8">
        <h1 className="text-2xl font-bold">Revista Hípica</h1>
        <p className="mt-4 text-neutral-500">
          Sin datos. Ejecuta <code>npx prisma db seed</code>.
        </p>
      </main>
    );
  }

  const fecha = reunion.fecha.toLocaleDateString("es-VE", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  });

  return (
    <main className="mx-auto max-w-3xl p-8">
      <h1 className="text-2xl font-bold">Revista Hípica — Fase 0</h1>
      <p className="mt-2 text-neutral-600 dark:text-neutral-400">
        {reunion.hipodromo.nombre} · Reunión {reunion.nroReunion} ·{" "}
        <span className="capitalize">{fecha}</span>
      </p>
      <ul className="mt-6 divide-y divide-neutral-200 dark:divide-neutral-800">
        {reunion.carreras.map((c) => (
          <li key={c.id} className="flex items-baseline gap-4 py-2">
            <span className="w-10 font-mono font-bold">C{c.nroCarrera}</span>
            <span className="w-20 text-sm text-neutral-500">{c.hora}</span>
            <span className="w-16 text-sm">{c.distancia}m</span>
            <span className="flex-1 truncate text-sm">
              {c.nombreClasico ? (
                <strong>
                  {c.nombreClasico} {c.grado && `[${c.grado}]`}
                </strong>
              ) : (
                (c.condicion ?? "").slice(0, 60)
              )}
            </span>
            <span className="text-sm text-neutral-500">{c._count.inscripciones} insc.</span>
          </li>
        ))}
      </ul>
    </main>
  );
}
