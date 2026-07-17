// Importador del Excel oficial del INH (repProgramacionNN.xlsx) → base de datos.
//
// Uso: npx tsx scripts/import-inh-xlsx.ts dataScrapping/repProgramacion28.xlsx
//
// El Excel es la fuente OFICIAL: sus datos pisan los del scraper en los campos
// que trae (jinete, entrenador, kilos, medicación, implementos, precio, PP).
import { readFileSync } from "node:fs";
import * as XLSX from "xlsx";
import { prisma } from "./lib/db";
import { slugify } from "./lib/util";

type Fila = string[];

type InscritoINH = {
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

type CarreraINH = {
  nroCarrera: number;
  nroLlamado: number | null;
  nroAnual: number | null;
  hora: string | null;
  distancia: number | null;
  condicion: string | null;
  premioBs: number | null;
  premioUsd: number | null;
  inscritos: InscritoINH[];
};

function parsearExcel(ruta: string): {
  nroReunion: number | null;
  fecha: string | null;
  carreras: CarreraINH[];
} {
  const wb = XLSX.read(readFileSync(ruta), { type: "buffer" });
  const ws = wb.Sheets[wb.SheetNames[0]];
  const filas: Fila[] = (
    XLSX.utils.sheet_to_json(ws, { header: 1, raw: false, defval: "" }) as unknown[][]
  ).map((r) => r.map((c) => String(c ?? "").trim()));

  const numero = (s: string): number | null => {
    const t = s.replace(/\./g, "").replace(/,/g, ".");
    const n = Number(t);
    return Number.isFinite(n) && t !== "" ? n : null;
  };

  let nroReunion: number | null = null;
  let fecha: string | null = null;
  const carreras: CarreraINH[] = [];
  let cur: CarreraINH | null = null;

  for (let i = 0; i < filas.length; i++) {
    const r = filas[i];
    const c0 = r[0] ?? "";

    if (c0.startsWith("Reunión")) {
      const m = new Map<string, string>();
      for (const celda of r) {
        const [k, ...resto] = celda.split(":");
        if (resto.length) m.set(k.trim(), resto.join(":").replace(/\n/g, " ").trim());
      }
      nroReunion = numero(m.get("Reunión") ?? "") ?? nroReunion;
      const f = m.get("Fecha"); // 19/07/2026
      if (f) {
        const [d, mo, y] = f.split("/");
        fecha = `${y}-${mo}-${d}`;
      }
      cur = {
        nroCarrera: numero(m.get("Carrera Nro") ?? "") ?? 0,
        nroLlamado: numero(m.get("Llamado") ?? ""),
        nroAnual: numero(m.get("Carrera Anual Nro.") ?? ""),
        hora: m.get("Hora") || null,
        distancia: numero((m.get("Distancia") ?? "").replace(/[^\d]/g, "")),
        condicion: null,
        premioBs: null,
        premioUsd: null,
        inscritos: [],
      };
      carreras.push(cur);
    } else if (c0.startsWith("Condición") && cur) {
      cur.condicion = c0.split(":").slice(1).join(":").trim();
    } else if (c0.startsWith("Premio") && cur) {
      // Formato A: monto inline en la celda ("Premio Bs.:\n2200" ... "Bono $:\n27040")
      for (const celda of r) {
        if (/^Premio Bs/.test(celda) && /\n|\d/.test(celda)) {
          const monto = celda.replace(/^Premio Bs\.?:?/, "").trim();
          if (monto) cur.premioBs = numero(monto);
        }
        if (/^Bono \$/.test(celda)) {
          const monto = celda.replace(/^Bono \$:?/, "").trim();
          if (monto) cur.premioUsd = numero(monto);
        }
      }
      // Formato B: montos en la fila siguiente (col 0 = Bs, col 17 = Bono $)
      if (cur.premioBs == null && filas[i + 1]) {
        cur.premioBs = numero(filas[i + 1][0] ?? "");
        cur.premioUsd = numero(filas[i + 1][17] ?? "");
        i++;
      }
    } else if (/^\d+$/.test(c0) && cur) {
      const nombreFull = r[1] ?? "";
      const mPrecio = nombreFull.match(/Precio \$:\s*([\d.]+)/);
      let kilosRaw = (r[8] ?? "").replace(",", ".");
      let descargo: number | null = null;
      if (kilosRaw.includes("-")) {
        const [k, d] = kilosRaw.split("-");
        kilosRaw = k;
        descargo = /^\d+$/.test(d) ? Number(d) : null;
      }
      cur.inscritos.push({
        nroPuesto: Number(c0),
        ejemplar: nombreFull.split("\n")[0].trim(),
        precioUsd: mPrecio ? Number(mPrecio[1]) : null,
        medicacion: r[5] || null,
        kilos: kilosRaw ? Number(kilosRaw) : null,
        descargo,
        jinete: r[9] || null,
        implementos: r[13] || null,
        entrenador: r[15] || null,
        pp: /^\d+$/.test(r[18] ?? "") ? Number(r[18]) : null,
      });
    }
  }

  return { nroReunion, fecha, carreras };
}

// "LXVIII PRENSA HÍPICA NACIONAL (GI). ..." → { nombre, grado }
function detectarClasico(condicion: string | null): {
  nombre: string | null;
  grado: string | null;
} {
  if (!condicion) return { nombre: null, grado: null };
  const m = condicion.match(/^(.*?\(G\s?(I{1,3}|IV|V)\))/i);
  if (!m) return { nombre: null, grado: null };
  return {
    nombre: m[1].replace(/\s*\(G\s?\w+\)\s*$/i, "").trim(),
    grado: `G${m[2].toUpperCase()}`,
  };
}

async function main() {
  const ruta = process.argv[2];
  if (!ruta) {
    console.error("Uso: npx tsx scripts/import-inh-xlsx.ts <archivo.xlsx>");
    process.exit(1);
  }

  const data = parsearExcel(ruta);
  if (!data.fecha || data.carreras.length === 0) {
    throw new Error("No se pudo extraer fecha/carreras del Excel — ¿cambió el formato?");
  }
  console.log(
    `Reunión ${data.nroReunion} · ${data.fecha} · ${data.carreras.length} carreras`,
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

  let inscritos = 0;
  for (const c of data.carreras) {
    const clasico = detectarClasico(c.condicion);
    const carrera = await prisma.carrera.upsert({
      where: { reunionId_nroCarrera: { reunionId: reunion.id, nroCarrera: c.nroCarrera } },
      // El INH es oficial: pisa los campos que trae
      update: {
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

    for (const insc of c.inscritos) {
      const ejemplar = await prisma.ejemplar.upsert({
        where: { nombre: insc.ejemplar },
        update: {},
        create: { nombre: insc.ejemplar, slug: slugify(insc.ejemplar) },
      });
      const jinete = insc.jinete
        ? await prisma.jinete.upsert({
            where: { nombre: insc.jinete },
            update: {},
            create: { nombre: insc.jinete, slug: slugify(insc.jinete) },
          })
        : null;
      const entrenador = insc.entrenador
        ? await prisma.entrenador.upsert({
            where: { nombre: insc.entrenador },
            update: {},
            create: { nombre: insc.entrenador, slug: slugify(insc.entrenador) },
          })
        : null;

      await prisma.inscripcion.upsert({
        where: {
          carreraId_nroPuesto: { carreraId: carrera.id, nroPuesto: insc.nroPuesto },
        },
        update: {
          ejemplarId: ejemplar.id,
          jineteId: jinete?.id,
          entrenadorId: entrenador?.id,
          pp: insc.pp,
          kilos: insc.kilos,
          descargo: insc.descargo,
          medicacion: insc.medicacion,
          implementos: insc.implementos,
          precioUsd: insc.precioUsd,
        },
        create: {
          carreraId: carrera.id,
          ejemplarId: ejemplar.id,
          jineteId: jinete?.id,
          entrenadorId: entrenador?.id,
          nroPuesto: insc.nroPuesto,
          pp: insc.pp,
          kilos: insc.kilos,
          descargo: insc.descargo,
          medicacion: insc.medicacion,
          implementos: insc.implementos,
          precioUsd: insc.precioUsd,
        },
      });
      inscritos++;
    }
  }

  console.log(`Importación OK: ${inscritos} inscritos en ${data.carreras.length} carreras.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
