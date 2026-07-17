// Scraper de info.jockeypronosticos.com → base de datos propia.
// Wrapper del núcleo en src/lib/scrape-jockey.ts para uso en CLI.
//
// Uso:
//   npx tsx scripts/scrape-jockey.ts               # scrapea todas las fechas futuras publicadas
//   npx tsx scripts/scrape-jockey.ts --fecha 2026-07-19
//   npx tsx scripts/scrape-jockey.ts --notify      # envía correo si NO hay reunión próxima
import { prisma } from "./lib/db";
import { correrScraper } from "../src/lib/scrape-jockey";

async function main() {
  const args = process.argv.slice(2);
  const notify = args.includes("--notify");
  const idxFecha = args.indexOf("--fecha");
  const fecha = idxFecha >= 0 ? args[idxFecha + 1] : undefined;

  try {
    const res = await correrScraper({ fecha, notify });
    console.log("\nProceso del Scraper Finalizado Con Éxito.");
    console.log("Resumen:", res);
  } catch (e) {
    console.error("Scraper falló en CLI:", e);
    process.exitCode = 1;
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
