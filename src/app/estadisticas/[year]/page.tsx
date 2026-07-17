// Estadísticas anuales de jinetes, entrenadores y ejemplares.
// Calculadas en tiempo real desde Resultado + Inscripcion.
import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { prisma } from "@/lib/db";
import { displayPersona, nombreEjemplar } from "@/lib/format";

export const dynamic = "force-dynamic";

type Params = { year: string };

export async function generateMetadata({
  params,
}: {
  params: Promise<Params>;
}): Promise<Metadata> {
  const { year } = await params;
  return { title: `Estadísticas ${year}` };
}

interface EstadisticaRow {
  id: number;
  nombre: string;
  nombreCorto?: string | null;
  slug?: string;
  victorias: number;
  segundos: number;
  terceros: number;
  montas: number;
  efectividad: number;
}

export default async function EstadisticasAnualesPage({
  params,
}: {
  params: Promise<Params>;
}) {
  const { year: yearStr } = await params;
  const year = Number(yearStr);
  if (isNaN(year) || year < 2020 || year > 2030) notFound();

  const inicioAno = new Date(`${year}-01-01`);
  const finAno = new Date(`${year + 1}-01-01`);

  // Obtener todos los resultados del año con relaciones necesarias
  const resultados = await prisma.resultado.findMany({
    where: {
      carrera: {
        reunion: {
          fecha: { gte: inicioAno, lt: finAno },
        },
      },
    },
    include: {
      inscripcion: {
        include: {
          jinete: true,
          entrenador: true,
          ejemplar: true,
        },
      },
    },
  });

  // También obtener todas las inscripciones del año (para montas totales)
  const inscripciones = await prisma.inscripcion.findMany({
    where: {
      retirado: false,
      carrera: {
        reunion: {
          fecha: { gte: inicioAno, lt: finAno },
        },
        resultados: { some: {} }, // solo carreras que ya se corrieron
      },
    },
    include: {
      jinete: true,
      entrenador: true,
      ejemplar: true,
    },
  });

  // Calcular estadísticas de jinetes
  const jineteMap = new Map<number, EstadisticaRow>();
  for (const insc of inscripciones) {
    if (!insc.jinete) continue;
    if (!jineteMap.has(insc.jinete.id)) {
      jineteMap.set(insc.jinete.id, {
        id: insc.jinete.id,
        nombre: insc.jinete.nombre,
        nombreCorto: insc.jinete.nombreCorto,
        slug: insc.jinete.slug,
        victorias: 0,
        segundos: 0,
        terceros: 0,
        montas: 0,
        efectividad: 0,
      });
    }
    jineteMap.get(insc.jinete.id)!.montas++;
  }

  for (const res of resultados) {
    if (!res.inscripcion.jinete) continue;
    const j = jineteMap.get(res.inscripcion.jinete.id);
    if (!j) continue;
    if (res.posicion === 1) j.victorias++;
    else if (res.posicion === 2) j.segundos++;
    else if (res.posicion === 3) j.terceros++;
  }

  // Calcular estadísticas de entrenadores
  const entrenadorMap = new Map<number, EstadisticaRow>();
  for (const insc of inscripciones) {
    if (!insc.entrenador) continue;
    if (!entrenadorMap.has(insc.entrenador.id)) {
      entrenadorMap.set(insc.entrenador.id, {
        id: insc.entrenador.id,
        nombre: insc.entrenador.nombre,
        nombreCorto: insc.entrenador.nombreCorto,
        slug: insc.entrenador.slug,
        victorias: 0,
        segundos: 0,
        terceros: 0,
        montas: 0,
        efectividad: 0,
      });
    }
    entrenadorMap.get(insc.entrenador.id)!.montas++;
  }

  for (const res of resultados) {
    if (!res.inscripcion.entrenador) continue;
    const e = entrenadorMap.get(res.inscripcion.entrenador.id);
    if (!e) continue;
    if (res.posicion === 1) e.victorias++;
    else if (res.posicion === 2) e.segundos++;
    else if (res.posicion === 3) e.terceros++;
  }

  // Calcular estadísticas de ejemplares
  const ejemplarMap = new Map<number, EstadisticaRow>();
  for (const insc of inscripciones) {
    if (!ejemplarMap.has(insc.ejemplar.id)) {
      ejemplarMap.set(insc.ejemplar.id, {
        id: insc.ejemplar.id,
        nombre: insc.ejemplar.nombre,
        slug: insc.ejemplar.slug,
        victorias: 0,
        segundos: 0,
        terceros: 0,
        montas: 0,
        efectividad: 0,
      });
    }
    ejemplarMap.get(insc.ejemplar.id)!.montas++;
  }

  for (const res of resultados) {
    const ej = ejemplarMap.get(res.inscripcion.ejemplar.id);
    if (!ej) continue;
    if (res.posicion === 1) ej.victorias++;
    else if (res.posicion === 2) ej.segundos++;
    else if (res.posicion === 3) ej.terceros++;
  }

  // Calcular efectividad y ordenar
  function finalizar(map: Map<number, EstadisticaRow>): EstadisticaRow[] {
    const arr = [...map.values()];
    for (const r of arr) {
      r.efectividad = r.montas > 0 ? (r.victorias / r.montas) * 100 : 0;
    }
    return arr.sort((a, b) => b.victorias - a.victorias || b.efectividad - a.efectividad);
  }

  const jinetes = finalizar(jineteMap);
  const entrenadores = finalizar(entrenadorMap);
  const ejemplares = finalizar(ejemplarMap);

  // Años disponibles (para selector)
  const anosDisponibles = await prisma.reunion.findMany({
    where: { carreras: { some: { resultados: { some: {} } } } },
    select: { fecha: true },
    distinct: ["fecha"],
  });

  const anos = [
    ...new Set(anosDisponibles.map((r) => r.fecha.getUTCFullYear())),
  ].sort((a, b) => b - a);

  // Si no hay el año actual, agregar para que se pueda navegar
  if (!anos.includes(year)) anos.unshift(year);

  return (
    <main>
      {/* Header */}
      <div className="border-b border-borde bg-surface">
        <div className="mx-auto max-w-6xl px-4 pt-6">
          <h1 className="font-display text-2xl font-bold sm:text-3xl">
            Estadísticas {year}
          </h1>
          <p className="mt-1 text-sm text-muted">
            Rendimiento de jinetes, entrenadores y ejemplares basado en
            resultados cargados.
          </p>

          {/* Selector de año */}
          <nav className="mt-5 flex gap-1 overflow-x-auto pb-px">
            {anos.map((a) => (
              <Link
                key={a}
                href={`/estadisticas/${a}`}
                className={`shrink-0 border-b-2 px-4 py-2.5 text-sm font-semibold transition ${
                  a === year
                    ? "border-vino text-vino"
                    : "border-transparent text-muted hover:text-foreground"
                }`}
              >
                {a}
              </Link>
            ))}
          </nav>
        </div>
      </div>

      <div className="mx-auto max-w-6xl px-4 py-8">
        {jinetes.length === 0 && entrenadores.length === 0 && ejemplares.length === 0 ? (
          <p className="rounded-lg border border-dashed border-borde bg-surface-2/50 px-4 py-6 text-center text-muted">
            No hay resultados cargados para {year}. Las estadísticas se
            calcularán automáticamente cuando se carguen resultados desde el
            panel admin.
          </p>
        ) : (
          <div className="space-y-10">
            {/* Jinetes */}
            <TablaEstadisticas
              titulo="🏇 Jinetes"
              datos={jinetes}
              columnaMontas="Montas"
              formatNombre={(r) => displayPersona({ nombre: r.nombre, nombreCorto: r.nombreCorto })}
            />

            {/* Entrenadores */}
            <TablaEstadisticas
              titulo="👔 Entrenadores"
              datos={entrenadores}
              columnaMontas="Presentados"
              formatNombre={(r) => displayPersona({ nombre: r.nombre, nombreCorto: r.nombreCorto })}
            />

            {/* Ejemplares */}
            <TablaEstadisticas
              titulo="🐎 Ejemplares"
              datos={ejemplares}
              columnaMontas="Carreras"
              formatNombre={(r) => nombreEjemplar(r.nombre)}
            />
          </div>
        )}
      </div>
    </main>
  );
}

