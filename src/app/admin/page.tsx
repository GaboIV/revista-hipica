// Panel Admin — Dashboard: lista de reuniones.
import Link from "next/link";
import { prisma } from "@/lib/db";
import { fechaLarga, fechaISO } from "@/lib/format";

export const metadata = { title: "Admin — Reuniones" };

export default async function AdminPage() {
  const reuniones = await prisma.reunion.findMany({
    orderBy: { fecha: "desc" },
    include: {
      hipodromo: true,
      carreras: {
        select: {
          id: true,
          _count: { select: { resultados: true } },
        },
      },
    },
  });

  return (
    <>
      <h1 className="font-display text-2xl font-bold">Reuniones</h1>
      <p className="mt-1 text-sm text-muted">
        Selecciona una reunión para cargar resultados.
      </p>

      <div className="mt-6 space-y-3">
        {reuniones.map((r) => {
          const totalCarreras = r.carreras.length;
          const conResultados = r.carreras.filter(
            (c) => c._count.resultados > 0,
          ).length;
          const todas = conResultados === totalCarreras && totalCarreras > 0;
          const algunas = conResultados > 0 && !todas;

          return (
            <Link
              key={r.id}
              href={`/admin/reunion/${fechaISO(r.fecha)}`}
              className="group flex items-center gap-4 rounded-xl border border-borde bg-surface px-5 py-4 shadow-sm transition hover:-translate-y-0.5 hover:border-vino/40 hover:shadow-md"
            >
              <div className="min-w-0 flex-1">
                <p className="text-xs font-semibold uppercase tracking-widest text-vino">
                  Reunión {r.nroReunion} · {r.hipodromo.nombre}
                </p>
                <p className="mt-0.5 font-display text-lg font-bold">
                  {fechaLarga(r.fecha)}
                </p>
                <p className="mt-1 text-sm text-muted">
                  {totalCarreras} carreras · {conResultados} con resultados
                </p>
              </div>

              <div className="flex flex-col items-end gap-1">
                {todas && (
                  <span className="rounded-full bg-green-100 px-3 py-1 text-xs font-bold text-green-800 dark:bg-green-950/50 dark:text-green-400">
                    ✓ Completa
                  </span>
                )}
                {algunas && (
                  <span className="rounded-full bg-yellow-100 px-3 py-1 text-xs font-bold text-yellow-800 dark:bg-yellow-950/50 dark:text-yellow-400">
                    Parcial ({conResultados}/{totalCarreras})
                  </span>
                )}
                {conResultados === 0 && (
                  <span className="rounded-full bg-surface-2 px-3 py-1 text-xs font-semibold text-muted">
                    Sin resultados
                  </span>
                )}
                <span className="text-xs font-medium text-vino opacity-0 transition group-hover:opacity-100">
                  Administrar →
                </span>
              </div>
            </Link>
          );
        })}

        {reuniones.length === 0 && (
          <p className="rounded-lg border border-borde bg-surface p-6 text-muted">
            No hay reuniones cargadas.
          </p>
        )}
      </div>
    </>
  );
}
