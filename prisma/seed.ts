// Seed de Fase 0: carga la Reunión 28 (19-jul-2026) extraída del Excel oficial del INH.
// Fuente: prisma/seed-data/reunion-2026-07-19.json (generado por dataScrapping/extract_xlsx.py)
import "dotenv/config";
import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
const prisma = new PrismaClient({ adapter });

type InscritoJson = {
  nroPuesto: number;
  ejemplar: string;
  precioUsd: number | null;
  medicacion: string | null;
  kilos: number | null;
  descargo: number | null;
  jinete: string | null;
  implementos: string | null;
  entrenador: string | null;
  pp: number | null;
};

type CarreraJson = {
  nroCarrera: number;
  nroLlamado: number | null;
  nroAnual: number | null;
  hora: string | null;
  distancia: number | null;
  condicion: string | null;
  premioBs: number | null;
  premioUsd: number | null;
  inscritos: InscritoJson[];
};

type ReunionJson = {
  nroReunion: number;
  fecha: string;
  carreras: CarreraJson[];
};

function slugify(s: string): string {
  return s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

// "LXVIII PRENSA HÍPICA NACIONAL (GI). SEGUNDO PASO..." → { nombre, grado }
function detectarClasico(condicion: string | null): { nombre: string | null; grado: string | null } {
  if (!condicion) return { nombre: null, grado: null };
  const m = condicion.match(/^(.*?\(G\s?(I{1,3}|IV|V)\))/i);
  if (!m) return { nombre: null, grado: null };
  const nombre = m[1].replace(/\s*\(G\s?\w+\)\s*$/i, "").trim();
  return { nombre, grado: `G${m[2].toUpperCase()}` };
}

async function main() {
  const data: ReunionJson = JSON.parse(
    readFileSync(join(__dirname, "seed-data", "reunion-2026-07-19.json"), "utf-8"),
  );

  const hipodromo = await prisma.hipodromo.upsert({
    where: { nombre: "La Rinconada" },
    update: {},
    create: { nombre: "La Rinconada", ciudad: "Caracas" },
  });

  const reunion = await prisma.reunion.upsert({
    where: { hipodromoId_fecha: { hipodromoId: hipodromo.id, fecha: new Date(data.fecha) } },
    update: { nroReunion: data.nroReunion },
    create: {
      hipodromoId: hipodromo.id,
      fecha: new Date(data.fecha),
      nroReunion: data.nroReunion,
    },
  });

  for (const c of data.carreras) {
    const clasico = detectarClasico(c.condicion);
    const carrera = await prisma.carrera.upsert({
      where: { reunionId_nroCarrera: { reunionId: reunion.id, nroCarrera: c.nroCarrera } },
      update: {},
      create: {
        reunionId: reunion.id,
        nroCarrera: c.nroCarrera,
        nroLlamado: c.nroLlamado,
        nroAnual: c.nroAnual,
        hora: c.hora,
        distancia: c.distancia ?? 0,
        condicion: c.condicion,
        nombreClasico: clasico.nombre,
        grado: clasico.grado,
        premioBs: c.premioBs,
        premioUsd: c.premioUsd,
      },
    });

    for (const i of c.inscritos) {
      const ejemplar = await prisma.ejemplar.upsert({
        where: { nombre: i.ejemplar },
        update: {},
        create: { nombre: i.ejemplar, slug: slugify(i.ejemplar) },
      });

      const jinete = i.jinete
        ? await prisma.jinete.upsert({
            where: { nombre: i.jinete },
            update: {},
            create: { nombre: i.jinete, slug: slugify(i.jinete) },
          })
        : null;

      const entrenador = i.entrenador
        ? await prisma.entrenador.upsert({
            where: { nombre: i.entrenador },
            update: {},
            create: { nombre: i.entrenador, slug: slugify(i.entrenador) },
          })
        : null;

      await prisma.inscripcion.upsert({
        where: { carreraId_nroPuesto: { carreraId: carrera.id, nroPuesto: i.nroPuesto } },
        update: {},
        create: {
          carreraId: carrera.id,
          ejemplarId: ejemplar.id,
          jineteId: jinete?.id,
          entrenadorId: entrenador?.id,
          nroPuesto: i.nroPuesto,
          pp: i.pp,
          kilos: i.kilos,
          descargo: i.descargo,
          medicacion: i.medicacion,
          implementos: i.implementos,
          precioUsd: i.precioUsd,
        },
      });
    }
  }

  const counts = {
    carreras: await prisma.carrera.count(),
    ejemplares: await prisma.ejemplar.count(),
    jinetes: await prisma.jinete.count(),
    entrenadores: await prisma.entrenador.count(),
    inscripciones: await prisma.inscripcion.count(),
  };
  console.log("Seed OK:", counts);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
