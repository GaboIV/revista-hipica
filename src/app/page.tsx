import Link from "next/link";
import { prisma } from "@/lib/db";
import { AdSlot } from "@/components/ad-slot";
import { fechaISO, horaCorta, titulo } from "@/lib/format";

export const dynamic = "force-dynamic";

const DIAS = ["DOM", "LUN", "MAR", "MIÉ", "JUE", "VIE", "SÁB"];
const MESES = [
  "ene", "feb", "mar", "abr", "may", "jun",
  "jul", "ago", "sep", "oct", "nov", "dic",
];

export default async function Home() {
  const reuniones = await prisma.reunion.findMany({
    orderBy: { fecha: "asc" },
    include: {
      hipodromo: true,
      carreras: {
        orderBy: { nroCarrera: "asc" },
        select: {
          nroCarrera: true,
          hora: true,
          nombreClasico: true,
          grado: true,
          _count: { select: { inscripciones: true } },
        },
      },
    },
  });

  return (
    <main>
      {/* Hero */}
      <section className="relative overflow-hidden bg-vino-deep text-white dark:bg-[#241014]">
        <div
          aria-hidden
          className="absolute inset-0 opacity-[0.07]"
          style={{
            backgroundImage:
              "repeating-linear-gradient(-45deg, transparent 0 22px, #fff 22px 23px)",
          }}
        />
        <div className="relative mx-auto max-w-6xl px-4 py-14 sm:py-20">
          <p className="text-xs font-semibold uppercase tracking-[0.3em] text-oro-bright">
            Hipódromo La Rinconada · Caracas
          </p>
          <h1 className="font-display mt-3 max-w-2xl text-4xl font-bold leading-tight sm:text-5xl">
            El hipismo venezolano, semana a semana.
          </h1>
          <p className="mt-4 max-w-xl text-white/70">
            Programación oficial, retrospectos y estadísticas de cada reunión.
          </p>
        </div>
        <div className="h-1 bg-gradient-to-r from-oro via-oro-bright to-oro" />
      </section>

      <div className="mx-auto max-w-6xl px-4">
        <div className="mt-6">
          <AdSlot format="leaderboard" />
        </div>

        {/* Selector de fecha */}
        <section className="mt-10">
          <h2 className="font-display text-2xl font-bold">Próximas reuniones</h2>
          <p className="mt-1 text-sm text-muted">
            Las inscripciones se publican los lunes por la tarde.
          </p>

          <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {reuniones.map((r) => {
              const clasicos = r.carreras.filter((c) => c.nombreClasico);
              const inscritos = r.carreras.reduce(
                (acc, c) => acc + c._count.inscripciones,
                0,
              );
              const primera = r.carreras[0];
              return (
                <Link
                  key={r.id}
                  href={`/programa/${fechaISO(r.fecha)}`}
                  className="group rounded-xl border border-borde bg-surface p-5 shadow-sm transition hover:-translate-y-0.5 hover:border-vino/40 hover:shadow-md"
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-xs font-bold uppercase tracking-widest text-vino">
                        {DIAS[r.fecha.getUTCDay()]}
                      </p>
                      <p className="font-display text-4xl font-bold leading-none">
                        {r.fecha.getUTCDate()}
                      </p>
                      <p className="mt-1 text-sm text-muted">
                        {MESES[r.fecha.getUTCMonth()]} {r.fecha.getUTCFullYear()}
                      </p>
                    </div>
                    <span className="rounded-full bg-vino-soft px-2.5 py-1 text-xs font-semibold text-vino">
                      {r.hipodromo.nombre}
                    </span>
                  </div>

                  <div className="mt-4 flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted">
                    <span>
                      <strong className="text-foreground">{r.carreras.length}</strong>{" "}
                      carreras
                    </span>
                    <span>
                      <strong className="text-foreground">{inscritos}</strong> inscritos
                    </span>
                    {primera?.hora && (
                      <span>
                        desde{" "}
                        <strong className="text-foreground">
                          {horaCorta(primera.hora)}
                        </strong>
                      </span>
                    )}
                  </div>

                  {clasicos.length > 0 && (
                    <div className="mt-3 space-y-1 border-t border-borde pt-3">
                      {clasicos.map((c) => (
                        <p key={c.nroCarrera} className="truncate text-xs">
                          <span className="mr-1.5 rounded bg-oro-soft px-1.5 py-0.5 font-bold text-oro">
                            {c.grado}
                          </span>
                          <span className="font-medium">
                            {titulo(c.nombreClasico!)}
                          </span>
                        </p>
                      ))}
                    </div>
                  )}

                  <p className="mt-4 text-sm font-semibold text-vino transition group-hover:translate-x-0.5">
                    Ver programa →
                  </p>
                </Link>
              );
            })}
          </div>

          {reuniones.length === 0 && (
            <p className="mt-6 rounded-lg border border-borde bg-surface p-6 text-muted">
              Aún no hay reuniones cargadas.
            </p>
          )}
        </section>
      </div>
    </main>
  );
}
