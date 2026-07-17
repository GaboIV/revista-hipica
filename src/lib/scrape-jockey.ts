// Núcleo del scraper de info.jockeypronosticos.com → base de datos.
import { prisma } from "./db";
import { fetchHtml } from "./fetch";
import { enviarAviso } from "./mailer";
import { parseFechasDisponibles, parseRetroPage } from "./parse-jockey";
import { claveNombre, hoyVE, normalizar, slugify, tokensNombre } from "./util";

type Persona = { id: number; nombre: string; nombreCorto: string | null };

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
    const exacto = this.porNombre.get(normalizar(display));
    if (exacto) return exacto;

    const candidatos = this.porClave.get(claveNombre(display)) ?? [];
    if (candidatos.length === 1) {
      const p = candidatos[0];
      if (!p.nombreCorto) {
        await this.ponerNombreCorto(p.id, display);
        p.nombreCorto = display;
      }
      return p;
    }

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
      return null;
    }

    const nuevo = await this.crear(display);
    this.indexar(nuevo);
    return nuevo;
  }
}

class CatalogoEjemplares {
  private mapa = new Map<string, { id: number; nombre: string }>();

  constructor(ejemplares: { id: number; nombre: string }[]) {
    for (const e of ejemplares) this.mapa.set(normalizar(e.nombre), e);
  }

  resolver(display: string): { id: number; nombre: string } | null {
    return this.mapa.get(normalizar(display)) ?? null;
  }

  indexar(e: { id: number; nombre: string }) {
    this.mapa.set(normalizar(e.nombre), e);
  }
}

export type ScraperResultado = {
  reuniones: number;
  carreras: number;
  inscripciones: number;
  actuaciones: number;
  retirosMarcados: number;
};

