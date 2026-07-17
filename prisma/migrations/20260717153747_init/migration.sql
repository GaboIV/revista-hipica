-- CreateEnum
CREATE TYPE "EstadoReunion" AS ENUM ('PROGRAMADA', 'CORRIDA', 'SUSPENDIDA');

-- CreateTable
CREATE TABLE "Hipodromo" (
    "id" SERIAL NOT NULL,
    "nombre" TEXT NOT NULL,
    "ciudad" TEXT,

    CONSTRAINT "Hipodromo_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Reunion" (
    "id" SERIAL NOT NULL,
    "hipodromoId" INTEGER NOT NULL,
    "fecha" DATE NOT NULL,
    "nroReunion" INTEGER,
    "estado" "EstadoReunion" NOT NULL DEFAULT 'PROGRAMADA',

    CONSTRAINT "Reunion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Carrera" (
    "id" SERIAL NOT NULL,
    "reunionId" INTEGER NOT NULL,
    "nroCarrera" INTEGER NOT NULL,
    "nroLlamado" INTEGER,
    "nroAnual" INTEGER,
    "hora" TEXT,
    "distancia" INTEGER NOT NULL,
    "superficie" TEXT NOT NULL DEFAULT 'Arena',
    "condicion" TEXT,
    "nombreClasico" TEXT,
    "grado" TEXT,
    "premioBs" DECIMAL(14,2),
    "premioUsd" DECIMAL(14,2),
    "record" TEXT,

    CONSTRAINT "Carrera_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Ejemplar" (
    "id" SERIAL NOT NULL,
    "nombre" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "sexo" TEXT,
    "padre" TEXT,
    "madre" TEXT,
    "abueloMaterno" TEXT,

    CONSTRAINT "Ejemplar_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Jinete" (
    "id" SERIAL NOT NULL,
    "nombre" TEXT NOT NULL,
    "nombreCorto" TEXT,
    "slug" TEXT NOT NULL,

    CONSTRAINT "Jinete_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Entrenador" (
    "id" SERIAL NOT NULL,
    "nombre" TEXT NOT NULL,
    "nombreCorto" TEXT,
    "slug" TEXT NOT NULL,

    CONSTRAINT "Entrenador_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Stud" (
    "id" SERIAL NOT NULL,
    "nombre" TEXT NOT NULL,

    CONSTRAINT "Stud_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Inscripcion" (
    "id" SERIAL NOT NULL,
    "carreraId" INTEGER NOT NULL,
    "ejemplarId" INTEGER NOT NULL,
    "jineteId" INTEGER,
    "entrenadorId" INTEGER,
    "studId" INTEGER,
    "nroPuesto" INTEGER NOT NULL,
    "pp" INTEGER,
    "kilos" DECIMAL(4,1),
    "descargo" INTEGER,
    "edad" INTEGER,
    "medicacion" TEXT,
    "implementos" TEXT,
    "precioUsd" DECIMAL(12,2),
    "retirado" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "Inscripcion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Actuacion" (
    "id" SERIAL NOT NULL,
    "ejemplarId" INTEGER NOT NULL,
    "jineteId" INTEGER,
    "fecha" DATE NOT NULL,
    "hipodromo" TEXT NOT NULL DEFAULT 'La Rinconada',
    "distancia" INTEGER,
    "pesoCorporal" INTEGER,
    "parciales" TEXT,
    "tiempo" TEXT,
    "lote" TEXT,
    "sr" INTEGER,
    "pp" INTEGER,
    "pasos" TEXT,
    "posFinal" INTEGER,
    "nroInscritos" INTEGER,
    "cuerpos" TEXT,
    "kilos" DECIMAL(4,1),
    "dividendo" TEXT,
    "ganador" TEXT,
    "segundo" TEXT,
    "tercero" TEXT,
    "videoUrl" TEXT,
    "fuente" TEXT,
    "raw" JSONB,

    CONSTRAINT "Actuacion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Pronostico" (
    "id" SERIAL NOT NULL,
    "carreraId" INTEGER NOT NULL,
    "fuente" TEXT NOT NULL DEFAULT 'propia',
    "seleccion1" INTEGER,
    "seleccion2" INTEGER,
    "seleccion3" INTEGER,
    "comentario" TEXT,

    CONSTRAINT "Pronostico_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Articulo" (
    "id" SERIAL NOT NULL,
    "titulo" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "resumen" TEXT,
    "cuerpo" TEXT NOT NULL,
    "autor" TEXT,
    "portadaUrl" TEXT,
    "publicadoEn" TIMESTAMP(3),
    "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Articulo_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Hipodromo_nombre_key" ON "Hipodromo"("nombre");

-- CreateIndex
CREATE UNIQUE INDEX "Reunion_hipodromoId_fecha_key" ON "Reunion"("hipodromoId", "fecha");

-- CreateIndex
CREATE UNIQUE INDEX "Carrera_reunionId_nroCarrera_key" ON "Carrera"("reunionId", "nroCarrera");

-- CreateIndex
CREATE UNIQUE INDEX "Ejemplar_nombre_key" ON "Ejemplar"("nombre");

-- CreateIndex
CREATE UNIQUE INDEX "Ejemplar_slug_key" ON "Ejemplar"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "Jinete_nombre_key" ON "Jinete"("nombre");

-- CreateIndex
CREATE UNIQUE INDEX "Jinete_slug_key" ON "Jinete"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "Entrenador_nombre_key" ON "Entrenador"("nombre");

-- CreateIndex
CREATE UNIQUE INDEX "Entrenador_slug_key" ON "Entrenador"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "Stud_nombre_key" ON "Stud"("nombre");

-- CreateIndex
CREATE UNIQUE INDEX "Inscripcion_carreraId_nroPuesto_key" ON "Inscripcion"("carreraId", "nroPuesto");

-- CreateIndex
CREATE UNIQUE INDEX "Actuacion_ejemplarId_fecha_key" ON "Actuacion"("ejemplarId", "fecha");

-- CreateIndex
CREATE UNIQUE INDEX "Pronostico_carreraId_fuente_key" ON "Pronostico"("carreraId", "fuente");

-- CreateIndex
CREATE UNIQUE INDEX "Articulo_slug_key" ON "Articulo"("slug");

-- AddForeignKey
ALTER TABLE "Reunion" ADD CONSTRAINT "Reunion_hipodromoId_fkey" FOREIGN KEY ("hipodromoId") REFERENCES "Hipodromo"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Carrera" ADD CONSTRAINT "Carrera_reunionId_fkey" FOREIGN KEY ("reunionId") REFERENCES "Reunion"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Inscripcion" ADD CONSTRAINT "Inscripcion_carreraId_fkey" FOREIGN KEY ("carreraId") REFERENCES "Carrera"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Inscripcion" ADD CONSTRAINT "Inscripcion_ejemplarId_fkey" FOREIGN KEY ("ejemplarId") REFERENCES "Ejemplar"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Inscripcion" ADD CONSTRAINT "Inscripcion_jineteId_fkey" FOREIGN KEY ("jineteId") REFERENCES "Jinete"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Inscripcion" ADD CONSTRAINT "Inscripcion_entrenadorId_fkey" FOREIGN KEY ("entrenadorId") REFERENCES "Entrenador"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Inscripcion" ADD CONSTRAINT "Inscripcion_studId_fkey" FOREIGN KEY ("studId") REFERENCES "Stud"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Actuacion" ADD CONSTRAINT "Actuacion_ejemplarId_fkey" FOREIGN KEY ("ejemplarId") REFERENCES "Ejemplar"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Actuacion" ADD CONSTRAINT "Actuacion_jineteId_fkey" FOREIGN KEY ("jineteId") REFERENCES "Jinete"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Pronostico" ADD CONSTRAINT "Pronostico_carreraId_fkey" FOREIGN KEY ("carreraId") REFERENCES "Carrera"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
