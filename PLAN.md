# Plan del Proyecto — Revista Hípica Digital de Venezuela

> Documento de planificación. Fecha: 17-jul-2026.
> MVP: una web moderna equivalente a jockeypronosticos.com, pero más bonita, útil e intuitiva,
> con miras a convertirse en la revista hípica semanal digital de Venezuela.

---

## 1. Visión

**Corto plazo (MVP):** replicar y superar la utilidad de la web de referencia — programación
de La Rinconada por fecha, detalle de cada carrera con retrospecto de los ejemplares,
compromisos de jinetes/entrenadores, favoritos de la cátedra y estadísticas anuales — con un
diseño moderno inspirado en Racing TV / At The Races (OtraWeb1/OtraWeb2).

**Mediano plazo:** revista hípica semanal — artículos, análisis y crónicas — más
funcionalidades únicas para apostadores (comparadores, alertas, ratings propios).

**Largo plazo (solo idea, sin detallar):** evolucionar hacia plataforma de apuestas.
La arquitectura debe dejar la puerta abierta (cuentas de usuario, datos en tiempo real,
integridad de datos) pero **no** se diseña nada de apuestas ahora.

---

## 2. Hallazgos de la investigación de datos

| Fuente | Qué aporta | Cómo obtenerlo |
|---|---|---|
| `info.jockeypronosticos.com/?fch=YYYY-MM-DD` | Programación del día: 15 carreras, inscritos, compromisos, favoritos de cátedra | HTML server-rendered (PHP + Bootstrap), **sin autenticación**, scrapeable con requests simples |
| `retrojp.php?fch=...&ord=N` | Detalle de carrera: condiciones, premio, récord, retrospecto completo de cada ejemplar (últimas 6 actuaciones con parciales, tiempos, jinete, kilos, dividendo) | Igual: HTML estático, estable y estructurado |
| `carrpop.php?fch=...&ord=N&hip=La Rinconada&cab=NOMBRE` | Historial por caballo como fragmento HTML (semi-API interna) | Verificado funcionando: devuelve HTML parseable |
| `estadisticas` (página) | Estadísticas anuales de jinetes y entrenadores 2023–2026 | Scrapeable |
| Excel INH (`repProgramacion28.xlsx`) | Inscritos **oficiales**: reunión, llamado, hora, distancia, premio Bs/US$, y por ejemplar: número, nombre, precio, medicación, kilos, jinete, implementos, entrenador, PP | Parseable con `openpyxl`/`xlsx` — estructura verificada, 1 hoja con bloques repetidos por carrera |
| PDFs (Jockey / INH) | Respaldo del histórico | Parseables como plan B; el HTML es mejor fuente |

**Conclusión:** no existe API JSON formal, pero el scraping del HTML es viable, estable y
suficiente. Estrategia de datos: **scraper automático + importador de Excel INH**, y los datos
"en duro" solo como seed de desarrollo (el domingo 19-jul-26 completo).

**Nota ética/legal (DECIDIDO 17-jul-2026):** los datos de carreras (inscritos, resultados,
tiempos) son hechos públicos y no protegibles, pero los *pronósticos de la cátedra* son
contenido editorial de jockeypronosticos. Decisión: **se omiten los pronósticos de terceros;
la web publicará únicamente cátedra propia** (tabla `Pronostico` con `fuente = "propia"`).

---

## 3. Stack técnico (decidido)

- **Framework:** Next.js 15 (App Router) + TypeScript — frontend y backend en un solo proyecto.
- **UI:** Tailwind CSS v4 + shadcn/ui. Mobile-first, modo claro/oscuro.
- **Base de datos:** PostgreSQL en Neon (o Supabase). ORM: Prisma.
- **Scraper/importadores:** scripts TypeScript dentro del monorepo (`/scripts`), con `cheerio`
  para parsear HTML y `xlsx` para el Excel del INH. Ejecutables por CLI y desde el panel admin.
- **Automatización:** GitHub Actions cron (lunes por la tarde, cuando publican inscripciones;
  reintentos martes) — gratis.
- **Deploy:** Vercel (hobby, $0) + Neon (free tier, $0). Dominio propio cuando se decida el nombre.
- **Auth (solo admin en MVP):** Auth.js con credencial única de administrador.

### Estructura del repositorio

