// Importador del Excel oficial del INH (repProgramacionNN.xlsx) → base de datos.
// Wrapper simple del núcleo en src/lib/import-inh.ts para uso en CLI.
//
// Uso: npx tsx scripts/import-inh-xlsx.ts dataScrapping/repProgramacion28.xlsx
import { readFileSync } from "node:fs";
import { prisma } from "./lib/db";
import { importarReunionDesdeExcel } from "../src/lib/import-inh";

async function main() {
  const ruta = process.argv[2];
  if (!ruta) {
    console.error("Uso: npx tsx scripts/import-inh-xlsx.ts <archivo.xlsx>");
    process.exit(1);
  }

  console.log(`Leyendo archivo: ${ruta}...`);
  try {
    const buffer = readFileSync(ruta);
    const res = await importarReunionDesdeExcel(buffer);
    console.log(
      `Importación OK: Reunión ${res.nroReunion} del ${res.fecha}. ` +
        `${res.inscritosCount} inscritos en ${res.carrerasCount} carreras.`
    );
  } catch (error) {
    console.error("Fallo al importar:", error);
    process.exitCode = 1;
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
