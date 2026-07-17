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

type Params = { fecha: string };
type Search = { tab?: string };

export async function generateMetadata({
  params,
}: {
  params: Promise<Params>;
}): Promise<Metadata> {
  const { fecha } = await params;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(fecha)) return { title: "Programa Oficial" };

  const reunion = await prisma.reunion.findFirst({
    where: { fecha: new Date(fecha) },
    include: {
      hipodromo: true,
      carreras: {
        select: {
          id: true,
          inscripciones: { select: { id: true } }
        }
      }
    },
  });

  if (!reunion) {
    return { title: `Programa ${fecha} · La Rinconada` };
  }

  const fLarga = fechaLarga(reunion.fecha);
  const totalCarreras = reunion.carreras.length;
  const totalInscritos = reunion.carreras.reduce((acc, c) => acc + c.inscripciones.length, 0);

  const title = `Programa Oficial · Reunión ${reunion.nroReunion} (${fLarga}) — ${reunion.hipodromo.nombre}`;
  const description = `Programación oficial para la Reunión ${reunion.nroReunion} en ${reunion.hipodromo.nombre} (${fLarga}). Consulta las ${totalCarreras} carreras, ${totalInscritos} ejemplares inscritos, retrospectos de actuaciones, compromisos y resultados.`;

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      type: "website",
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
    },
  };
}

async function cargarReunion(fecha: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(fecha)) return null;
  return prisma.reunion.findFirst({
    where: { fecha: new Date(fecha) },
    include: {
      hipodromo: true,
      carreras: {
        orderBy: { nroCarrera: "asc" },
        include: {
          inscripciones: {
            orderBy: { nroPuesto: "asc" },
            include: {
              ejemplar: true,
              jinete: true,
              entrenador: true,
              resultado: true,
            },
          },
        },
      },
    },
  });
}

type ReunionCompleta = NonNullable<Awaited<ReturnType<typeof cargarReunion>>>;

export default async function ProgramaPage({
  params,
  searchParams,
}: {
  params: Promise<Params>;
  searchParams: Promise<Search>;
}) {
  const { fecha } = await params;
  const { tab = "carreras" } = await searchParams;
  const reunion = await cargarReunion(fecha);
  if (!reunion) notFound();

  const totalInscritos = reunion.carreras.reduce(
    (acc, c) => acc + c.inscripciones.length,
    0,
  );

  // Contar carreras con resultados
  const carrerasConResultados = reunion.carreras.filter((c) =>
    c.inscripciones.some((i) => i.resultado),
  ).length;

  const tabs: { id: string; label: string; badge: number | null }[] = [
    { id: "carreras", label: "Carreras", badge: reunion.carreras.length },
    { id: "inscritos", label: "Inscritos", badge: totalInscritos },
    { id: "compromisos", label: "Compromisos", badge: null },
  ];

  // Solo mostrar tab de resultados si hay al menos un resultado cargado
  if (carrerasConResultados > 0) {
    tabs.push({
      id: "resultados",
      label: "Resultados",
      badge: carrerasConResultados,
    });
  }

  return (
    <main>
      {/* Sub-header de la reunión */}
      <div className="border-b border-borde bg-surface">
        <div className="mx-auto max-w-6xl px-4 pt-6">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <div>
              <p className="text-xs font-semibold uppercase tracking-widest text-vino">
                Reunión {reunion.nroReunion} · {reunion.hipodromo.nombre}
              </p>
              <h1 className="font-display text-2xl font-bold sm:text-3xl">
                {fechaLarga(reunion.fecha)}
              </h1>
            </div>
            <Link href="/" className="text-sm font-medium text-vino hover:underline">
              ← Cambiar fecha
            </Link>
          </div>

          <nav className="mt-5 flex gap-1 overflow-x-auto">
            {tabs.map((t) => {
              const activo = tab === t.id;
              return (
                <Link
                  key={t.id}
                  href={`/programa/${fecha}${t.id === "carreras" ? "" : `?tab=${t.id}`}`}
                  className={`flex shrink-0 items-center gap-2 border-b-2 px-4 py-2.5 text-sm font-semibold transition ${
                    activo
                      ? "border-vino text-vino"
                      : "border-transparent text-muted hover:text-foreground"
                  }`}
                >
                  {t.label}
                  {t.badge !== null && (
                    <span
                      className={`rounded-full px-2 py-0.5 text-xs font-bold ${
                        activo ? "bg-vino text-white" : "bg-surface-2 text-muted"
                      }`}
                    >
                      {t.badge}
                    </span>
                  )}
                </Link>
              );
            })}
          </nav>
        </div>
      </div>

      <div className="mx-auto max-w-6xl px-4 py-8">
        {tab === "carreras" && <TabCarreras reunion={reunion} fecha={fecha} />}
        {tab === "inscritos" && <TabInscritos reunion={reunion} fecha={fecha} />}
        {tab === "compromisos" && <TabCompromisos reunion={reunion} />}
        {tab === "resultados" && <TabResultados reunion={reunion} fecha={fecha} />}
        <div className="mt-10">
          <AdSlot format="banner" />
        </div>
      </div>
    </main>
  );
}

