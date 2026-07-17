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

## Estado

- ✅ Fase 0 — Fundación: scaffold, esquema BD, seed real, build verde.
- ⬜ Fase 1 — MVP visual (programa del día, detalle de carrera).
- ⬜ Fase 2 — Ingesta (importador Excel INH + scraper + cron).
- ⬜ Fase 3 — Estadísticas y fichas. ⬜ Fase 4 — Admin. ⬜ Fase 5 — Deploy.