function TablaEstadisticas({
  titulo,
  datos,
  columnaMontas,
  formatNombre,
}: {
  titulo: string;
  datos: EstadisticaRow[];
  columnaMontas: string;
  formatNombre: (r: EstadisticaRow) => string;
}) {
  if (datos.length === 0) return null;

  return (
    <section className="overflow-hidden rounded-xl border border-borde bg-surface shadow-sm">
      <h2 className="border-b border-borde bg-surface-2/60 px-5 py-3 font-display text-lg font-bold">
        {titulo}{" "}
        <span className="text-sm font-normal text-muted">
          ({datos.length})
        </span>
      </h2>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[600px] text-sm">
          <thead>
            <tr className="border-b border-borde text-left text-xs uppercase tracking-wide text-muted">
              <th className="py-3 pl-5 pr-2 font-semibold">#</th>
              <th className="px-2 py-3 font-semibold">Nombre</th>
              <th className="px-2 py-3 text-center font-semibold">1°</th>
              <th className="px-2 py-3 text-center font-semibold">2°</th>
              <th className="px-2 py-3 text-center font-semibold">3°</th>
              <th className="px-2 py-3 text-center font-semibold">
                {columnaMontas}
              </th>
              <th className="py-3 pl-2 pr-5 text-right font-semibold">
                % Efect.
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-borde/60">
            {datos.map((r, idx) => (
              <tr
                key={r.id}
                className={idx < 3 ? "bg-oro-soft/30" : undefined}
              >
                <td className="py-2.5 pl-5 pr-2 font-bold text-muted">
                  {idx + 1}
                </td>
                <td className="px-2 py-2.5 font-semibold">
                  {formatNombre(r)}
                </td>
                <td className="px-2 py-2.5 text-center">
                  <span
                    className={`inline-flex h-7 min-w-7 items-center justify-center rounded-full px-1 text-xs font-bold ${
                      r.victorias > 0
                        ? "bg-oro text-white"
                        : "text-muted"
                    }`}
                  >
                    {r.victorias}
                  </span>
                </td>
                <td className="px-2 py-2.5 text-center">
                  <span
                    className={`inline-flex h-7 min-w-7 items-center justify-center rounded-full px-1 text-xs font-bold ${
                      r.segundos > 0
                        ? "bg-gray-300 text-gray-800 dark:bg-gray-600 dark:text-gray-200"
                        : "text-muted"
                    }`}
                  >
                    {r.segundos}
                  </span>
                </td>
                <td className="px-2 py-2.5 text-center">
                  <span
                    className={`inline-flex h-7 min-w-7 items-center justify-center rounded-full px-1 text-xs font-bold ${
                      r.terceros > 0
                        ? "bg-orange-200 text-orange-900 dark:bg-orange-800 dark:text-orange-100"
                        : "text-muted"
                    }`}
                  >
                    {r.terceros}
                  </span>
                </td>
                <td className="px-2 py-2.5 text-center font-medium">
                  {r.montas}
                </td>
                <td className="py-2.5 pl-2 pr-5 text-right">
                  <span className="font-semibold">
                    {r.efectividad.toFixed(1)}%
                  </span>
                  {/* Mini barra de efectividad */}
                  <div className="mt-1 h-1 w-full overflow-hidden rounded-full bg-surface-2">
                    <div
                      className="h-full rounded-full bg-vino"
                      style={{
                        width: `${Math.min(r.efectividad, 100)}%`,
                      }}
                    />
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
