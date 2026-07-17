// Scraper de info.jockeypronosticos.com → base de datos propia.
//
// Uso:
//   npx tsx scripts/scrape-jockey.ts               # scrapea todas las fechas futuras publicadas
//   npx tsx scripts/scrape-jockey.ts --fecha 2026-07-19
//   npx tsx scripts/scrape-jockey.ts --notify      # además, envía correo si NO hay reunión
//                                                  # próxima con datos (o si el scraper falla)
//
// Los pronósticos de la cátedra ajena NO se scrapean (decisión del proyecto).
import { prisma } from "./lib/db";
import { fetchHtml } from "./lib/fetch";
import { enviarAviso } from "./lib/mailer";
import {
  parseFechasDisponibles,
  parseRetroPage,
  type CaballoScrapeado,
} from "./lib/parse-jockey";
import { claveNombre, hoyVE, normalizar, slugify, tokensNombre } from "./lib/util";

type Persona = { id: number; nombre: string; nombreCorto: string | null };

const contadores = {
  reuniones: 0,
  carreras: 0,
  inscripciones: 0,
  actuaciones: 0,
  retirosMarcados: 0,
};

/* ── Matching de personas (INH "APELLIDO I NOMBRE I" vs web "Nombre Apellido") ── */

class MatcherPersonas {
  private porNombre = new Map<string, Persona>();
  private porClave = new Map<string, Persona[]>();

  constructor(
    personas: Persona[],
    private crear: (nombre: string) => Promise<Persona>,
    private ponerNombreCorto: (id: number, nombreCorto: string) => Promise<void>,
  ) {
    for (const p of personas) this.indexar(p);
  }

  private indexar(p: Persona) {
    this.porNombre.set(normalizar(p.nombre), p);
    const clave = claveNombre(p.nombre);
    const lista = this.porClave.get(clave) ?? [];
    lista.push(p);
    this.porClave.set(clave, lista);
  }

  async resolver(display: string | null): Promise<Persona | null> {
    if (!display) return null;
    // 1. Ya existe con ese nombre exacto (creado por el scraper antes)
    const exacto = this.porNombre.get(normalizar(display));
    if (exacto) return exacto;

    // 2. Match por palabras significativas ("LUGO V JAIME L" ↔ "Jaime Lugo")
    const candidatos = this.porClave.get(claveNombre(display)) ?? [];
    if (candidatos.length === 1) {
      const p = candidatos[0];
      if (!p.nombreCorto) {
        await this.ponerNombreCorto(p.id, display);
        p.nombreCorto = display;
      }
      return p;
    }
    // 3. Desambiguar por iniciales ("Jaime Lugo C." → candidato con token C)
    if (candidatos.length > 1) {
      const { iniciales } = tokensNombre(display);
      if (iniciales.length > 0) {
        const filtrados = candidatos.filter((c) => {
          const tokens = new Set(normalizar(c.nombre).split(" "));
          return iniciales.every((i) => tokens.has(i));
        });
        if (filtrados.length === 1) {
          const p = filtrados[0];
          if (!p.nombreCorto) {
            await this.ponerNombreCorto(p.id, display);
            p.nombreCorto = display;
          }
          return p;
        }
      }
      return null; // ambiguo: mejor no adivinar
    }
    // 4. No existe: crear con el nombre display
    const nuevo = await this.crear(display);
    this.indexar(nuevo);
    return nuevo;
  }
}

/* ── Ejemplares ─────────────────────────────────────────────────── */

class CatalogoEjemplares {
  private mapa = new Map<string, { id: number; nombre: string }>();

  constructor(ejemplares: { id: number; nombre: string }[]) {
    for (const e of ejemplares) this.mapa.set(normalizar(e.nombre), e);
  }

  async resolver(display: string): Promise<{ id: number; nombre: string }> {
    const clave = normalizar(display);
    const existente = this.mapa.get(clave);
    if (existente) return existente;
    const creado = await prisma.ejemplar.create({
      data: { nombre: display.toUpperCase(), slug: slugify(display) },
      select: { id: true, nombre: true },
    });
    this.mapa.set(clave, creado);
    return creado;
  }
}

/* ── Scrape de una fecha ────────────────────────────────────────── */

