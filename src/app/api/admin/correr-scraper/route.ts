// Endpoint API para ejecutar manualmente el Scraper de JockeyPronosticos desde el navegador.
import { NextResponse } from "next/server";
import { isAdmin } from "@/lib/admin-auth";
import { correrScraper } from "@/lib/scrape-jockey";

export async function POST(request: Request) {
  if (!(await isAdmin())) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  try {
    const body = await request.json().catch(() => ({}));
    const fecha = body.fecha || undefined;

    // Ejecutar el scraper (fecha opcional)
    const resumen = await correrScraper({ fecha, notify: false });

    return NextResponse.json({
      ok: true,
      resumen,
    });
  } catch (error) {
    console.error("Error al correr el scraper desde API:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Error interno al ejecutar el scraper" },
      { status: 500 },
    );
  }
}
