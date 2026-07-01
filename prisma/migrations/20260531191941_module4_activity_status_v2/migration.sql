/*
  Warnings:

  - You are about to drop the column `obligationCode` on the `activity_statuses` table. All the data in the column will be lost.
  - Added the required column `obligationId` to the `activity_statuses` table without a default value. This is not possible if the table is not empty.

*/
-- CreateTable
CREATE TABLE "activity_status_history" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "companyId" INTEGER NOT NULL,
    "obligationId" INTEGER NOT NULL,
    "year" INTEGER NOT NULL,
    "month" INTEGER NOT NULL,
    "previousStatus" TEXT,
    "newStatus" TEXT,
    "observation" TEXT,
    "responsibleId" INTEGER,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "activity_status_history_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "activity_status_history_obligationId_fkey" FOREIGN KEY ("obligationId") REFERENCES "obligations" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "activity_status_history_responsibleId_fkey" FOREIGN KEY ("responsibleId") REFERENCES "professionals" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_activity_statuses" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "companyId" INTEGER NOT NULL,
    "obligationId" INTEGER NOT NULL,
    "year" INTEGER NOT NULL,
    "month" INTEGER NOT NULL,
    "status" TEXT NOT NULL,
    "observation" TEXT,
    "responsibleId" INTEGER,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "activity_statuses_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "activity_statuses_obligationId_fkey" FOREIGN KEY ("obligationId") REFERENCES "obligations" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "activity_statuses_responsibleId_fkey" FOREIGN KEY ("responsibleId") REFERENCES "professionals" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_activity_statuses" ("companyId", "createdAt", "id", "month", "observation", "status", "updatedAt", "year") SELECT "companyId", "createdAt", "id", "month", "observation", "status", "updatedAt", "year" FROM "activity_statuses";
DROP TABLE "activity_statuses";
ALTER TABLE "new_activity_statuses" RENAME TO "activity_statuses";
CREATE UNIQUE INDEX "activity_statuses_companyId_obligationId_year_month_key" ON "activity_statuses"("companyId", "obligationId", "year", "month");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
