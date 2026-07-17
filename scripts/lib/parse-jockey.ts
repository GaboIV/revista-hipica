// Parsers del HTML de info.jockeypronosticos.com (server-rendered, Bootstrap).
// Funciones puras: HTML → objetos. La escritura a BD vive en scrape-jockey.ts.
import * as cheerio from "cheerio";

export type ActuacionScrapeada = {
  fecha: string; // ISO, de data-fch
  hipodromo: string; // de data-hip
  pesoCorporal: number | null;
  distancia: number | null;
  parciales: string | null;
  tiempo: string | null;
  lote: string | null;
  sr: number | null;
  pp: number | null;
  pasos: string | null;
  posFinal: number | null;
  nroInscritos: number | null;
  cuerpos: string | null;
  jinete: string | null; // nombre display ("Yoelbis González")
  kilos: number | null;
  dividendo: string | null;
  ganadorSegundoTercero: string | null;
  videoUrl: string | null;
};

export type CaballoScrapeado = {
  nro: number;
  pp: number | null;
  precioReclamo: number | null; // "Rc.14.000" → 14000
  nombre: string; // display ("Tank Abbott")
  retirado: boolean;
  motivoRetiro: string | null;
  stud: string | null;
  sexo: string | null; // "M.C." / "M.A." / "H." ...
  edad: number | null; // "8a." → 8
  padre: string | null;
  madre: string | null;
  abueloMaterno: string | null;
  haras: string | null; // "h. Gran Sol" → "Gran Sol"
  jinete: string | null; // display con acentos
  entrenador: string | null; // display
  actuaciones: ActuacionScrapeada[];
};

export type CarreraScrapeada = {
  ord: number;
  nombreCorto: string; // "Rec.Gh5-14k/16k"
  hora: string | null;
  distancia: number | null;
  superficie: string | null;
  lote: string | null; // "Machos · 7 ó más años"
  condicion: string | null;
  premioBs: number | null;
  record: string | null;
  totalCarreras: number; // según la barra de navegación
  caballos: CaballoScrapeado[];
};

const limpiar = (s: string | undefined | null): string =>
  (s ?? "").replace(/\s+/g, " ").trim();

const num = (s: string | undefined | null): number | null => {
  const t = limpiar(s).replace(/[^\d]/g, "");
  return t ? Number(t) : null;
};

// Fechas disponibles en la portada: href="?fch=YYYY-MM-DD"
export function parseFechasDisponibles(html: string): string[] {
  const $ = cheerio.load(html);
  const fechas = new Set<string>();
  $("a[href*='fch=']").each((_, el) => {
    const m = ($(el).attr("href") ?? "").match(/fch=(\d{4}-\d{2}-\d{2})/);
    if (m) fechas.add(m[1]);
  });
  return [...fechas].sort();
}

