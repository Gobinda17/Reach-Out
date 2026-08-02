-- CreateEnum
CREATE TYPE "TagRequestStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

-- AlterTable
ALTER TABLE "tags" ADD COLUMN     "assignedAt" TIMESTAMP(3),
ADD COLUMN     "assignedToId" INTEGER,
ADD COLUMN     "requestId" INTEGER;

-- CreateTable
CREATE TABLE "tag_requests" (
    "id" SERIAL NOT NULL,
    "sellerId" INTEGER NOT NULL,
    "product" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL,
    "note" TEXT,
    "status" "TagRequestStatus" NOT NULL DEFAULT 'PENDING',
    "decidedById" INTEGER,
    "decidedAt" TIMESTAMP(3),
    "decisionNote" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "tag_requests_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "tag_requests_sellerId_createdAt_idx" ON "tag_requests"("sellerId", "createdAt");

-- CreateIndex
CREATE INDEX "tag_requests_status_createdAt_idx" ON "tag_requests"("status", "createdAt");

-- CreateIndex
CREATE INDEX "tags_assignedToId_createdAt_idx" ON "tags"("assignedToId", "createdAt");

-- AddForeignKey
ALTER TABLE "tag_requests" ADD CONSTRAINT "tag_requests_sellerId_fkey" FOREIGN KEY ("sellerId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tag_requests" ADD CONSTRAINT "tag_requests_decidedById_fkey" FOREIGN KEY ("decidedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tags" ADD CONSTRAINT "tags_assignedToId_fkey" FOREIGN KEY ("assignedToId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tags" ADD CONSTRAINT "tags_requestId_fkey" FOREIGN KEY ("requestId") REFERENCES "tag_requests"("id") ON DELETE SET NULL ON UPDATE CASCADE;
