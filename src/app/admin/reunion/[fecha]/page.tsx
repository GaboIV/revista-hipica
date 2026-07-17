// Admin — Detalle de reunión: carreras con estado de resultados.
import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import {
  fechaLarga,
  horaCorta,
  nombreCortoCarrera,
  formatoBs,
} from "@/lib/format";

import { CarreraAdminCard } from "../../reunion/carrera-admin-card";

export const dynamic = "force-dynamic";

type Params = { fecha: string };

export async function generateMetadata({
  params,
}: {
  params: Promise<Params>;
}) {
  const { fecha } = await params;
  return { title: `Admin — Reunión ${fecha}` };
}

export default async function AdminReunionPage({
  params,
}: {
  params: Promise<Params>;
}) {
  const { fecha } = await params;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(fecha)) notFound();

  const reunion = await prisma.reunion.findFirst({
    where: { fecha: new Date(fecha) },
    include: {
      hipodromo: true,
      carreras: {
        orderBy: { nroCarrera: "asc" },
        include: {
          inscripciones: {
            orderBy: { nroPuesto: "asc" },
            include: {
              ejemplar: { select: { nombre: true } },
              jinete: { select: { nombre: true, nombreCorto: true } },
            },
          },
          _count: { select: { resultados: true } },
        },
      },
    },
  });

  if (!reunion) notFound();

  return (
    <>
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <div>
          <Link
            href="/admin"
            className="text-sm font-medium text-vino hover:underline"
          >
            ← Panel de control
          </Link>
          <p className="mt-2 text-xs font-semibold uppercase tracking-widest text-vino">
            Reunión {reunion.nroReunion} · {reunion.hipodromo.nombre}
          </p>
          <h1 className="font-display text-2xl font-bold">
            {fechaLarga(reunion.fecha)}
          </h1>
        </div>
        <span
          className={`rounded-full px-3 py-1 text-xs font-bold ${
            reunion.estado === "CORRIDA"
              ? "bg-green-100 text-green-800 dark:bg-green-950/50 dark:text-green-400"
              : reunion.estado === "SUSPENDIDA"
                ? "bg-red-100 text-red-700 dark:bg-red-950/50 dark:text-red-400"
                : "bg-surface-2 text-muted"
          }`}
        >
          {reunion.estado}
        </span>
      </div>

      <div className="mt-6 space-y-4">
        {reunion.carreras.map((c) => (
          <CarreraAdminCard key={c.id} carrera={c as any} />
        ))}
      </div>
    </>
  );
}
