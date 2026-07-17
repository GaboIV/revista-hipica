import { MetadataRoute } from "next";
import { prisma } from "@/lib/db";
import { fechaISO } from "@/lib/format";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || "https://revista-hipica.vercel.app";

  // 1. Páginas estáticas / básicas
  const rutasEstaticas: MetadataRoute.Sitemap = [
    {
      url: baseUrl,
      lastModified: new Date(),
      changeFrequency: "daily",
      priority: 1.0,
    },
    {
      url: `${baseUrl}/estadisticas`,
      lastModified: new Date(),
      changeFrequency: "weekly",
      priority: 0.8,
    },
  ];

  try {
    // 2. Reuniones dinámicas
    const reuniones = await prisma.reunion.findMany({
      include: {
        carreras: {
          select: { nroCarrera: true },
        },
      },
    });

    const rutasReuniones: MetadataRoute.Sitemap = reuniones.map((r) => {
      const fechaStr = fechaISO(r.fecha);
      return {
        url: `${baseUrl}/programa/${fechaStr}`,
        lastModified: r.fecha, // o la fecha de la reunión
        changeFrequency: r.estado === "CORRIDA" ? "monthly" : "daily",
        priority: r.estado === "CORRIDA" ? 0.6 : 0.9,
      };
    });

    // 3. Carreras dinámicas
    const rutasCarreras: MetadataRoute.Sitemap = reuniones.flatMap((r) => {
      const fechaStr = fechaISO(r.fecha);
      return r.carreras.map((c) => ({
        url: `${baseUrl}/carrera/${fechaStr}/${c.nroCarrera}`,
        lastModified: r.fecha,
        changeFrequency: r.estado === "CORRIDA" ? "monthly" : "daily",
        priority: r.estado === "CORRIDA" ? 0.5 : 0.8,
      }));
    });

    // 4. Años en estadísticas
    const anos = [
      ...new Set(reuniones.map((r) => r.fecha.getUTCFullYear())),
    ];
    const rutasAnosEstadisticas: MetadataRoute.Sitemap = anos.map((ano) => ({
      url: `${baseUrl}/estadisticas/${ano}`,
      lastModified: new Date(),
      changeFrequency: "weekly",
      priority: 0.7,
    }));

    return [
      ...rutasEstaticas,
      ...rutasReuniones,
      ...rutasCarreras,
      ...rutasAnosEstadisticas,
    ];
  } catch (error) {
    console.error("Error al generar sitemap dinámico:", error);
    // Retorno fallback seguro para que no falle el build si la BD está offline en la compilación estática
    return rutasEstaticas;
  }
}