// Página retrojp.php?fch=...&ord=N
export function parseRetroPage(html: string, ord: number): CarreraScrapeada {
  const $ = cheerio.load(html);

  const header = $(".race-header").first();
  const nombreCorto = limpiar(header.find("h4").first().text());
  const hora = limpiar(header.find("div[style*='font-size:3rem']").parent().find(".small.fw-semibold").first().text()) || null;

  let distancia: number | null = null;
  let superficie: string | null = null;
  const distSpan = header.find("i.bi-rulers").parent();
  const mDist = limpiar(distSpan.text()).match(/([\d.]+)\s*m\s*(\S+)?/);
  if (mDist) {
    distancia = num(mDist[1]);
    superficie = mDist[2] ?? null;
  }

  let premioBs: number | null = null;
  const premioSpan = header.find("i.bi-trophy").parent();
  const mPremio = limpiar(premioSpan.text()).match(/Bs\.?\s*([\d.,]+)/i);
  if (mPremio) premioBs = num(mPremio[1]);

  let record: string | null = null;
  header.find("span").each((_, el) => {
    const m = limpiar($(el).text()).match(/^Récord:\s*(.+)$/);
    if (m) record = m[1];
  });

  // "Machos · 7 ó más años" y la condición larga viven en spans text-muted
  let lote: string | null = null;
  let condicion: string | null = null;
  header.find("span.text-muted").each((_, el) => {
    const t = limpiar($(el).text());
    if (!lote && /·/.test(t) && t.length < 60) lote = t;
    if (!condicion && t.length > 80) condicion = t;
  });

  const totalCarreras = $("nav a[href*='retrojp.php']")
    .toArray()
    .reduce((max, el) => {
      const m = ($(el).attr("href") ?? "").match(/ord=(\d+)/);
      return m ? Math.max(max, Number(m[1])) : max;
    }, 0);

  const caballos: CaballoScrapeado[] = [];
  $(".horse-card").each((_, card) => {
    const $c = $(card);
    const id = $c.attr("id") ?? "";
    const mId = id.match(/^h(\d+)$/);
    if (!mId) return;
    const nro = Number(mId[1]);

    const numDiv = $c.find("div[style*='min-width:62px']").first();
    const pp = num(numDiv.find("span").filter((_, s) => /^PP\s/.test(limpiar($(s).text()))).text());
    const rcTxt = numDiv
      .find("span")
      .filter((_, s) => /^Rc\./.test(limpiar($(s).text())))
      .text();
    const precioReclamo = rcTxt ? num(rcTxt) : null;

    const h5 = $c.find("h5").first();
    const retBadge = h5.find(".badge");
    const retirado = /Ret\./.test(limpiar(retBadge.text()));
    const motivoRetiro = retirado
      ? limpiar(retBadge.attr("title")).replace(/^Retirado por\s*/i, "") || null
      : null;
    const nombre = limpiar(h5.clone().children().remove().end().text());

    const studTxt = limpiar($c.find("div.text-muted.small").filter((_, el) => /^Stud:/.test(limpiar($(el).text()))).first().text());
    const stud = studTxt ? studTxt.replace(/^Stud:\s*/, "") : null;

    // "M.C. 8a."
    let sexo: string | null = null;
    let edad: number | null = null;
    $c.find("div.small.text-muted").each((_, el) => {
      const m = limpiar($(el).text()).match(/^([MH]\.?[A-Z]?\.?)\s+(\d+)a\.?$/i);
      if (m && sexo === null) {
        sexo = m[1];
        edad = Number(m[2]);
      }
    });

    // Pedigrí: P: padre (abuelo) / M: madre (abuelo materno) / h. Haras
    let padre: string | null = null;
    let madre: string | null = null;
    let abueloMaterno: string | null = null;
    let haras: string | null = null;
    $c.find("div").each((_, el) => {
      const t = limpiar($(el).text());
      const mP = t.match(/^P:\s*([^(]+)/);
      const mM = t.match(/^M:\s*([^(]+)(?:\(([^)]+)\))?/);
      const mH = t.match(/^h\.\s+(.+)$/);
      if (mP && !padre && $(el).find("div").length === 0) padre = limpiar(mP[1]);
      if (mM && !madre && $(el).find("div").length === 0) {
        madre = limpiar(mM[1]);
        abueloMaterno = mM[2] ? limpiar(mM[2]) : null;
      }
      if (mH && !haras && $(el).find("div").length === 0) haras = limpiar(mH[1]);
    });

    // Jinete y entrenador (nombres display)
    let jinete: string | null = null;
    const jDiv = $c.find("div.fw-semibold.lh-sm").first();
    if (jDiv.length) {
      jinete = limpiar(jDiv.clone().children().remove().end().text()) || null;
    }
    let entrenador: string | null = null;
    $c.find("span.text-muted").each((_, el) => {
      if (limpiar($(el).text()) === "E:" && !entrenador) {
        entrenador = limpiar($(el).next("span").text()) || null;
      }
    });

    // Retrospecto
    const actuaciones: ActuacionScrapeada[] = [];
    $c.find(`table[id^='retro'] tbody tr`).each((_, tr) => {
      const tds = $(tr).find("td");
      if (tds.length < 15) return;
      const link = $(tds[0]).find("a.carr-popup");
      const fecha = link.attr("data-fch");
      if (!fecha) return;

      const posTd = $(tds[10]);
      const posFinal = num(posTd.find("span").first().text());
      const nroInscritos = num(posTd.find("sub").first().text());

      const videoOnclick = $(tds[16]).find("a").attr("onclick") ?? "";
      const mVideo = videoOnclick.match(/window\.open\('([^']+)'/);

      actuaciones.push({
        fecha,
        hipodromo: link.attr("data-hip") ?? "La Rinconada",
        pesoCorporal: num($(tds[2]).text()),
        distancia: $(tds[3]).attr("data-dist")
          ? Number($(tds[3]).attr("data-dist"))
          : num($(tds[3]).text()),
        parciales: limpiar($(tds[4]).text()) || null,
        tiempo: limpiar($(tds[5]).text()) || null,
        lote: limpiar($(tds[6]).text()) || null,
        sr: num($(tds[7]).text()),
        pp: num($(tds[8]).text()),
        pasos: limpiar($(tds[9]).text()) || null,
        posFinal,
        nroInscritos,
        cuerpos: limpiar($(tds[11]).text()) || null,
        jinete:
          limpiar($(tds[12]).clone().find("sup,sub,code").remove().end().text()) || null,
        kilos: num($(tds[13]).clone().children("code").remove().end().text()),
        dividendo: limpiar($(tds[14]).text()) || null,
        ganadorSegundoTercero: limpiar($(tds[15]).text()) || null,
        videoUrl: mVideo ? mVideo[1] : null,
      });
    });

    caballos.push({
      nro,
      pp,
      precioReclamo,
      nombre,
      retirado,
      motivoRetiro,
      stud,
      sexo,
      edad,
      padre,
      madre,
      abueloMaterno,
      haras,
      jinete,
      entrenador,
      actuaciones,
    });
  });

  return {
    ord,
    nombreCorto,
    hora,
    distancia,
    superficie,
    lote,
    condicion,
    premioBs,
    record,
    totalCarreras,
    caballos,
  };
}
