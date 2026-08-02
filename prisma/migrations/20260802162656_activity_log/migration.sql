-- CreateTable
CREATE TABLE "activity_log" (
    "id" SERIAL NOT NULL,
    "actorId" INTEGER,
    "actorPhone" TEXT NOT NULL,
    "actorRole" "Role",
    "action" TEXT NOT NULL,
    "targetType" TEXT,
    "targetLabel" TEXT,
    "summary" TEXT NOT NULL,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "activity_log_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "activity_log_createdAt_idx" ON "activity_log"("createdAt");

-- CreateIndex
CREATE INDEX "activity_log_actorId_createdAt_idx" ON "activity_log"("actorId", "createdAt");

-- CreateIndex
CREATE INDEX "activity_log_action_createdAt_idx" ON "activity_log"("action", "createdAt");

-- AddForeignKey
ALTER TABLE "activity_log" ADD CONSTRAINT "activity_log_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
