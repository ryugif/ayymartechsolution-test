-- DropIndex
DROP INDEX "Project_userId_updatedAt_idx";

-- AlterTable
ALTER TABLE "Project" ADD COLUMN     "archivedAt" TIMESTAMP(3);

-- CreateIndex
CREATE INDEX "Project_userId_updatedAt_archivedAt_idx" ON "Project"("userId", "updatedAt", "archivedAt");
