// Admin — Carga de resultados: página server que carga la data y
// renderiza el formulario client.
import { notFound, redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import {
  nombreCortoCarrera,
  nombreEjemplar,
  displayPersona,
  fechaISO,
} from "@/lib/format";
import { ResultadosForm } from "./form";

export const dynamic = "force-dynamic";

type Params = { carreraId: string };

export async function generateMetadata({
  params,
}: {
  params: Promise<Params>;
}) {
  const { carreraId } = await params;
  return { title: `Admin — Resultados carrera ${carreraId}` };
}

export default async function CargarResultadosPage({
  params,
}: {
  params: Promise<Params>;
}) {
  const { carreraId } = await params;
  const id = Number(carreraId);
  if (isNaN(id)) notFound();

  const carrera = await prisma.carrera.findUnique({
    where: { id },
    include: {
      reunion: { include: { hipodromo: true } },
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
  });

  if (!carrera) notFound();

  // Preparar datos para el client component
  const inscritos = carrera.inscripciones
    .filter((i) => !i.retirado)
    .map((i) => ({
      inscripcionId: i.id,
      nroPuesto: i.nroPuesto,
      nombre: nombreEjemplar(i.ejemplar.nombre),
      jinete: displayPersona(i.jinete),
      posicionActual: i.resultado?.posicion ?? null,
    }));

  // Tiempo del ganador actual (si ya hay resultados)
  const tiempoActual =
    carrera.inscripciones.find((i) => i.resultado?.posicion === 1)?.resultado
      ?.tiempoGanador ?? "";

  const fecha = fechaISO(carrera.reunion.fecha);

  return (
    <>
      <div className="mb-6">
        <a
          href={`/admin/reunion/${fecha}`}
          className="text-sm font-medium text-vino hover:underline"
        >
          ← Volver a la reunión
        </a>
        <p className="mt-2 text-xs font-semibold uppercase tracking-widest text-vino">
          {carrera.reunion.hipodromo.nombre} · Carrera {carrera.nroCarrera}
        </p>
        <h1 className="font-display text-2xl font-bold">
          {nombreCortoCarrera(carrera.condicion, carrera.nombreClasico)}
          {carrera.grado && (
            <span className="ml-2 align-middle rounded bg-oro px-2 py-0.5 text-sm font-bold text-white">
              {carrera.grado}
            </span>
          )}
        </h1>
        <p className="mt-1 text-sm text-muted">
          {carrera.distancia}m · {carrera.inscripciones.length} inscritos (
          {carrera.inscripciones.filter((i) => i.retirado).length} retirados)
        </p>
      </div>

      <ResultadosForm
        carreraId={id}
        inscritos={inscritos}
        tiempoInicial={tiempoActual}
        reunionFecha={fecha}
      />
    </>
  );
}
