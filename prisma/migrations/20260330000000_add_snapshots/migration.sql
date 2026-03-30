-- CreateTable
CREATE TABLE "YfTournamentSnapshot" (
    "id" TEXT NOT NULL,
    "tournamentId" TEXT NOT NULL,
    "data" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "YfTournamentSnapshot_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "YfTournamentSnapshot_tournamentId_createdAt_idx" ON "YfTournamentSnapshot"("tournamentId", "createdAt");

-- AddForeignKey
ALTER TABLE "YfTournamentSnapshot" ADD CONSTRAINT "YfTournamentSnapshot_tournamentId_fkey" FOREIGN KEY ("tournamentId") REFERENCES "YfTournament"("id") ON DELETE CASCADE ON UPDATE CASCADE;