export async function correrScraper(opciones?: {
  fecha?: string;
  notify?: boolean;
}): Promise<ScraperResultado> {
  const notify = opciones?.notify ?? false;
  const fechaFija = opciones?.fecha ?? null;

  const contadores: ScraperResultado = {
    reuniones: 0,
    carreras: 0,
    inscripciones: 0,
    actuaciones: 0,
    retirosMarcados: 0,
  };

  try {
    let fechas: string[];
    if (fechaFija) {
      fechas = [fechaFija];
    } else {
      const portada = await fetchHtml("/");
      fechas = parseFechasDisponibles(portada).filter((f) => f >= hoyVE());
      console.log("Fechas publicadas:", fechas.length ? fechas.join(", ") : "(ninguna)");
    }

    if (fechas.length === 0) {
      return contadores;
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
      await scrapearFecha(fecha, matchJinetes, matchEntrenadores, ejemplares, contadores);
    }

    console.log("\nResumen:", contadores);

    if (notify) {
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

    return contadores;
  } catch (e) {
    console.error("Scraper falló:", e);
    if (notify) {
      await enviarAviso(
        "Revista Hípica: el scraper falló",
        `Error al scrapear el ${hoyVE()}:\n\n${e instanceof Error ? e.stack : String(e)}`,
      ).catch((err) => console.error("Y el aviso también falló:", err));
    }
    throw e;
  }
}

async function scrapearFecha(
  fecha: string,
  matchJinetes: MatcherPersonas,
  matchEntrenadores: MatcherPersonas,
  ejemplares: CatalogoEjemplares,
  contadores: ScraperResultado,
) {
  console.log(`\n=== Scraping reunión ${fecha} ===`);

  const hipodromo = await prisma.hipodromo.upsert({
    where: { nombre: "La Rinconada" },
    update: {},
    create: { nombre: "La Rinconada", ciudad: "Caracas" },
  });

  // La reunión puede o no existir ya (si se importó de Excel previamente)
  const reunion = await prisma.reunion.upsert({
    where: { hipodromoId_fecha: { hipodromoId: hipodromo.id, fecha: new Date(fecha) } },
    update: {},
    create: {
      hipodromoId: hipodromo.id,
      fecha: new Date(fecha),
      estado: "PROGRAMADA",
    },
  });
  contadores.reuniones++;

  // Scrapeamos la primera carrera para saber cuántas hay en total
  const html1 = await fetchHtml(`retrojp.php?fch=${fecha}&ord=1`);
  const c1 = parseRetroPage(html1, 1);
  const total = c1.totalCarreras || 1;

  console.log(`Reunión tiene ${total} carreras anunciadas.`);

  // Procesamos la 1 ya parseada
  await guardarCarrera(reunion.id, c1, matchJinetes, matchEntrenadores, ejemplares, contadores);

  // Procesamos las restantes
  for (let ord = 2; ord <= total; ord++) {
    try {
      const html = await fetchHtml(`retrojp.php?fch=${fecha}&ord=${ord}`);
      const c = parseRetroPage(html, ord);
      await guardarCarrera(reunion.id, c, matchJinetes, matchEntrenadores, ejemplares, contadores);
    } catch (e) {
      console.error(`Error procesando carrera ${ord} de la fecha ${fecha}:`, e);
    }
  }
}

async function guardarCarrera(
  reunionId: number,
  c: ReturnType<typeof parseRetroPage>,
  matchJinetes: MatcherPersonas,
  matchEntrenadores: MatcherPersonas,
  ejemplares: CatalogoEjemplares,
  contadores: ScraperResultado,
) {
  // Upsert de la carrera: la web no pisa el llamado, la hora ni el premio si ya
  // existían del Excel oficial (que es fuente de verdad).
  const carrera = await prisma.carrera.upsert({
    where: { reunionId_nroCarrera: { reunionId, nroCarrera: c.ord } },
    update: {
      distancia: c.distancia ?? 0,
      superficie: c.superficie ?? "Arena",
      record: c.record,
    },
    create: {
      reunionId,
      nroCarrera: c.ord,
      distancia: c.distancia ?? 0,
      superficie: c.superficie ?? "Arena",
      hora: c.hora,
      condicion: c.condicion,
      premioBs: c.premioBs,
      record: c.record,
    },
  });
  contadores.carreras++;

  console.log(`Carrera ${c.ord}: ${c.caballos.length} inscritos.`);

  for (const cab of c.caballos) {
    let ejemplar = ejemplares.resolver(cab.nombre);
    if (!ejemplar) {
      ejemplar = await prisma.ejemplar.create({
        data: {
          nombre: cab.nombre,
          slug: slugify(cab.nombre),
          sexo: cab.sexo,
          padre: cab.padre,
          madre: cab.madre,
          abueloMaterno: cab.abueloMaterno,
        },
        select: { id: true, nombre: true },
      });
      ejemplares.indexar(ejemplar);
    }

    const jinete = await matchJinetes.resolver(cab.jinete);
    const entrenador = await matchEntrenadores.resolver(cab.entrenador);

    let studId: number | null = null;
    if (cab.stud) {
      const stud = await prisma.stud.upsert({
        where: { nombre: cab.stud },
        update: {},
        create: { nombre: cab.stud },
      });
      studId = stud.id;
    }

    // Upsert de la inscripción
    const insc = await prisma.inscripcion.upsert({
      where: {
        carreraId_nroPuesto: { carreraId: carrera.id, nroPuesto: cab.nro },
      },
      update: {
        ejemplarId: ejemplar.id,
        // Los actores y la PP de la web se usan de respaldo si no venían del Excel
        jineteId: jinete?.id,
        entrenadorId: entrenador?.id,
        studId,
        pp: cab.pp,
        retirado: cab.retirado,
      },
      create: {
        carreraId: carrera.id,
        ejemplarId: ejemplar.id,
        nroPuesto: cab.nro,
        pp: cab.pp,
        jineteId: jinete?.id,
        entrenadorId: entrenador?.id,
        studId,
        edad: cab.edad,
        retirado: cab.retirado,
      },
    });
    contadores.inscripciones++;

    if (cab.retirado) {
      contadores.retirosMarcados++;
    }

    // Actuaciones pasadas de este ejemplar
    for (const a of cab.actuaciones) {
      const ya = await prisma.actuacion.findFirst({
        where: { ejemplarId: ejemplar.id, fecha: new Date(a.fecha), carreraId: null },
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
}