/* ── Tab: Carreras ─────────────────────────────────────────────── */

function TabCarreras({ reunion, fecha }: { reunion: ReunionCompleta; fecha: string }) {
  return (
    <div className="overflow-hidden rounded-xl border border-borde bg-surface shadow-sm">
      <ul className="divide-y divide-borde">
        {reunion.carreras.map((c) => {
          const esClasico = Boolean(c.nombreClasico);
          const tieneResultados = c.inscripciones.some((i) => i.resultado);
          return (
            <li key={c.id} className={esClasico ? "bg-oro-soft/60" : undefined}>
              <Link
                href={`/carrera/${fecha}/${c.nroCarrera}`}
                className="flex items-center gap-4 px-4 py-3.5 transition hover:bg-vino-soft/40"
              >
                <span
                  className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-sm font-bold ${
                    esClasico ? "bg-oro text-white" : "bg-vino text-white"
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
                    {tieneResultados && (
                      <span className="ml-2 rounded bg-green-100 px-1.5 py-0.5 text-xs font-bold text-green-700 dark:bg-green-950/50 dark:text-green-400">
                        ✓
                      </span>
                    )}
                  </p>
                  <p className="mt-0.5 flex flex-wrap gap-x-3 text-xs text-muted">
                    <span className="font-medium text-foreground">
                      {horaCorta(c.hora)}
                    </span>
                    <span>{c.distancia}m</span>
                    <span>{c.inscripciones.length} inscritos</span>
                  </p>
                </div>
                <div className="hidden text-right text-xs sm:block">
                  <p className="font-semibold">{formatoBs(c.premioBs)}</p>
                  <p className="text-muted">{formatoUsd(c.premioUsd)}</p>
                </div>
                <span className="text-muted">›</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

/* ── Tab: Inscritos ────────────────────────────────────────────── */

function TabInscritos({ reunion, fecha }: { reunion: ReunionCompleta; fecha: string }) {
  return (
    <div className="space-y-6">
      {reunion.carreras.map((c) => (
        <section
          key={c.id}
          className="overflow-hidden rounded-xl border border-borde bg-surface shadow-sm"
        >
          <Link
            href={`/carrera/${fecha}/${c.nroCarrera}`}
            className="flex items-center gap-3 border-b border-borde bg-surface-2/60 px-4 py-3 transition hover:bg-vino-soft/40"
          >
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-vino text-sm font-bold text-white">
              {c.nroCarrera}
            </span>
            <div className="min-w-0 flex-1">
              <p className="truncate font-semibold">
                {nombreCortoCarrera(c.condicion, c.nombreClasico)}
              </p>
              <p className="text-xs text-muted">
                {horaCorta(c.hora)} · {c.distancia}m
              </p>
            </div>
            <span className="text-sm font-medium text-vino">Detalle ›</span>
          </Link>
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs uppercase tracking-wide text-muted">
                <th className="py-2 pl-4 pr-2 font-semibold">#</th>
                <th className="px-2 py-2 font-semibold">Ejemplar</th>
                <th className="hidden px-2 py-2 font-semibold md:table-cell">Jinete</th>
                <th className="hidden px-2 py-2 font-semibold lg:table-cell">
                  Entrenador
                </th>
                <th className="py-2 pl-2 pr-4 text-right font-semibold">Kg</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-borde/60">
              {c.inscripciones.map((i) => (
                <tr key={i.id} className={i.retirado ? "opacity-40" : undefined}>
                  <td className="py-2 pl-4 pr-2">
                    <Gualdrapa n={i.nroPuesto} />
                  </td>
                  <td className="px-2 py-2">
                    <span className="font-semibold">
                      {nombreEjemplar(i.ejemplar.nombre)}
                    </span>
                    {i.retirado && (
                      <span className="ml-2 text-xs font-semibold text-red-600">
                        Retirado
                      </span>
                    )}
                    <p className="text-xs text-muted md:hidden">
                      {displayPersona(i.jinete)}
                    </p>
                  </td>
                  <td className="hidden px-2 py-2 md:table-cell">
                    {displayPersona(i.jinete)}
                  </td>
                  <td className="hidden px-2 py-2 text-muted lg:table-cell">
                    {displayPersona(i.entrenador)}
                  </td>
                  <td className="py-2 pl-2 pr-4 text-right font-medium">
                    {i.kilos ? Number(i.kilos) : "—"}
                    {i.descargo ? (
                      <sup className="text-vino"> -{i.descargo}</sup>
                    ) : null}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      ))}
    </div>
  );
}

/* ── Tab: Compromisos ──────────────────────────────────────────── */

function TabCompromisos({ reunion }: { reunion: ReunionCompleta }) {
  const porJinete = new Map<string, Compromiso>();
  const porEntrenador = new Map<string, Compromiso>();

  for (const c of reunion.carreras) {
    for (const i of c.inscripciones) {
      if (i.jinete) {
        const j = porJinete.get(i.jinete.nombre) ?? {
          nombre: displayPersona(i.jinete),
          carreras: [],
        };
        j.carreras.push(c.nroCarrera);
        porJinete.set(i.jinete.nombre, j);
      }
      if (i.entrenador) {
        const e = porEntrenador.get(i.entrenador.nombre) ?? {
          nombre: displayPersona(i.entrenador),
          carreras: [],
        };
        e.carreras.push(c.nroCarrera);
        porEntrenador.set(i.entrenador.nombre, e);
      }
    }
  }

  const jinetes = [...porJinete.values()].sort(
    (a, b) => b.carreras.length - a.carreras.length || a.nombre.localeCompare(b.nombre),
  );
  const entrenadores = [...porEntrenador.values()].sort(
    (a, b) => b.carreras.length - a.carreras.length || a.nombre.localeCompare(b.nombre),
  );

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <ListaCompromisos titulo="Jinetes" items={jinetes} unidad="montas" />
      <ListaCompromisos
        titulo="Entrenadores"
        items={entrenadores}
        unidad="presentados"
      />
    </div>
  );
}

type Compromiso = { nombre: string; carreras: number[] };

function ListaCompromisos({
  titulo: t,
  items,
  unidad,
}: {
  titulo: string;
  items: Compromiso[];
  unidad: string;
}) {
  return (
    <section className="overflow-hidden rounded-xl border border-borde bg-surface shadow-sm">
      <h2 className="border-b border-borde bg-surface-2/60 px-4 py-3 font-display text-lg font-bold">
        {t} <span className="text-sm font-normal text-muted">({items.length})</span>
      </h2>
      <ul className="divide-y divide-borde/60">
        {items.map((p) => (
          <li key={p.nombre} className="flex items-center gap-3 px-4 py-2.5">
            <span className="w-44 shrink-0 truncate text-sm font-semibold sm:w-52">
              {p.nombre}
            </span>
            <span className="shrink-0 rounded-full bg-vino px-2 py-0.5 text-xs font-bold text-white">
              {p.carreras.length}
            </span>
            <span className="sr-only">{unidad}</span>
            <span className="flex flex-wrap gap-1">
              {p.carreras.map((n) => (
                <span
                  key={n}
                  className="rounded bg-surface-2 px-1.5 py-0.5 text-xs font-semibold text-muted"
                >
                  {n}
                </span>
              ))}
            </span>
          </li>
        ))}
      </ul>
    </section>
  );
}

/* ── Tab: Resultados ───────────────────────────────────────────── */

function TabResultados({ reunion, fecha }: { reunion: ReunionCompleta; fecha: string }) {
  return (
    <div className="space-y-4">
      {reunion.carreras.map((c) => {
        const inscrConRes = c.inscripciones
          .filter((i) => i.resultado && i.resultado.posicion > 0)
          .sort((a, b) => a.resultado!.posicion - b.resultado!.posicion);

        const tieneResultados = inscrConRes.length > 0;
        const tiempoGanador = inscrConRes[0]?.resultado?.tiempoGanador;

        return (
          <Link
            key={c.id}
            href={`/carrera/${fecha}/${c.nroCarrera}`}
            className="group block overflow-hidden rounded-xl border border-borde bg-surface shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
          >
            {/* Cabecera */}
            <div className="flex items-center gap-3 border-b border-borde bg-surface-2/60 px-4 py-3">
              <span
                className={`flex h-8 w-8 items-center justify-center rounded-lg text-sm font-bold ${
                  c.nombreClasico ? "bg-oro text-white" : "bg-vino text-white"
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
                <p className="text-xs text-muted">
                  {c.distancia}m
                  {tiempoGanador && (
                    <span className="ml-2 font-semibold text-foreground">
                      T: {tiempoGanador}
                    </span>
                  )}
                </p>
              </div>
              <span className="text-sm font-medium text-vino opacity-0 transition group-hover:opacity-100">
                Detalle ›
              </span>
            </div>

            {/* Podio */}
            {tieneResultados ? (
              <div className="divide-y divide-borde/40">
                {inscrConRes.slice(0, 5).map((i) => {
                  const pos = i.resultado!.posicion;
                  const esGanador = pos === 1;
                  return (
                    <div
                      key={i.id}
                      className={`flex items-center gap-3 px-4 py-2.5 ${
                        esGanador ? "bg-oro-soft/60" : ""
                      }`}
                    >
                      <span
                        className={`flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold ${
                          pos === 1
                            ? "bg-oro text-white"
                            : pos === 2
                              ? "bg-gray-300 text-gray-800 dark:bg-gray-600 dark:text-gray-200"
                              : pos === 3
                                ? "bg-orange-300 text-orange-900 dark:bg-orange-700 dark:text-orange-100"
                                : "bg-surface-2 text-muted"
                        }`}
                      >
                        {pos}°
                      </span>
                      <Gualdrapa n={i.nroPuesto} />
                      <span className={`font-semibold ${esGanador ? "text-base" : "text-sm"}`}>
                        {nombreEjemplar(i.ejemplar.nombre)}
                      </span>
                      <span className="ml-auto text-xs text-muted">
                        {displayPersona(i.jinete)}
                      </span>
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="px-4 py-4 text-center text-sm text-muted">
                Resultados pendientes
              </p>
            )}
          </Link>
        );
      })}
    </div>
  );
}
