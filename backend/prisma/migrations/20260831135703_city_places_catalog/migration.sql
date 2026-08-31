-- CreateEnum
CREATE TYPE "CityPlaceKind" AS ENUM ('LANDMARK', 'GENERIC');

-- DropForeignKey
ALTER TABLE "case_city_places" DROP CONSTRAINT "case_city_places_place_type_id_fkey";

-- AlterTable
ALTER TABLE "case_city_places" ADD COLUMN     "city_place_id" INTEGER,
ALTER COLUMN "place_type_id" DROP NOT NULL;

-- CreateTable
CREATE TABLE "city_places" (
    "id" SERIAL NOT NULL,
    "city_id" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "kind" "CityPlaceKind" NOT NULL DEFAULT 'GENERIC',
    "interaction_style" TEXT NOT NULL,

    CONSTRAINT "city_places_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "city_places_city_id_idx" ON "city_places"("city_id");

-- CreateIndex
CREATE UNIQUE INDEX "city_places_city_id_name_key" ON "city_places"("city_id", "name");

-- AddForeignKey
ALTER TABLE "city_places" ADD CONSTRAINT "city_places_city_id_fkey" FOREIGN KEY ("city_id") REFERENCES "cities"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "case_city_places" ADD CONSTRAINT "case_city_places_place_type_id_fkey" FOREIGN KEY ("place_type_id") REFERENCES "place_types"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "case_city_places" ADD CONSTRAINT "case_city_places_city_place_id_fkey" FOREIGN KEY ("city_place_id") REFERENCES "city_places"("id") ON DELETE SET NULL ON UPDATE CASCADE;
