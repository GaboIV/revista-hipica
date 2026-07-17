// Admin — Detalle de reunión: carreras con estado de resultados.
import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import {
  fechaLarga,
  horaCorta,
  nombreCortoCarrera,
  formatoBs,
} from "@/lib/format";

export const dynamic = "force-dynamic";

type Params = { fecha: string };

export async function generateMetadata({
  params,
}: {
  params: Promise<Params>;
}) {
  const { fecha } = await params;
  return { title: `Admin — Reunión ${fecha}` };
}

export default async function AdminReunionPage({
  params,
}: {
  params: Promise<Params>;
}) {
  const { fecha } = await params;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(fecha)) notFound();

  const reunion = await prisma.reunion.findFirst({
    where: { fecha: new Date(fecha) },
    include: {
      hipodromo: true,
      carreras: {
        orderBy: { nroCarrera: "asc" },
        include: {
          _count: { select: { inscripciones: true, resultados: true } },
        },
      },
    },
  });

  if (!reunion) notFound();

  return (
    <>
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <div>
          <Link
            href="/admin"
            className="text-sm font-medium text-vino hover:underline"
          >
            ← Todas las reuniones
          </Link>
          <p className="mt-2 text-xs font-semibold uppercase tracking-widest text-vino">
            Reunión {reunion.nroReunion} · {reunion.hipodromo.nombre}
          </p>
          <h1 className="font-display text-2xl font-bold">
            {fechaLarga(reunion.fecha)}
          </h1>
        </div>
        <span
          className={`rounded-full px-3 py-1 text-xs font-bold ${
            reunion.estado === "CORRIDA"
              ? "bg-green-100 text-green-800 dark:bg-green-950/50 dark:text-green-400"
              : reunion.estado === "SUSPENDIDA"
                ? "bg-red-100 text-red-700 dark:bg-red-950/50 dark:text-red-400"
                : "bg-surface-2 text-muted"
          }`}
        >
          {reunion.estado}
        </span>
      </div>

      <div className="mt-6 space-y-3">
        {reunion.carreras.map((c) => {
          const tieneResultados = c._count.resultados > 0;
          return (
            <div
              key={c.id}
              className="flex items-center gap-4 rounded-xl border border-borde bg-surface px-5 py-4 shadow-sm"
            >
              <span
                className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg text-sm font-bold ${
                  tieneResultados
                    ? "bg-green-600 text-white"
                    : "bg-vino text-white"
                }`}
              >
                {c.nroCarrera}
              </span>

              <div className="min-w-0 flex-1">
                <p className="truncate font-semibold">
                  {nombreCortoCarrera(c.condicion, c.nombreClasico)}
                  {c.grado && (
                    <span className="ml-2 rounded bg-oro px-1.5 py-0.5 text-xs font-bold text-white">
                      {c.grado}
                    </span>
                  )}
                </p>
                <p className="mt-0.5 flex flex-wrap gap-x-3 text-xs text-muted">
                  <span>{horaCorta(c.hora)}</span>
                  <span>{c.distancia}m</span>
                  <span>{c._count.inscripciones} inscritos</span>
                  <span>{formatoBs(c.premioBs)}</span>
                </p>
              </div>

              <div className="flex items-center gap-3">
                {tieneResultados ? (
                  <span className="rounded-full bg-green-100 px-3 py-1 text-xs font-bold text-green-800 dark:bg-green-950/50 dark:text-green-400">
                    ✓ Cargados
                  </span>
                ) : (
                  <span className="rounded-full bg-surface-2 px-3 py-1 text-xs font-semibold text-muted">
                    Pendiente
                  </span>
                )}
                <Link
                  href={`/admin/resultados/${c.id}`}
                  className="rounded-lg bg-vino px-4 py-2 text-sm font-semibold text-white transition hover:bg-vino-deep"
                >
                  {tieneResultados ? "Editar" : "Cargar"}
                </Link>
              </div>
            </div>
          );
        })}
      </div>
    </>
  );
}
