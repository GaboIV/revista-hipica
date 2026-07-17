-- DropIndex
DROP INDEX "Actuacion_ejemplarId_fecha_key";

-- AlterTable
ALTER TABLE "Actuacion" ADD COLUMN     "carreraId" INTEGER;

-- CreateTable
CREATE TABLE "Resultado" (
    "id" SERIAL NOT NULL,
    "carreraId" INTEGER NOT NULL,
    "inscripcionId" INTEGER NOT NULL,
    "posicion" INTEGER NOT NULL,
    "tiempoGanador" TEXT,
    "cuerpos" TEXT,
    "dividendo" TEXT,
    "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Resultado_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Resultado_inscripcionId_key" ON "Resultado"("inscripcionId");

-- CreateIndex
CREATE UNIQUE INDEX "Resultado_carreraId_posicion_key" ON "Resultado"("carreraId", "posicion");

-- CreateIndex
CREATE UNIQUE INDEX "Actuacion_ejemplarId_fecha_carreraId_key" ON "Actuacion"("ejemplarId", "fecha", "carreraId");

-- AddForeignKey
ALTER TABLE "Actuacion" ADD CONSTRAINT "Actuacion_carreraId_fkey" FOREIGN KEY ("carreraId") REFERENCES "Carrera"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Resultado" ADD CONSTRAINT "Resultado_carreraId_fkey" FOREIGN KEY ("carreraId") REFERENCES "Carrera"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Resultado" ADD CONSTRAINT "Resultado_inscripcionId_fkey" FOREIGN KEY ("inscripcionId") REFERENCES "Inscripcion"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
