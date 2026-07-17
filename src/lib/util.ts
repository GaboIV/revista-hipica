// Utilidades compartidas del proyecto.
// Mapea la lógica que originalmente estaba en scripts/lib/util.ts.

export function slugify(s: string): string {
  return s
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

// Normaliza para comparar nombres entre fuentes (INH vs web):
// sin acentos, sin puntos, mayúsculas, espacios colapsados.
export function normalizar(s: string): string {
  return s
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\./g, "")
    .toUpperCase()
    .replace(/\s+/g, " ")
    .trim();
}

// Tokens de un nombre, separando los "significativos" (>1 letra) de las iniciales.
export function tokensNombre(s: string): { palabras: string[]; iniciales: string[] } {
  const tokens = normalizar(s).split(" ").filter(Boolean);
  return {
    palabras: tokens.filter((t) => t.length > 1 && !/^(JR|SR)$/.test(t)),
    iniciales: tokens.filter((t) => t.length === 1),
  };
}

// Clave de comparación laxa: palabras significativas ordenadas.
// "LUGO V JAIME L" y "Jaime Lugo" → "JAIME LUGO"
export function claveNombre(s: string): string {
  return tokensNombre(s).palabras.sort().join(" ");
}

export function delay(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

// Fecha de hoy (YYYY-MM-DD) en hora de Venezuela.
export function hoyVE(): string {
  return new Date().toLocaleDateString("en-CA", { timeZone: "America/Caracas" });
}
