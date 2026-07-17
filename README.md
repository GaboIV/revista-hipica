# Revista Hípica de Venezuela

Web moderna de programación, retrospectos y estadísticas del hipismo venezolano
(La Rinconada), con aspiración de convertirse en la revista hípica semanal digital
del país. Ver [PLAN.md](PLAN.md) para la visión completa y las fases, y
[SETUP.md](SETUP.md) para el paso a paso de repo, base de datos en la nube y deploy.

## Stack

- **Next.js 15** (App Router) + TypeScript + Tailwind CSS
- **PostgreSQL** (local: Docker · producción: Neon) + **Prisma 7** (driver adapter pg)
- Scraper e importadores en TypeScript (`/scripts`, Fase 2)

## Arrancar en local

Requisitos: Node 20+, Docker Desktop.

```bash
npm install
cp .env.example .env          # la URL local ya viene lista
docker compose up -d           # PostgreSQL 16 en localhost:5433
npx prisma migrate dev         # crea las tablas
npx prisma db seed             # carga la Reunión 28 (19-jul-2026) real del INH
npm run dev                    # http://localhost:3000
```

Comandos útiles:

| Comando | Qué hace |
|---|---|
| `npm run db:migrate` | Aplica cambios del schema (crea migración) |
| `npm run db:seed` | Vuelve a ejecutar el seed (es idempotente) |
| `npm run db:studio` | Explorador visual de la base de datos |
| `npm run build` | Build de producción |
| `npx tsx scripts/scrape-jockey.ts` | Scraper de programación y retrospectos |
| `npx tsx scripts/import-inh-xlsx.ts <archivo.xlsx>` | Importa el Excel oficial del INH |

## Estructura

```
src/app/            Páginas (App Router) — portada provisional de Fase 0
src/lib/db.ts       Cliente Prisma singleton
src/generated/      Cliente Prisma generado (no se commitea; `npx prisma generate`)
prisma/schema.prisma  Modelo de datos (ver PLAN.md §4)
prisma/seed.ts      Seed con data real de la Reunión 28
prisma/seed-data/   JSON extraído del Excel oficial del INH
dataScrapping/      Material fuente (Excel/PDF INH) + extractor Python
webEjemplo/         Capturas y PDFs de la web de referencia (solo consulta)
```

## Datos

- **Inscritos oficiales:** Excel del INH (`dataScrapping/extract_xlsx.py` lo convierte a JSON).
- **Histórico/retrospectos:** scraper de la web de referencia (Fase 2); la tabla `Actuacion`
  acumula histórico propio semana a semana.
- **Pronósticos:** solo cátedra propia — no se publican pronósticos de terceros.

- ✅ Fase 0 — Fundación: scaffold, esquema BD, seed real, build verde.
- ✅ Fase 1 — MVP visual: portada, programa con tabs, detalle de carrera.
- ✅ Fase 2 — Ingesta: importador Excel INH, scraper con retrospectos (tabla `Actuacion`), cron martes/miércoles con aviso por correo.
- ✅ Fase 3 — Resultados, estadísticas y panel admin: modelo `Resultado`, panel de administración básico (`/admin`) para cargar resultados manualmente, generación de actuaciones en cascada, vistas de resultados (podios y badges) y página de estadísticas en tiempo real.
- ✅ Fase 4 — Panel admin avanzado: Ingesta de Excel y ejecución del scraper Jockey desde el panel web, refactorización de lógica compartida a `src/lib/`, y gestión interactiva de ejemplares retirados con actualización dinámica de base de datos y limpieza de resultados/actuaciones.
- ⬜ Fase 5 — Deploy y dominio: Vercel + Neon, dominio propio, sitemaps, SEO optimizado para búsquedas.


## Panel de Administración

Para acceder localmente al panel de administración:
1. Asegúrate de configurar `ADMIN_SECRET` en tu archivo `.env`. (Por defecto en desarrollo: `admin123`)
2. Entra a `/admin` y digita la contraseña configurada.
3. Desde allí podrás gestionar las reuniones y cargar las posiciones de llegada y tiempos de los ganadores de cada carrera.

