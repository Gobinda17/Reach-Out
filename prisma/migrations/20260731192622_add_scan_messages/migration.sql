-- CreateTable
CREATE TABLE "scan_messages" (
    "id" SERIAL NOT NULL,
    "tagId" INTEGER NOT NULL,
    "message" TEXT NOT NULL,
    "fromName" TEXT,
    "fromPhone" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "scan_messages_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "scan_messages_tagId_createdAt_idx" ON "scan_messages"("tagId", "createdAt");

-- AddForeignKey
ALTER TABLE "scan_messages" ADD CONSTRAINT "scan_messages_tagId_fkey" FOREIGN KEY ("tagId") REFERENCES "tags"("id") ON DELETE CASCADE ON UPDATE CASCADE;
