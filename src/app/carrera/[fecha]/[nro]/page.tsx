import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { prisma } from "@/lib/db";
import { AdSlot } from "@/components/ad-slot";
import { Gualdrapa } from "@/components/gualdrapa";
import {
  fechaLarga,
  formatoBs,
  formatoUsd,
  horaCorta,
  nombreCortoCarrera,
  nombreEjemplar,
  displayPersona,
} from "@/lib/format";

export const dynamic = "force-dynamic";

type Params = { fecha: string; nro: string };

export async function generateMetadata({
  params,
}: {
  params: Promise<Params>;
}): Promise<Metadata> {
  const { fecha, nro } = await params;
  return { title: `Carrera ${nro} · ${fecha} — La Rinconada` };
}

export default async function CarreraPage({ params }: { params: Promise<Params> }) {
  const { fecha, nro } = await params;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(fecha) || !/^\d+$/.test(nro)) notFound();

  const reunion = await prisma.reunion.findFirst({
    where: { fecha: new Date(fecha) },
    include: {
      hipodromo: true,
      carreras: { select: { nroCarrera: true }, orderBy: { nroCarrera: "asc" } },
    },
  });
  if (!reunion) notFound();

  const carrera = await prisma.carrera.findUnique({
    where: {
      reunionId_nroCarrera: { reunionId: reunion.id, nroCarrera: Number(nro) },
    },
    include: {
      inscripciones: {
        orderBy: { nroPuesto: "asc" },
        include: {
          ejemplar: {
            include: {
              actuaciones: {
                orderBy: { fecha: "desc" },
                take: 6,
                include: { jinete: true },
              },
            },
          },
          jinete: true,
          entrenador: true,
          stud: true,
        },
      },
    },
  });
  if (!carrera) notFound();

  const hayHistorial = carrera.inscripciones.some(
    (i) => i.ejemplar.actuaciones.length > 0,
  );

  return (
    <main>
      {/* Barra de navegación entre carreras */}
      <div className="border-b border-borde bg-surface">
        <div className="mx-auto flex max-w-6xl items-center gap-3 overflow-x-auto px-4 py-3">
          <Link
            href={`/programa/${fecha}`}
            className="shrink-0 text-sm font-medium text-vino hover:underline"
          >
            ← Programa
          </Link>
          <span className="h-5 w-px shrink-0 bg-borde" />
          <div className="flex gap-1">
            {reunion.carreras.map((c) => (
              <Link
                key={c.nroCarrera}
                href={`/carrera/${fecha}/${c.nroCarrera}`}
                className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-sm font-bold transition ${
                  c.nroCarrera === carrera.nroCarrera
                    ? "bg-vino text-white"
                    : "bg-surface-2 text-muted hover:bg-vino-soft hover:text-vino"
                }`}
              >
                {c.nroCarrera}
              </Link>
            ))}
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-6xl px-4 py-8">
        {/* Cabecera de la carrera */}
        <section className="overflow-hidden rounded-xl border border-borde bg-surface shadow-sm">
          <div className="border-l-4 border-vino p-5">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-widest text-muted">
                  {reunion.hipodromo.nombre} ·{" "}
                  <span>{fechaLarga(reunion.fecha)}</span>
                </p>
                <h1 className="font-display mt-1 text-2xl font-bold sm:text-3xl">
                  Carrera {carrera.nroCarrera} ·{" "}
                  {nombreCortoCarrera(carrera.condicion, carrera.nombreClasico)}
                  {carrera.grado && (
                    <span className="ml-2 align-middle rounded bg-oro px-2 py-0.5 text-sm font-bold text-white">
                      {carrera.grado}
                    </span>
                  )}
                </h1>
                <p className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted">
                  <span className="font-semibold text-foreground">
                    {horaCorta(carrera.hora)}
                  </span>
                  <span>{carrera.distancia} metros</span>
                  <span>{carrera.superficie}</span>
                  <span>{carrera.inscripciones.length} inscritos</span>
                  {carrera.record && <span>Récord: {carrera.record}</span>}
                </p>
              </div>
              <div className="rounded-lg bg-surface-2 px-4 py-3 text-right">
                <p className="text-lg font-bold">{formatoBs(carrera.premioBs)}</p>
                <p className="text-sm text-muted">{formatoUsd(carrera.premioUsd)}</p>
              </div>
            </div>
            {carrera.condicion && (
              <p className="mt-4 border-t border-borde pt-3 text-xs leading-relaxed text-muted">
                {carrera.condicion}
              </p>
            )}
          </div>
        </section>

        {!hayHistorial && (
          <p className="mt-6 rounded-lg border border-dashed border-borde bg-surface-2/50 px-4 py-3 text-sm text-muted">
            El retrospecto de cada ejemplar aparecerá aquí cuando se cargue el
            histórico de actuaciones (Fase 2).
          </p>
        )}

        {/* Inscritos */}
        <div className="mt-6 space-y-4">
          {carrera.inscripciones.map((i) => (
            <section
              key={i.id}
              className={`overflow-hidden rounded-xl border border-borde bg-surface shadow-sm ${
                i.retirado ? "opacity-50" : ""
              }`}
            >
              <div className="flex flex-wrap items-center gap-x-5 gap-y-2 px-4 py-3.5">
                <div className="flex items-center gap-3">
                  <Gualdrapa n={i.nroPuesto} className="!h-10 !w-10 !text-base" />
                  <div>
                    <p className="text-base font-bold">
                      {nombreEjemplar(i.ejemplar.nombre)}
                      {i.retirado && (
                        <span className="ml-2 text-xs font-semibold uppercase text-red-600">
                          Retirado
                        </span>
                      )}
                    </p>
                    <p className="text-xs text-muted">
                      {[i.stud?.nombre, i.pp != null ? `PP ${i.pp}` : null]
                        .filter(Boolean)
                        .join(" · ")}
                    </p>
                  </div>
                </div>

                <dl className="ml-auto grid grid-cols-2 gap-x-6 gap-y-1 text-xs sm:grid-cols-4">
                  <div>
                    <dt className="text-muted">Jinete</dt>
                    <dd className="font-semibold">{displayPersona(i.jinete)}</dd>
                  </div>
                  <div>
                    <dt className="text-muted">Entrenador</dt>
                    <dd className="font-semibold">
                      {displayPersona(i.entrenador)}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-muted">Kilos</dt>
                    <dd className="font-semibold">
                      {i.kilos ? Number(i.kilos) : "—"}
                      {i.descargo ? (
                        <sup className="text-vino"> -{i.descargo}</sup>
                      ) : null}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-muted">Reclamo</dt>
                    <dd className="font-semibold">
                      {i.precioUsd ? formatoUsd(i.precioUsd) : "—"}
                    </dd>
                  </div>
                </dl>
              </div>

              {(i.medicacion || i.implementos) && (
                <div className="flex flex-wrap gap-2 border-t border-borde/60 bg-surface-2/40 px-4 py-2 text-[11px]">
                  {i.medicacion && (
                    <span className="rounded border border-borde bg-surface px-1.5 py-0.5 font-medium text-muted">
                      {i.medicacion}
                    </span>
                  )}
                  {i.implementos && (
                    <span className="rounded border border-borde bg-surface px-1.5 py-0.5 font-medium text-muted">
                      {i.implementos}
                    </span>
                  )}
                </div>
              )}

              {i.ejemplar.actuaciones.length > 0 && (
                <div className="overflow-x-auto border-t border-borde">
                  <table className="w-full min-w-[640px] text-xs">
                    <thead>
                      <tr className="text-left uppercase tracking-wide text-muted">
                        <th className="py-1.5 pl-4 pr-2 font-semibold">Fecha</th>
                        <th className="px-2 py-1.5 font-semibold">Dist.</th>
                        <th className="px-2 py-1.5 font-semibold">Tiempo</th>
                        <th className="px-2 py-1.5 font-semibold">Pos.</th>
                        <th className="px-2 py-1.5 font-semibold">Jinete</th>
                        <th className="px-2 py-1.5 font-semibold">Kg</th>
                        <th className="py-1.5 pl-2 pr-4 font-semibold">
                          Ganador-Segundo-Tercero
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-borde/60">
                      {i.ejemplar.actuaciones.map((a) => (
                        <tr key={a.id}>
                          <td className="py-1.5 pl-4 pr-2 font-medium">
                            {a.fecha.toISOString().slice(0, 10)}
                          </td>
                          <td className="px-2 py-1.5">{a.distancia ?? "—"}</td>
                          <td className="px-2 py-1.5">{a.tiempo ?? "—"}</td>
                          <td className="px-2 py-1.5 font-bold">
                            {a.posFinal ?? "—"}
                            {a.nroInscritos ? `/${a.nroInscritos}` : ""}
                          </td>
                          <td className="px-2 py-1.5">{displayPersona(a.jinete)}</td>
                          <td className="px-2 py-1.5">{a.kilos ? Number(a.kilos) : "—"}</td>
                          <td className="py-1.5 pl-2 pr-4 text-muted">
                            {[a.ganador, a.segundo, a.tercero]
                              .filter(Boolean)
                              .join(" · ") || "—"}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </section>
          ))}
        </div>

        <div className="mt-10">
          <AdSlot format="banner" />
        </div>
      </div>
    </main>
  );
}
