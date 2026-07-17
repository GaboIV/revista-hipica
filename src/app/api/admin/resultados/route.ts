// API: guardar resultados de una carrera + generar actuaciones.
import { NextResponse } from "next/server";
import { isAdmin } from "@/lib/admin-auth";
import { prisma } from "@/lib/db";

interface PosicionPayload {
  inscripcionId: number;
  posicion: number; // 1..N, 0 = NP
}

interface ResultadoPayload {
  carreraId: number;
  tiempoGanador: string | null;
  posiciones: PosicionPayload[];
}

export async function POST(request: Request) {
  if (!(await isAdmin())) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const body = (await request.json()) as ResultadoPayload;
  const { carreraId, tiempoGanador, posiciones } = body;

  if (!carreraId || !posiciones?.length) {
    return NextResponse.json(
      { error: "Datos incompletos: carreraId y posiciones requeridos" },
      { status: 400 },
    );
  }

  // Validar que no haya posiciones duplicadas (excepto 0 = NP)
  const posNoNP = posiciones.filter((p) => p.posicion > 0);
  const posSet = new Set(posNoNP.map((p) => p.posicion));
  if (posSet.size !== posNoNP.length) {
    return NextResponse.json(
      { error: "Posiciones duplicadas detectadas" },
      { status: 400 },
    );
  }

  try {
    // Cargar carrera con inscripciones y reunión
    const carrera = await prisma.carrera.findUnique({
      where: { id: carreraId },
      include: {
        reunion: { include: { hipodromo: true, carreras: { select: { id: true, _count: { select: { resultados: true } } } } } },
        inscripciones: {
          include: { ejemplar: true, jinete: true },
        },
      },
    });

    if (!carrera) {
      return NextResponse.json(
        { error: "Carrera no encontrada" },
        { status: 404 },
      );
    }

    // Mapear inscripciones por ID para acceso rápido
    const inscMap = new Map(carrera.inscripciones.map((i) => [i.id, i]));

    // Validar que todas las inscripciones existen
    for (const p of posiciones) {
      if (!inscMap.has(p.inscripcionId)) {
        return NextResponse.json(
          { error: `Inscripción ${p.inscripcionId} no pertenece a esta carrera` },
          { status: 400 },
        );
      }
    }

    // Determinar ganador, segundo, tercero por nombre
    const sorted = [...posiciones].filter(p => p.posicion > 0).sort((a, b) => a.posicion - b.posicion);
    const nombreGanador = sorted[0]
      ? inscMap.get(sorted[0].inscripcionId)?.ejemplar.nombre ?? null
      : null;
    const nombreSegundo = sorted[1]
      ? inscMap.get(sorted[1].inscripcionId)?.ejemplar.nombre ?? null
      : null;
    const nombreTercero = sorted[2]
      ? inscMap.get(sorted[2].inscripcionId)?.ejemplar.nombre ?? null
      : null;

    const totalInscritos = carrera.inscripciones.filter((i) => !i.retirado).length;

    await prisma.$transaction(async (tx) => {
      // 1. Borrar resultados previos de esta carrera (para poder editar)
      await tx.resultado.deleteMany({ where: { carreraId } });

      // 2. Borrar actuaciones manuales previas de esta carrera
      await tx.actuacion.deleteMany({
        where: { carreraId, fuente: "manual" },
      });

      // 3. Crear resultados
      await tx.resultado.createMany({
        data: posiciones.map((p) => ({
          carreraId,
          inscripcionId: p.inscripcionId,
          posicion: p.posicion,
          tiempoGanador: tiempoGanador || null,
        })),
      });

      // 4. Crear actuaciones para cada inscrito con resultado
      for (const p of posiciones) {
        if (p.posicion === 0) continue; // NP no genera actuación
        const insc = inscMap.get(p.inscripcionId)!;

        await tx.actuacion.create({
          data: {
            ejemplarId: insc.ejemplarId,
            jineteId: insc.jineteId,
            carreraId,
            fecha: carrera.reunion.fecha,
            hipodromo: carrera.reunion.hipodromo.nombre,
            distancia: carrera.distancia,
            tiempo: p.posicion === 1 ? (tiempoGanador || null) : null,
            posFinal: p.posicion,
            nroInscritos: totalInscritos,
            kilos: insc.kilos,
            lote: carrera.condicion,
            pp: insc.pp,
            ganador: nombreGanador,
            segundo: nombreSegundo,
            tercero: nombreTercero,
            fuente: "manual",
          },
        });
      }

      // 5. Verificar si todas las carreras de la reunión tienen resultados
      //    y marcar la reunión como CORRIDA
      const carrerasReunion = carrera.reunion.carreras;
      const otrasConResultados = carrerasReunion.filter(
        (c) => c.id === carreraId || c._count.resultados > 0,
      ).length;

      if (otrasConResultados === carrerasReunion.length) {
        await tx.reunion.update({
          where: { id: carrera.reunionId },
          data: { estado: "CORRIDA" },
        });
      }
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Error guardando resultados:", error);
    return NextResponse.json(
      { error: "Error interno al guardar resultados" },
      { status: 500 },
    );
  }
}
