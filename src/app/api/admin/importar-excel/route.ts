// Endpoint API para importar el Excel de programación del INH desde el navegador.
import { NextResponse } from "next/server";
import { isAdmin } from "@/lib/admin-auth";
import { importarReunionDesdeExcel } from "@/lib/import-inh";

export async function POST(request: Request) {
  if (!(await isAdmin())) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  try {
    const formData = await request.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json(
        { error: "No se proporcionó ningún archivo Excel" },
        { status: 400 },
      );
    }

    // Convertir el archivo a Buffer
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Ejecutar la importación
    const res = await importarReunionDesdeExcel(buffer);

    return NextResponse.json({
      ok: true,
      nroReunion: res.nroReunion,
      fecha: res.fecha,
      carrerasCount: res.carrerasCount,
      inscritosCount: res.inscritosCount,
    });
  } catch (error) {
    console.error("Error al importar Excel desde API:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Error interno al importar Excel" },
      { status: 500 },
    );
  }
}