async function scrapearFecha(
  fecha: string,
  matchJinetes: MatcherPersonas,
  matchEntrenadores: MatcherPersonas,
  ejemplares: CatalogoEjemplares,
) {
  console.log(`\n── Fecha ${fecha} ──`);

  const hipodromo = await prisma.hipodromo.upsert({
    where: { nombre: "La Rinconada" },
    update: {},
    create: { nombre: "La Rinconada", ciudad: "Caracas" },
  });

  let reunion = await prisma.reunion.findUnique({
    where: { hipodromoId_fecha: { hipodromoId: hipodromo.id, fecha: new Date(fecha) } },
  });
  if (!reunion) {
    reunion = await prisma.reunion.create({
      data: { hipodromoId: hipodromo.id, fecha: new Date(fecha) },
    });
    contadores.reuniones++;
  }

  let total = 1;
  for (let ord = 1; ord <= total; ord++) {
    const html = await fetchHtml(`retrojp.php?fch=${fecha}&ord=${ord}`);
    const data = parseRetroPage(html, ord);
    total = Math.max(total, data.totalCarreras);

    let carrera = await prisma.carrera.findUnique({
      where: { reunionId_nroCarrera: { reunionId: reunion.id, nroCarrera: ord } },
    });
    if (!carrera) {
      carrera = await prisma.carrera.create({
        data: {
          reunionId: reunion.id,
          nroCarrera: ord,
          hora: data.hora,
          distancia: data.distancia ?? 0,
          superficie: data.superficie ?? "Arena",
          condicion: data.condicion,
          premioBs: data.premioBs,
          record: data.record,
        },
      });
      contadores.carreras++;
    } else {
      // Solo completar lo que falte; el Excel del INH es la fuente oficial.
      await prisma.carrera.update({
        where: { id: carrera.id },
        data: {
          record: carrera.record ?? data.record,
          superficie: carrera.superficie || (data.superficie ?? undefined),
          premioBs: carrera.premioBs ?? data.premioBs,
          condicion: carrera.condicion ?? data.condicion,
        },
      });
    }

    for (const caballo of data.caballos) {
      await procesarCaballo(carrera.id, caballo, matchJinetes, matchEntrenadores, ejemplares);
    }
    console.log(`  C${ord}: ${data.caballos.length} ejemplares procesados`);
  }
}

async function procesarCaballo(
  carreraId: number,
  c: CaballoScrapeado,
  matchJinetes: MatcherPersonas,
  matchEntrenadores: MatcherPersonas,
  ejemplares: CatalogoEjemplares,
) {
  const ejemplar = await ejemplares.resolver(c.nombre);

  // Enriquecer ficha del ejemplar con lo que falte
  await prisma.ejemplar.updateMany({
    where: { id: ejemplar.id, OR: [{ padre: null }, { sexo: null }] },
    data: {
      sexo: c.sexo ?? undefined,
      padre: c.padre ?? undefined,
      madre: c.madre ?? undefined,
      abueloMaterno: c.abueloMaterno ?? undefined,
    },
  });

  const jinete = await matchJinetes.resolver(c.jinete);
  const entrenador = await matchEntrenadores.resolver(c.entrenador);
  const stud = c.stud
    ? await prisma.stud.upsert({
        where: { nombre: c.stud },
        update: {},
        create: { nombre: c.stud },
      })
    : null;

  const existente = await prisma.inscripcion.findUnique({
    where: { carreraId_nroPuesto: { carreraId, nroPuesto: c.nro } },
  });

  if (!existente) {
    await prisma.inscripcion.create({
      data: {
        carreraId,
        ejemplarId: ejemplar.id,
        jineteId: jinete?.id,
        entrenadorId: entrenador?.id,
        studId: stud?.id,
        nroPuesto: c.nro,
        pp: c.pp,
        edad: c.edad,
        precioUsd: c.precioReclamo,
        retirado: c.retirado,
      },
    });
    contadores.inscripciones++;
  } else {
    if (c.retirado && !existente.retirado) contadores.retirosMarcados++;
    await prisma.inscripcion.update({
      where: { id: existente.id },
      data: {
        retirado: c.retirado,
        studId: existente.studId ?? stud?.id,
        edad: existente.edad ?? c.edad,
        precioUsd: existente.precioUsd ?? c.precioReclamo,
        pp: existente.pp ?? c.pp,
      },
    });
  }

  // Retrospecto → tabla Actuacion (el histórico propio)
  for (const a of c.actuaciones) {
    const ya = await prisma.actuacion.findUnique({
      where: { ejemplarId_fecha: { ejemplarId: ejemplar.id, fecha: new Date(a.fecha) } },
    });
    if (ya) continue;
    const jineteAct = await matchJinetes.resolver(a.jinete);
    await prisma.actuacion.create({
      data: {
        ejemplarId: ejemplar.id,
        jineteId: jineteAct?.id,
        fecha: new Date(a.fecha),
        hipodromo: a.hipodromo,
        distancia: a.distancia,
        pesoCorporal: a.pesoCorporal,
        parciales: a.parciales,
        tiempo: a.tiempo,
        lote: a.lote,
        sr: a.sr,
        pp: a.pp,
        pasos: a.pasos,
        posFinal: a.posFinal,
        nroInscritos: a.nroInscritos,
        cuerpos: a.cuerpos,
        kilos: a.kilos,
        dividendo: a.dividendo,
        ganador: a.ganadorSegundoTercero?.split("-")[0] ?? null,
        segundo: a.ganadorSegundoTercero?.split("-")[1] ?? null,
        tercero: a.ganadorSegundoTercero?.split("-")[2] ?? null,
        videoUrl: a.videoUrl,
        fuente: "jockeypronosticos",
        raw: a as object,
      },
    });
    contadores.actuaciones++;
  }
}

