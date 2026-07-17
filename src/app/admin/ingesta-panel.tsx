"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function IngestaPanel() {
  const router = useRouter();

  // Estados de Excel
  const [excelFile, setExcelFile] = useState<File | null>(null);
  const [excelLoading, setExcelLoading] = useState(false);
  const [excelError, setExcelError] = useState("");
  const [excelResult, setExcelResult] = useState<{
    nroReunion: number | null;
    fecha: string;
    carrerasCount: number;
    inscritosCount: number;
  } | null>(null);

  // Estados de Scraper
  const [scraperLoading, setScraperLoading] = useState(false);
  const [scraperError, setScraperError] = useState("");
  const [scraperFecha, setScraperFecha] = useState("");
  const [scraperResult, setScraperResult] = useState<{
    reuniones: number;
    carreras: number;
    inscripciones: number;
    actuaciones: number;
    retirosMarcados: number;
  } | null>(null);

  async function handleExcelSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!excelFile) return;

    setExcelLoading(true);
    setExcelError("");
    setExcelResult(null);

    const formData = new FormData();
    formData.append("file", excelFile);

    try {
      const res = await fetch("/api/admin/importar-excel", {
        method: "POST",
        body: formData,
      });

      const data = await res.json();
      if (!res.ok) {
        setExcelError(data.error || "Fallo al importar el archivo");
      } else {
        setExcelResult(data);
        setExcelFile(null);
        // Reset del input file
        const fileInput = document.getElementById("excel-file-input") as HTMLInputElement;
        if (fileInput) fileInput.value = "";
        router.refresh();
      }
    } catch {
      setExcelError("Error de conexión al subir el archivo");
    } finally {
      setExcelLoading(false);
    }
  }

  async function handleScraperRun() {
    setScraperLoading(true);
    setScraperError("");
    setScraperResult(null);

    try {
      const res = await fetch("/api/admin/correr-scraper", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fecha: scraperFecha || null }),
      });

      const data = await res.json();
      if (!res.ok) {
        setScraperError(data.error || "Fallo en la ejecución del scraper");
      } else {
        setScraperResult(data.resumen);
        router.refresh();
      }
    } catch {
      setScraperError("Error de conexión al ejecutar el scraper");
    } finally {
      setScraperLoading(false);
    }
  }

  return (
    <div className="grid gap-6 md:grid-cols-2">
      {/* Bloque Excel */}
      <div className="rounded-xl border border-borde bg-surface p-6 shadow-sm">
        <h2 className="font-display text-lg font-bold text-vino">
          📊 Importar Programación Oficial (Excel INH)
        </h2>
        <p className="mt-1 text-xs text-muted">
          Sube el archivo Excel de programación semanal generado por el INH.
        </p>

        <form onSubmit={handleExcelSubmit} className="mt-4 space-y-4">
          <div className="relative flex min-h-[100px] flex-col items-center justify-center rounded-lg border border-dashed border-borde bg-background p-4 text-center hover:bg-surface-2/30 transition">
            <input
              id="excel-file-input"
              type="file"
              accept=".xlsx,.xls"
              onChange={(e) => {
                setExcelFile(e.target.files?.[0] || null);
                setExcelError("");
                setExcelResult(null);
              }}
              className="absolute inset-0 cursor-pointer opacity-0"
              required
            />
            <p className="text-2xl">📥</p>
            <p className="mt-1 text-xs font-semibold text-vino">
              {excelFile ? excelFile.name : "Selecciona o arrastra el archivo Excel"}
            </p>
            <p className="text-[10px] text-muted">Formatos: .xlsx, .xls</p>
          </div>

          {excelError && (
            <p className="rounded-lg bg-red-50 p-2.5 text-xs font-semibold text-red-700 dark:bg-red-950/40 dark:text-red-400">
              ⚠️ {excelError}
            </p>
          )}

          {excelResult && (
            <div className="rounded-lg bg-green-50 p-3 text-xs text-green-800 dark:bg-green-950/30 dark:text-green-400">
              <p className="font-bold">✓ ¡Importación completada!</p>
              <ul className="mt-1 list-inside list-disc space-y-0.5">
                <li>Fecha de reunión: {excelResult.fecha}</li>
                <li>Nro. de reunión: {excelResult.nroReunion || "N/A"}</li>
                <li>Carreras creadas/actualizadas: {excelResult.carrerasCount}</li>
                <li>Inscripciones cargadas: {excelResult.inscritosCount}</li>
              </ul>
            </div>
          )}

          <button
            type="submit"
            disabled={excelLoading || !excelFile}
            className="w-full rounded-lg bg-vino px-4 py-2.5 text-xs font-bold text-white transition hover:bg-vino-deep disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {excelLoading ? "Procesando Excel..." : "Procesar Archivo"}
          </button>
        </form>
      </div>

      {/* Bloque Scraper */}
      <div className="rounded-xl border border-borde bg-surface p-6 shadow-sm">
        <h2 className="font-display text-lg font-bold text-vino">
          🔄 Sincronizar Histórico y Web (Scraper)
        </h2>
        <p className="mt-1 text-xs text-muted">
          Scrapea JockeyPronosticos para traer pedigrí, studs, retirados y retrospectos históricos.
        </p>

        <div className="mt-4 space-y-4">
          <div>
            <label htmlFor="scraper-fecha" className="block text-xs font-semibold text-muted">
              Fecha específica (opcional, ej: 2026-07-19)
            </label>
            <input
              id="scraper-fecha"
              type="text"
              placeholder="Dejar vacío para buscar automáticamente"
              value={scraperFecha}
              onChange={(e) => {
                setScraperFecha(e.target.value);
                setScraperError("");
                setScraperResult(null);
              }}
              className="mt-1.5 w-full rounded-lg border border-borde bg-background px-3 py-2 text-xs outline-none focus:border-vino focus:ring-1 focus:ring-vino/20"
            />
          </div>

          {scraperError && (
            <p className="rounded-lg bg-red-50 p-2.5 text-xs font-semibold text-red-700 dark:bg-red-950/40 dark:text-red-400">
              ⚠️ {scraperError}
            </p>
          )}

          {scraperResult && (
            <div className="rounded-lg bg-green-50 p-3 text-xs text-green-800 dark:bg-green-950/30 dark:text-green-400">
              <p className="font-bold">✓ ¡Sincronización completada!</p>
              <ul className="mt-1 list-inside list-disc space-y-0.5">
                <li>Reuniones procesadas: {scraperResult.reuniones}</li>
                <li>Carreras procesadas: {scraperResult.carreras}</li>
                <li>Inscripciones validadas: {scraperResult.inscripciones}</li>
                <li>Actuaciones añadidas: {scraperResult.actuaciones}</li>
                <li>Retiros marcados por web: {scraperResult.retirosMarcados}</li>
              </ul>
            </div>
          )}

          <button
            type="button"
            onClick={handleScraperRun}
            disabled={scraperLoading}
            className="w-full rounded-lg bg-vino px-4 py-2.5 text-xs font-bold text-white transition hover:bg-vino-deep disabled:opacity-50"
          >
            {scraperLoading ? "Ejecutando Scraper (esto toma unos segundos)..." : "Sincronizar con JockeyPronosticos"}
          </button>
        </div>
      </div>
    </div>
  );
}
