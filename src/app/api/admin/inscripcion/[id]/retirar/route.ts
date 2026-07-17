// Endpoint API para retirar o reincorporar un ejemplar de una carrera.
import { NextResponse } from "next/server";
import { isAdmin } from "@/lib/admin-auth";
import { prisma } from "@/lib/db";

type RouteParams = { id: string };

export async function POST(
  request: Request,
  { params }: { params: Promise<RouteParams> },
) {
  if (!(await isAdmin())) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const { id } = await params;
  const inscripcionId = Number(id);

  if (isNaN(inscripcionId)) {
    return NextResponse.json({ error: "ID de inscripción inválido" }, { status: 400 });
  }

  try {
    const { retirado } = await request.json();

    if (typeof retirado !== "boolean") {
      return NextResponse.json({ error: "El campo 'retirado' es requerido y debe ser booleano" }, { status: 400 });
    }

    await prisma.$transaction(async (tx) => {
      // 1. Actualizar el estado de la inscripción
      const inscripcion = await tx.inscripcion.update({
        where: { id: inscripcionId },
        data: { retirado },
        include: { carrera: true },
      });

      // 2. Si se retira, limpiar cualquier resultado o actuación manual previa
      if (retirado) {
        // Eliminar resultado si existía
        await tx.resultado.deleteMany({
          where: { inscripcionId },
        });

        // Eliminar actuación manual de esta carrera si existía
        await tx.actuacion.deleteMany({
          where: {
            carreraId: inscripcion.carreraId,
            ejemplarId: inscripcion.ejemplarId,
            fuente: "manual",
          },
        });
      }
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Error al actualizar retirado:", error);
    return NextResponse.json(
      { error: "Error interno al actualizar estado del ejemplar" },
      { status: 500 },
    );
  }
}