/* ── Main ───────────────────────────────────────────────────────── */

async function main() {
  const args = process.argv.slice(2);
  const notify = args.includes("--notify");
  const idxFecha = args.indexOf("--fecha");
  const fechaFija = idxFecha >= 0 ? args[idxFecha + 1] : null;

  try {
    let fechas: string[];
    if (fechaFija) {
      fechas = [fechaFija];
    } else {
      const portada = await fetchHtml("/");
      fechas = parseFechasDisponibles(portada).filter((f) => f >= hoyVE());
      console.log("Fechas publicadas:", fechas.length ? fechas.join(", ") : "(ninguna)");
    }

    const [jinetes, entrenadores, listaEjemplares] = await Promise.all([
      prisma.jinete.findMany({ select: { id: true, nombre: true, nombreCorto: true } }),
      prisma.entrenador.findMany({ select: { id: true, nombre: true, nombreCorto: true } }),
      prisma.ejemplar.findMany({ select: { id: true, nombre: true } }),
    ]);

    const matchJinetes = new MatcherPersonas(
      jinetes,
      (nombre) =>
        prisma.jinete.create({
          data: { nombre, nombreCorto: nombre, slug: slugify(nombre) },
          select: { id: true, nombre: true, nombreCorto: true },
        }),
      async (id, nombreCorto) => {
        await prisma.jinete.update({ where: { id }, data: { nombreCorto } });
      },
    );
    const matchEntrenadores = new MatcherPersonas(
      entrenadores,
      (nombre) =>
        prisma.entrenador.create({
          data: { nombre, nombreCorto: nombre, slug: slugify(nombre) },
          select: { id: true, nombre: true, nombreCorto: true },
        }),
      async (id, nombreCorto) => {
        await prisma.entrenador.update({ where: { id }, data: { nombreCorto } });
      },
    );
    const ejemplares = new CatalogoEjemplares(listaEjemplares);

    for (const fecha of fechas) {
      await scrapearFecha(fecha, matchJinetes, matchEntrenadores, ejemplares);
    }

    console.log("\nResumen:", contadores);

    if (notify) {
      // ¿Quedó cargada una reunión próxima con inscritos? (sin importar si la
      // creó esta corrida o la del día anterior)
      const proxima = await prisma.reunion.findFirst({
        where: {
          fecha: { gte: new Date(hoyVE()) },
          carreras: { some: { inscripciones: { some: {} } } },
        },
        orderBy: { fecha: "asc" },
      });
      if (!proxima) {
        await enviarAviso(
          "Revista Hípica: sin datos de la próxima reunión",
          `El scraper corrió el ${hoyVE()} pero no encontró inscripciones publicadas ` +
            `para ninguna fecha futura en jockeypronosticos.com.\n\n` +
            `Habrá que revisar manualmente o importar el Excel del INH.\n\n` +
            `Resumen de la corrida: ${JSON.stringify(contadores)}`,
        );
      } else {
        console.log(
          `Reunión próxima OK: ${proxima.fecha.toISOString().slice(0, 10)} — sin aviso.`,
        );
      }
    }
  } catch (e) {
    console.error("Scraper falló:", e);
    if (notify) {
      await enviarAviso(
        "Revista Hípica: el scraper falló",
        `Error al scrapear el ${hoyVE()}:\n\n${e instanceof Error ? e.stack : String(e)}`,
      ).catch((err) => console.error("Y el aviso también falló:", err));
    }
    process.exitCode = 1;
  } finally {
    await prisma.$disconnect();
  }
}

main();
