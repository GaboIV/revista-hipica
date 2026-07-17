# SETUP — Paso a paso: repo, base de datos en la nube y deploy

> Guía para publicar el proyecto. El desarrollo local ya funciona con lo descrito
> en [README.md](README.md). Sigue estos pasos cuando quieras crear el repo en
> GitHub y (más adelante, Fase 5) desplegar en Vercel + Neon.

---

## 1. Crear el repositorio en GitHub

El proyecto ya tiene git inicializado y un commit inicial. Solo falta conectarlo:

1. Entra a https://github.com/new
2. Nombre sugerido: `revista-hipica` (o el nombre definitivo cuando lo decidas).
   **Privado** por ahora.
3. NO marques "Add README" ni ".gitignore" (ya existen aquí).
4. Copia la URL del repo y en la carpeta del proyecto ejecuta:

```bash
git remote add origin https://github.com/GaboIV/revista-hipica.git
git push -u origin main
```

### Qué se sube y qué no

- `.env` **no se sube** (está en `.gitignore`) — contiene credenciales.
  `.env.example` sí se sube como plantilla.
- `src/generated/` (cliente Prisma) no se sube; se regenera con `npx prisma generate`.
- `webEjemplo/` y `dataScrapping/` sí se suben (son material de referencia del proyecto).
  Si prefieres no subir los PDFs pesados, agrega `webEjemplo/` al `.gitignore` antes del push.

---

## 2. Clonar en otra máquina (o si alguien más colabora)

```bash
git clone https://github.com/GaboIV/revista-hipica.git
cd revista-hipica
npm install
cp .env.example .env
docker compose up -d
npx prisma migrate dev      # aplica las migraciones ya versionadas
npx prisma db seed
npm run dev
```

---

## 3. Base de datos en la nube — Neon (cuando toque, Fase 5)

1. Cuenta gratis en https://neon.tech (login con GitHub).
2. Crear proyecto → nombre `hipismo` → región AWS us-east (la más cercana).
3. Copia el **connection string** (algo como
   `postgresql://user:pass@ep-xxx.us-east-2.aws.neon.tech/neondb?sslmode=require`).
4. Para aplicar el esquema y seed a Neon desde tu máquina:

```bash
# temporalmente apunta DATABASE_URL a Neon en tu .env, luego:
npx prisma migrate deploy
npx prisma db seed
# devuelve DATABASE_URL a la URL local al terminar
```

> Consejo: cuando haya deploy real, mantén dos archivos — `.env` (local) y las
> variables de entorno en Vercel (producción). Nunca commitees credenciales.

---

## 4. Deploy en Vercel (Fase 5)

1. Cuenta gratis en https://vercel.com (login con GitHub).
2. "Add New Project" → importar el repo `revista-hipica`.
3. Framework: detecta Next.js solo. Sin configuración extra de build.
4. En **Environment Variables** agrega:
   - `DATABASE_URL` = el connection string de Neon.
5. Antes del primer deploy, agrega el postinstall para generar el cliente Prisma
   (si no está ya): en `package.json` → `"scripts"`:
   ```json
   "postinstall": "prisma generate"
   ```
6. Deploy. Cada `git push` a `main` re-despliega automático.
7. Dominio propio: Vercel → Settings → Domains (cuando tengas el nombre definitivo).

---

## 5. Cron del scraper (Fase 2, referencia futura)

El scraper correrá como GitHub Action programada (lunes 6pm hora Venezuela,
reintento martes). Necesitará el secret `DATABASE_URL` en:
repo → Settings → Secrets and variables → Actions.

---

## 6. Recordatorios de decisiones

- **Pronósticos:** solo cátedra propia. No publicar pronósticos de terceros.
- **Publicidad:** el layout de Fase 1 reserva slots (leaderboard, MPU, inter-carreras).
- **Apuestas:** idea a largo plazo; nada se diseña aún.
- La bitácora completa del proyecto y sus fases vive en [PLAN.md](PLAN.md).
