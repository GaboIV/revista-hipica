<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# Proyecto: Revista Hipica de Venezuela

- Vision, fases y modelo de datos: ver PLAN.md. Guia de repo/deploy: SETUP.md.
- BD: PostgreSQL en Docker (`docker compose up -d`, puerto 5433). Prisma 7 con driver adapter (`src/lib/db.ts`); el cliente se genera en `src/generated/prisma` (no commiteado).
- Seed real de la Reunion 28 del INH: `npx prisma db seed` (idempotente).
- Regla del proyecto: NO publicar pronosticos de terceros; solo catedra propia.
- Todo el contenido de la web va en espanol (es-VE).
