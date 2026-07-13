-- AlterTable
ALTER TABLE "OrdemCompra" ADD COLUMN     "clientRef" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "OrdemCompra_tenantId_clientRef_key" ON "OrdemCompra"("tenantId", "clientRef");

