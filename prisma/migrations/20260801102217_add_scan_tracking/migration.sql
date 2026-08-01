-- AlterTable
ALTER TABLE "scan_messages" ADD COLUMN     "fromUserId" INTEGER;

-- CreateTable
CREATE TABLE "scans" (
    "id" SERIAL NOT NULL,
    "tagId" INTEGER NOT NULL,
    "scannedById" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "scans_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "scans_scannedById_createdAt_idx" ON "scans"("scannedById", "createdAt");

-- CreateIndex
CREATE INDEX "scans_tagId_createdAt_idx" ON "scans"("tagId", "createdAt");

-- CreateIndex
CREATE INDEX "scan_messages_fromUserId_createdAt_idx" ON "scan_messages"("fromUserId", "createdAt");

-- AddForeignKey
ALTER TABLE "scan_messages" ADD CONSTRAINT "scan_messages_fromUserId_fkey" FOREIGN KEY ("fromUserId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "scans" ADD CONSTRAINT "scans_tagId_fkey" FOREIGN KEY ("tagId") REFERENCES "tags"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "scans" ADD CONSTRAINT "scans_scannedById_fkey" FOREIGN KEY ("scannedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
