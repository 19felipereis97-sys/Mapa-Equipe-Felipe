-- DropIndex
DROP INDEX "deadlines_obligationId_key";

-- AlterTable
ALTER TABLE "deadlines" ADD COLUMN "taxRegimeId" INTEGER;

-- CreateIndex
CREATE UNIQUE INDEX "deadlines_obligationId_taxRegimeId_key" ON "deadlines"("obligationId", "taxRegimeId");

-- AddForeignKey
ALTER TABLE "deadlines" ADD CONSTRAINT "deadlines_taxRegimeId_fkey" FOREIGN KEY ("taxRegimeId") REFERENCES "tax_regimes"("id") ON DELETE CASCADE ON UPDATE CASCADE;
