// Utilidades de presentación.

// "VELASQUEZ F FRANKLIN R" (formato INH: APELLIDO [inicial] NOMBRE [inicial])
// → "Franklin Velasquez". Los tokens de una sola letra son iniciales.
export function nombrePersona(oficial: string | null | undefined): string {
  if (!oficial) return "—";
  const tokens = oficial.trim().split(/\s+/);
  const sufijo = tokens.some((t) => /^(JR|SR)\.?$/i.test(t)) ? " Jr." : "";
  const palabras = tokens.filter(
    (t) => t.replace(/\./g, "").length > 1 && !/^(JR|SR)\.?$/i.test(t),
  );
  if (palabras.length < 2) return titulo(oficial);
  const apellido = palabras[0];
  const nombre = palabras[palabras.length - 1];
  return `${titulo(nombre)} ${titulo(apellido)}${sufijo}`;
}

export function titulo(s: string): string {
  return s
    .toLowerCase()
    .split(/\s+/)
    .map((w, idx) => {
      // ordinales romanos al inicio ("LXVIII Prensa...", "XCVII Clásico...")
      if (idx === 0 && /^[ivxlcdm]+$/.test(w) && w.length > 1) return w.toUpperCase();
      return w.length > 2 ? w[0].toUpperCase() + w.slice(1) : w;
    })
    .join(" ")
    .replace(/^./, (c) => c.toUpperCase());
}

// "TANK ABBOTT" → "Tank Abbott"; "GOLDEN JE" → "Golden Je" (toda palabra capitalizada)
export function nombreEjemplar(s: string): string {
  return s
    .toLowerCase()
    .split(/\s+/)
    .map((w) => (w ? w[0].toUpperCase() + w.slice(1) : w))
    .join(" ");
}

export function fechaLarga(d: Date): string {
  const s = d.toLocaleDateString("es-VE", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  });
  return s[0].toUpperCase() + s.slice(1); // "Domingo, 19 de julio de 2026"
}

export function fechaISO(d: Date): string {
  return d.toISOString().slice(0, 10);
}

// "01:00 PM" → "1:00 pm"
export function horaCorta(h: string | null): string {
  if (!h) return "";
  return h.replace(/^0/, "").toLowerCase();
}

export function formatoBs(n: unknown): string {
  if (n == null) return "—";
  return `Bs. ${Number(n).toLocaleString("es-VE", { maximumFractionDigits: 0 })}`;
}

export function formatoUsd(n: unknown): string {
  if (n == null) return "—";
  return `US$ ${Number(n).toLocaleString("en-US", { maximumFractionDigits: 0 })}`;
}

// Condición del INH → nombre corto de la carrera para listados.
// "PESOS EFECTIVOS: RECLAMO H5 $(16K-14K). CABALLOS NACIONALES..." → "Reclamo H5 (16k-14k)"
// "HANDICAP LIBRE. PARA YEGUAS..." → "Handicap libre · Yeguas"
export function nombreCortoCarrera(condicion: string | null, nombreClasico: string | null): string {
  if (nombreClasico) return titulo(nombreClasico);
  if (!condicion) return "Carrera";
  const c = condicion.toUpperCase();
  const reclamo = c.match(/RECLAMO\s+(H\d)\s*\$?\(([^)]+)\)/);
  if (reclamo) {
    const sexo = c.includes("YEGUAS") ? " · Yeguas" : "";
    return `Reclamo ${reclamo[1]} (${reclamo[2].toLowerCase()})${sexo}`;
  }
  if (c.startsWith("HANDICAP")) {
    const sexo = c.includes("YEGUAS") ? "Yeguas" : "Caballos";
    const edad = c.match(/DE\s+([\d\sA-ZÑ]+?)\s+AÑOS/);
    return `Handicap libre · ${sexo}${edad ? ` ${edad[1].toLowerCase().trim()} años` : ""}`;
  }
  const primera = condicion.split(".")[0];
  return titulo(primera.slice(0, 48));
}
