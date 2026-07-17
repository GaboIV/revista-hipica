import { delay } from "./util";

const BASE = "https://info.jockeypronosticos.com";
const UA =
  "Mozilla/5.0 (compatible; RevistaHipicaBot/1.0; +https://github.com/GaboIV/revista-hipica)";

// Pausa entre peticiones para no castigar al servidor fuente.
const PAUSA_MS = 800;

export async function fetchHtml(path: string, reintentos = 3): Promise<string> {
  const url = path.startsWith("http") ? path : `${BASE}/${path.replace(/^\//, "")}`;
  let ultimoError: unknown;
  for (let intento = 1; intento <= reintentos; intento++) {
    try {
      const res = await fetch(url, { headers: { "User-Agent": UA } });
      if (!res.ok) throw new Error(`HTTP ${res.status} en ${url}`);
      const html = await res.text();
      await delay(PAUSA_MS);
      return html;
    } catch (e) {
      ultimoError = e;
      if (intento < reintentos) await delay(2000 * intento);
    }
  }
  throw ultimoError;
}
