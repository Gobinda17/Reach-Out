-- CreateTable
CREATE TABLE "calls" (
    "id" SERIAL NOT NULL,
    "tagId" INTEGER NOT NULL,
    "initiatedById" INTEGER,
    "provider" TEXT NOT NULL,
    "virtualNumber" TEXT NOT NULL,
    "providerCallId" TEXT,
    "status" TEXT NOT NULL DEFAULT 'allocated',
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "calls_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "calls_initiatedById_createdAt_idx" ON "calls"("initiatedById", "createdAt");

-- CreateIndex
CREATE INDEX "calls_tagId_createdAt_idx" ON "calls"("tagId", "createdAt");

-- AddForeignKey
ALTER TABLE "calls" ADD CONSTRAINT "calls_tagId_fkey" FOREIGN KEY ("tagId") REFERENCES "tags"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "calls" ADD CONSTRAINT "calls_initiatedById_fkey" FOREIGN KEY ("initiatedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
