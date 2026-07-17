"use client";

import { useState } from "react";
import Link from "next/link";
import { Gualdrapa } from "@/components/gualdrapa";
import {
  nombreCortoCarrera,
  nombreEjemplar,
  displayPersona,
  horaCorta,
  formatoBs,
} from "@/lib/format";

interface InscripcionData {
  id: number;
  nroPuesto: number;
  retirado: boolean;
  ejemplar: {
    nombre: string;
  };
  jinete: {
    nombre: string;
    nombreCorto: string | null;
  } | null;
}

interface CarreraData {
  id: number;
  nroCarrera: number;
  hora: string | null;
  distancia: number;
  condicion: string | null;
  nombreClasico: string | null;
  grado: string | null;
  premioBs: any; // Decimal de Prisma
  inscripciones: InscripcionData[];
  _count: {
    resultados: number;
  };
}

interface Props {
  carrera: CarreraData;
}

export function CarreraAdminCard({ carrera }: Props) {
  const [expandido, setExpandido] = useState(false);
  const [inscripciones, setInscripciones] = useState<InscripcionData[]>(carrera.inscripciones);
  const [loadingMap, setLoadingMap] = useState<Record<number, boolean>>({});

  const tieneResultados = carrera._count.resultados > 0;

  async function handleToggleRetiro(inscripcionId: number, actualmenteRetirado: boolean) {
    setLoadingMap((prev) => ({ ...prev, [inscripcionId]: true }));

    try {
      const res = await fetch(`/api/admin/inscripcion/${inscripcionId}/retirar`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ retirado: !actualmenteRetirado }),
      });

      if (res.ok) {
        setInscripciones((prev) =>
          prev.map((i) =>
            i.id === inscripcionId ? { ...i, retirado: !actualmenteRetirado } : i,
          ),
        );
      } else {
        const data = await res.json();
        alert(data.error || "Error al actualizar estado");
      }
    } catch {
      alert("Error de conexión");
    } finally {
      setLoadingMap((prev) => ({ ...prev, [inscripcionId]: false }));
    }
  }

  const retiradosCount = inscripciones.filter((i) => i.retirado).length;

  return (
    <div className="overflow-hidden rounded-xl border border-borde bg-surface shadow-sm">
      {/* Cabecera de la Carrera */}
      <div className="flex flex-wrap items-center gap-4 px-5 py-4">
        <button
          type="button"
          onClick={() => setExpandido(!expandido)}
          className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg text-sm font-bold transition hover:opacity-90 ${
            expandido ? "bg-vino-soft text-vino border border-vino/30" : "bg-vino text-white"
          }`}
        >
          {carrera.nroCarrera}
        </button>

        <div className="min-w-0 flex-1 cursor-pointer" onClick={() => setExpandido(!expandido)}>
          <p className="truncate font-semibold flex items-center gap-2">
            {nombreCortoCarrera(carrera.condicion, carrera.nombreClasico)}
            {carrera.grado && (
              <span className="rounded bg-oro px-1.5 py-0.5 text-[10px] font-bold text-white uppercase">
                {carrera.grado}
              </span>
            )}
          </p>
          <p className="mt-0.5 flex flex-wrap gap-x-3 text-xs text-muted">
            <span>{horaCorta(carrera.hora)}</span>
            <span>{carrera.distancia}m</span>
            <span>
              {inscripciones.length} inscritos
              {retiradosCount > 0 && (
                <span className="ml-1 text-red-600 font-medium">({retiradosCount} ret)</span>
              )}
            </span>
            <span>{formatoBs(carrera.premioBs)}</span>
          </p>
        </div>

        <div className="flex items-center gap-3">
          {tieneResultados ? (
            <span className="rounded-full bg-green-100 px-3 py-1 text-xs font-bold text-green-800 dark:bg-green-950/50 dark:text-green-400">
              ✓ Resultados cargados
            </span>
          ) : (
            <span className="rounded-full bg-surface-2 px-3 py-1 text-xs font-semibold text-muted">
              Pendiente resultados
            </span>
          )}

          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setExpandido(!expandido)}
              className="rounded-lg border border-borde bg-background px-3 py-2 text-xs font-medium transition hover:bg-surface-2"
            >
              {expandido ? "Ocultar Caballos ▲" : "Ver Caballos ▼"}
            </button>
            <Link
              href={`/admin/resultados/${carrera.id}`}
              className="rounded-lg bg-vino px-4 py-2 text-xs font-bold text-white transition hover:bg-vino-deep"
            >
              {tieneResultados ? "Editar Resultados" : "Cargar Resultados"}
            </Link>
          </div>
        </div>
      </div>

      {/* Listado de Caballos e Interruptores de Retiro */}
      {expandido && (
        <div className="border-t border-borde bg-background/40">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-borde bg-surface-2/40 text-muted uppercase tracking-wide">
                  <th className="py-2.5 pl-5 pr-2 font-semibold">Gualdrapa</th>
                  <th className="px-2 py-2.5 font-semibold">Ejemplar</th>
                  <th className="px-2 py-2.5 font-semibold">Jinete</th>
                  <th className="py-2.5 pl-2 pr-5 text-right font-semibold">Estado</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-borde/60 bg-surface">
                {inscripciones.map((i) => {
                  const loading = loadingMap[i.id];
                  return (
                    <tr
                      key={i.id}
                      className={`transition ${
                        i.retirado ? "bg-red-50/20 text-muted opacity-50 line-through" : ""
                      }`}
                    >
                      <td className="py-3 pl-5 pr-2">
                        <Gualdrapa n={i.nroPuesto} className="h-7 w-7 text-xs" />
                      </td>
                      <td className="px-2 py-3">
                        <span className="font-semibold text-sm">
                          {nombreEjemplar(i.ejemplar.nombre)}
                        </span>
                      </td>
                      <td className="px-2 py-3 text-muted-foreground">
                        {displayPersona(i.jinete)}
                      </td>
                      <td className="py-3 pl-2 pr-5 text-right">
                        <button
                          type="button"
                          disabled={loading}
                          onClick={() => handleToggleRetiro(i.id, i.retirado)}
                          className={`rounded-lg px-3 py-1.5 text-[11px] font-bold transition ${
                            i.retirado
                              ? "bg-red-100 text-red-700 hover:bg-red-200 dark:bg-red-950/40 dark:text-red-400"
                              : "bg-surface-2 text-foreground hover:bg-red-50 hover:text-red-600 hover:border-red-200 border border-transparent"
                          } disabled:opacity-50`}
                        >
                          {loading ? "Actualizando..." : i.retirado ? "Retirado ❌" : "Activo ✓"}
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