```
Hipismo/
├── app/                    # Next.js App Router
│   ├── (public)/
│   │   ├── page.tsx                  # Portada: selector de fecha + próxima reunión
│   │   ├── programa/[fecha]/         # Día: tabs Carreras | Compromisos | Inscritos | Favoritos
│   │   ├── carrera/[fecha]/[nro]/    # Detalle de carrera + retrospectos
│   │   ├── estadisticas/[año]/       # Jinetes y entrenadores
│   │   ├── caballo/[slug]/           # Ficha de ejemplar (campaña completa)
│   │   ├── jinete/[slug]/  entrenador/[slug]/
│   ├── admin/              # Panel privado (importar Excel, correr scraper, editar, retirados)
│   └── api/                # Route handlers (JSON interno + webhook del cron)
├── components/             # UI compartida
├── lib/                    # db, parsers, utilidades
├── scripts/
│   ├── scrape-jockey.ts    # programación + retrospectos + estadísticas
│   ├── import-inh-xlsx.ts  # Excel oficial INH
│   └── seed.ts             # data dura 19-jul-26
├── prisma/schema.prisma
└── webEjemplo/  dataScrapping/   # material de referencia (no se despliega)
```

---

## 4. Modelo de datos (núcleo)

```
Hipodromo      (id, nombre, ciudad)                        # La Rinconada; extensible a Valencia
Reunion        (id, hipodromoId, fecha, nroReunion, estado: programada|corrida)
Carrera        (id, reunionId, nroCarrera, hora, distancia, superficie, condicion,
                nombreClasico?, grado?, premioBs, premioUsd, record?)
Ejemplar       (id, nombre, slug, sexo, edad, padre, madre, abueloMaterno, colorPelaje?)
Jinete         (id, nombre, slug)      Entrenador (id, nombre, slug)
Stud           (id, nombre)            Haras?     # como campo del ejemplar por ahora
Inscripcion    (id, carreraId, ejemplarId, nroPuesto, pp, jineteId, entrenadorId, studId,
                kilos, medicacion, implementos, precioUsd?, retirado: bool, descarte?)
Actuacion      (id, ejemplarId, fecha, carreraRef, distancia, pesoCorporal?, parciales,
                tiempo, lote, sr?, pp, pasos, posFinal, cuerpos, jineteId, kilos,
                dividendo, ganador, segundo, tercero, videoUrl?)   # el retrospecto
Pronostico     (id, carreraId, fuente, seleccion1..3)     # cátedra propia o de terceros
EstadisticaAnual  # vista/materialización calculada desde Actuacion + Inscripcion
Articulo       (id, titulo, slug, cuerpo, autor, publicadoEn)   # FUTURO revista — tabla ya prevista
```

Claves de diseño: `Actuacion` es la tabla que acumula el **histórico propio** — cada semana
que pasa, el scraper de resultados la engorda y la dependencia de la web externa disminuye.
Todo lo importado guarda `fuente` y `raw` (JSON) para poder re-procesar sin re-scrapear.

---

## 5. Diseño visual

- **Identidad:** paleta vinotinto/dorado sobre fondos neutros (Venezuela + hípica clásica),
  tipografía editorial para títulos (estilo revista) y tabular para datos.
- **Referencias:** densidad informativa de jockeypronosticos + jerarquía visual y navegación
  de Racing TV / At The Races: cards de carrera, chips de favoritos con el número del ejemplar
  en su color de gualdrapa (1 rojo, 2 blanco, 3 azul... estándar venezolano), badges de
  clásicos G1 destacados.
- **Páginas clave del MVP:** portada con la próxima reunión, programa del día con tabs,
  detalle de carrera con retrospecto colapsable por ejemplar, estadísticas con tablas
  ordenables, fichas de caballo/jinete/entrenador.
- **Publicidad (futuro):** el layout reserva desde ya slots estándar (leaderboard bajo el
  header, MPU lateral en desktop, banner entre carreras) para no rediseñar después.

---

## 6. Fases de ejecución

### Fase 0 — Fundación ✅ (completada 17-jul-2026)
Next.js 15 + Tailwind + Prisma 7 + PostgreSQL 16 en Docker (puerto 5433). Esquema completo
en `prisma/schema.prisma`. Seed con la Reunión 28 real (19-jul-26) extraída del Excel del
INH por `dataScrapping/extract_xlsx.py` → 15 carreras, 152 inscritos, 46 jinetes,
57 entrenadores. Portada provisional consultando la BD. Build verde. Git inicializado.
Guías: `README.md` (local) y `SETUP.md` (repo GitHub, Neon, Vercel).

