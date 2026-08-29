-- CreateTable
CREATE TABLE "TeamDuplicateDismissal" (
    "id" TEXT NOT NULL,
    "miroirId" TEXT NOT NULL,
    "manuelleId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TeamDuplicateDismissal_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "TeamDuplicateDismissal_miroirId_idx" ON "TeamDuplicateDismissal"("miroirId");

-- CreateIndex
CREATE UNIQUE INDEX "TeamDuplicateDismissal_miroirId_manuelleId_key" ON "TeamDuplicateDismissal"("miroirId", "manuelleId");

-- AddForeignKey
ALTER TABLE "TeamDuplicateDismissal" ADD CONSTRAINT "TeamDuplicateDismissal_miroirId_fkey" FOREIGN KEY ("miroirId") REFERENCES "Team"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TeamDuplicateDismissal" ADD CONSTRAINT "TeamDuplicateDismissal_manuelleId_fkey" FOREIGN KEY ("manuelleId") REFERENCES "Team"("id") ON DELETE CASCADE ON UPDATE CASCADE;
