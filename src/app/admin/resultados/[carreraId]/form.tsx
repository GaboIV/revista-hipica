"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

interface Inscrito {
  inscripcionId: number;
  nroPuesto: number;
  nombre: string;
  jinete: string;
  posicionActual: number | null;
}

interface Props {
  carreraId: number;
  inscritos: Inscrito[];
  tiempoInicial: string;
  reunionFecha: string;
}

export function ResultadosForm({
  carreraId,
  inscritos,
  tiempoInicial,
  reunionFecha,
}: Props) {
  const router = useRouter();
  const [tiempoGanador, setTiempoGanador] = useState(tiempoInicial);
  const [posiciones, setPosiciones] = useState<Record<number, number>>(() => {
    const initial: Record<number, number> = {};
    for (const i of inscritos) {
      if (i.posicionActual !== null) {
        initial[i.inscripcionId] = i.posicionActual;
      }
    }
    return initial;
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  function setPos(inscripcionId: number, pos: number) {
    setPosiciones((prev) => ({ ...prev, [inscripcionId]: pos }));
    setSuccess(false);
  }

  // Auto-asignar posiciones secuencialmente
  function autoAsignar() {
    const nuevo: Record<number, number> = {};
    inscritos.forEach((i, idx) => {
      nuevo[i.inscripcionId] = idx + 1;
    });
    setPosiciones(nuevo);
    setSuccess(false);
  }

  // Limpiar todo
  function limpiar() {
    setPosiciones({});
    setTiempoGanador("");
    setSuccess(false);
  }

  async function guardar() {
    // Validar que todos tengan posición asignada
    const sinPos = inscritos.filter((i) => posiciones[i.inscripcionId] == null);
    if (sinPos.length > 0) {
      setError(
        `Faltan posiciones para: ${sinPos.map((i) => i.nombre).join(", ")}`,
      );
      return;
    }

    // Validar no duplicados (excepto 0)
    const posValues = Object.values(posiciones).filter((p) => p > 0);
    if (new Set(posValues).size !== posValues.length) {
      setError("Hay posiciones duplicadas. Revisa los valores.");
      return;
    }

    setSaving(true);
    setError("");
    setSuccess(false);

    try {
      const res = await fetch("/api/admin/resultados", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          carreraId,
          tiempoGanador: tiempoGanador || null,
          posiciones: inscritos.map((i) => ({
            inscripcionId: i.inscripcionId,
            posicion: posiciones[i.inscripcionId] ?? 0,
          })),
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        setError(data.error || "Error al guardar");
        return;
      }

      setSuccess(true);
      router.refresh();
    } catch {
      setError("Error de conexión");
    } finally {
      setSaving(false);
    }
  }

  // Determinar qué posiciones ya están usadas
  const usadas = new Set(Object.values(posiciones).filter((p) => p > 0));

  return (
    <div className="space-y-6">
      {/* Tiempo del ganador */}
      <div className="rounded-xl border border-borde bg-surface p-5 shadow-sm">
        <label
          htmlFor="tiempo-ganador"
          className="block text-sm font-semibold"
        >
          Tiempo del ganador
        </label>
        <p className="text-xs text-muted">
          Formato libre, ej: &quot;1:14 3/5&quot; o &quot;82 4/5&quot;
        </p>
        <input
          id="tiempo-ganador"
          type="text"
          value={tiempoGanador}
          onChange={(e) => {
            setTiempoGanador(e.target.value);
            setSuccess(false);
          }}
          placeholder="1:14 3/5"
          className="mt-2 w-full max-w-xs rounded-lg border border-borde bg-background px-3 py-2.5 text-sm outline-none transition focus:border-vino focus:ring-2 focus:ring-vino/20"
        />
      </div>

      {/* Acciones rápidas */}
      <div className="flex flex-wrap gap-3">
        <button
          type="button"
          onClick={autoAsignar}
          className="rounded-lg border border-borde bg-surface px-4 py-2 text-sm font-medium transition hover:bg-surface-2"
        >
          Auto-asignar (por puesto)
        </button>
        <button
          type="button"
          onClick={limpiar}
          className="rounded-lg border border-borde bg-surface px-4 py-2 text-sm font-medium text-red-600 transition hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-950/30"
        >
          Limpiar todo
        </button>
      </div>

      {/* Tabla de inscritos */}
      <div className="overflow-hidden rounded-xl border border-borde bg-surface shadow-sm">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-borde bg-surface-2/60 text-left text-xs uppercase tracking-wide text-muted">
              <th className="py-3 pl-4 pr-2 font-semibold">Gualdrapa</th>
              <th className="px-2 py-3 font-semibold">Ejemplar</th>
              <th className="hidden px-2 py-3 font-semibold md:table-cell">
                Jinete
              </th>
              <th className="py-3 pl-2 pr-4 font-semibold">Posición</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-borde/60">
            {inscritos.map((i) => {
              const pos = posiciones[i.inscripcionId];
              return (
                <tr
                  key={i.inscripcionId}
                  className={
                    pos === 1
                      ? "bg-oro-soft/60"
                      : pos === 2
                        ? "bg-surface-2/40"
                        : pos === 3
                          ? "bg-orange-50/40 dark:bg-orange-950/10"
                          : undefined
                  }
                >
                  <td className="py-3 pl-4 pr-2">
                    <span
                      className="gualdrapa"
                      data-n={i.nroPuesto > 16 ? undefined : i.nroPuesto}
                    >
                      {i.nroPuesto}
                    </span>
                  </td>
                  <td className="px-2 py-3">
                    <p className="font-semibold">{i.nombre}</p>
                    <p className="text-xs text-muted md:hidden">{i.jinete}</p>
                  </td>
                  <td className="hidden px-2 py-3 text-muted md:table-cell">
                    {i.jinete}
                  </td>
                  <td className="py-3 pl-2 pr-4">
                    <select
                      value={pos ?? ""}
                      onChange={(e) => {
                        const v = e.target.value;
                        if (v === "") {
                          setPosiciones((prev) => {
                            const next = { ...prev };
                            delete next[i.inscripcionId];
                            return next;
                          });
                        } else {
                          setPos(i.inscripcionId, Number(v));
                        }
                      }}
                      className={`w-20 rounded-lg border px-2 py-2 text-sm font-semibold outline-none transition focus:ring-2 focus:ring-vino/20 ${
                        pos === 1
                          ? "border-oro bg-oro text-white"
                          : pos === 2
                            ? "border-gray-400 bg-gray-200 text-gray-800 dark:bg-gray-700 dark:text-gray-200"
                            : pos === 3
                              ? "border-orange-400 bg-orange-100 text-orange-800 dark:bg-orange-900/40 dark:text-orange-300"
                              : "border-borde bg-background"
                      }`}
                    >
                      <option value="">—</option>
                      {Array.from({ length: inscritos.length }, (_, idx) => {
                        const n = idx + 1;
                        const ocupada =
                          usadas.has(n) && pos !== n;
                        return (
                          <option key={n} value={n} disabled={ocupada}>
                            {n}°{ocupada ? " (usada)" : ""}
                          </option>
                        );
                      })}
                      <option value={0}>NP</option>
                    </select>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Errores y éxito */}
      {error && (
        <div className="rounded-lg bg-red-50 px-4 py-3 text-sm font-medium text-red-700 dark:bg-red-950/40 dark:text-red-400">
          {error}
        </div>
      )}
      {success && (
        <div className="rounded-lg bg-green-50 px-4 py-3 text-sm font-medium text-green-700 dark:bg-green-950/40 dark:text-green-400">
          ✓ Resultados guardados correctamente. Las estadísticas se han
          actualizado.
        </div>
      )}

      {/* Botón guardar */}
      <div className="flex items-center gap-4">
        <button
          type="button"
          onClick={guardar}
          disabled={saving}
          className="rounded-lg bg-vino px-6 py-3 text-sm font-bold text-white transition hover:bg-vino-deep disabled:opacity-60"
        >
          {saving ? "Guardando…" : "Guardar resultados"}
        </button>
        <a
          href={`/admin/reunion/${reunionFecha}`}
          className="text-sm font-medium text-muted hover:text-foreground"
        >
          Cancelar
        </a>
      </div>
    </div>
  );
}