### Fase 1 — MVP visual ✅ (completada 17-jul-2026)
Portada con selector de reuniones, programa del día (tabs: Carreras, Inscritos, Compromisos),
detalle de carrera con retrospecto por ejemplar (vacío hasta Fase 2). Identidad
vinotinto/dorado + Playfair Display, dark mode, gualdrapas de colores, slots de publicidad.
El tab Favoritos se sustituirá por la cátedra propia cuando exista.

### Fase 2 — Ingesta de datos ✅ (completada 17-jul-2026)
1. `scripts/import-inh-xlsx.ts`: importa el Excel oficial del INH (fuente de verdad para
   inscripciones: jinete, kilos, medicación, implementos, premios).
2. `scripts/scrape-jockey.ts`: scrapea jockeypronosticos — programación, pedigrí, studs,
   retirados (con motivo), y el retrospecto completo → tabla `Actuacion` (921 actuaciones
   en la primera corrida). Matching de nombres INH↔web con desambiguación por iniciales;
   los nombres display (con acentos) se guardan en `nombreCorto`. Idempotente.
   Pronósticos de terceros NO se scrapean (cátedra propia).
3. Cron GitHub Actions (`.github/workflows/scraper.yml`): martes 6pm VET (publicación de
   inscripciones) + miércoles 6pm VET de reintento con `--notify` — si tras el miércoles
   no hay reunión próxima con inscritos (o el scraper falla), avisa por correo a
   gabrielcaraballo1907@gmail.com vía SMTP (nodemailer).
   Pendiente de Fase 3: scrapear estadísticas anuales 2023+.

### Fase 3 — Resultados, estadísticas y panel admin ✅ (completada 17-jul-2026)
Modelo `Resultado` vinculado a `Carrera` + `Inscripcion`. Panel admin (`/admin`) con
autenticación por cookie (`ADMIN_SECRET`): dashboard de reuniones, carga manual de
resultados por carrera (posiciones + tiempo del ganador), generación automática de
`Actuacion` al guardar resultados, marcado de reunión como `CORRIDA`. Vista pública:
tab "Resultados" en programa del día con resumen podio, banner de podio en detalle de
carrera con posiciones de llegada ordenadas, badges de posición (oro/plata/bronce).
Página de estadísticas anuales (`/estadisticas/[year]`) calculadas en tiempo real:
jinetes, entrenadores y ejemplares con victorias, 2dos, 3ros, montas, % efectividad.
Pendiente para futuro: fichas individuales de caballo/jinete/entrenador, scraping de
estadísticas históricas 2023+, cuerpos/dividendos en resultados.

### Fase 4 — Panel admin avanzado (1–2 sesiones)
Auth.js con credencial, subir Excel/PDF, disparar scraper, marcar retirados, editar
datos, log de importaciones. (El admin básico ya existe desde Fase 3.)

### Fase 5 — Deploy y dominio
Vercel + Neon, dominio propio, Analytics, sitemap/SEO (metadatos por carrera y fecha — clave
para captar búsquedas "programa la rinconada domingo").

### Futuro (mencionado, no detallado)
- **Revista:** sección de artículos con mini-CMS (tabla `Articulo` ya prevista); edición semanal.
- **Funcionalidades únicas:** alertas de inscripciones de un caballo seguido, comparador de
  campañas, ratings propios, resultados en vivo, videos.
- **Monetización:** publicidad en los slots reservados; luego membresía premium (estadísticas
  avanzadas, cátedra propia).
- **Apuestas:** solo la idea — la base (usuarios, datos confiables, tiempo real) quedará lista;
  requerirá licencias y pasarela de pagos. No se diseña en este plan.

---

## 7. Riesgos

| Riesgo | Mitigación |
|---|---|
| jockeypronosticos cambia su HTML o bloquea | Guardar `raw` de cada scrape; el Excel INH cubre inscritos; el histórico propio crece semana a semana |
| Pronósticos de terceros = contenido editorial ajeno | Decidir antes de producción: omitir, acreditar o cátedra propia |
| Free tiers con límites | Datos son pequeños (~15 carreras/semana); Neon/Vercel sobran para años |
| PDF del INH cambia de formato | El importador valida y reporta errores en vez de fallar silencioso |
```
