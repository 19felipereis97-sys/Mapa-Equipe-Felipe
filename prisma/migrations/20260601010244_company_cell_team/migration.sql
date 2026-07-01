-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_companies" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "code" TEXT,
    "groupName" TEXT,
    "document" TEXT,
    "corporateName" TEXT NOT NULL,
    "companyType" TEXT,
    "unit" TEXT,
    "startCompetence" TEXT,
    "levelId" INTEGER,
    "operationService" BOOLEAN NOT NULL DEFAULT false,
    "operationCommerce" BOOLEAN NOT NULL DEFAULT false,
    "operationIndustry" BOOLEAN NOT NULL DEFAULT false,
    "irRent" BOOLEAN NOT NULL DEFAULT false,
    "openingCompany" BOOLEAN NOT NULL DEFAULT false,
    "openingDate" TEXT,
    "financialResponsibleId" INTEGER,
    "dpResponsibleId" INTEGER,
    "fiscalResponsibleId" INTEGER,
    "analysisResponsibleId" INTEGER,
    "reviewResponsibleId" INTEGER,
    "irRentResponsibleId" INTEGER,
    "mitResponsibleId" INTEGER,
    "cellTeamId" INTEGER,
    "cell" TEXT,
    "terminated" BOOLEAN NOT NULL DEFAULT false,
    "terminationMonth" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "companies_levelId_fkey" FOREIGN KEY ("levelId") REFERENCES "levels" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "companies_financialResponsibleId_fkey" FOREIGN KEY ("financialResponsibleId") REFERENCES "professionals" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "companies_dpResponsibleId_fkey" FOREIGN KEY ("dpResponsibleId") REFERENCES "professionals" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "companies_fiscalResponsibleId_fkey" FOREIGN KEY ("fiscalResponsibleId") REFERENCES "professionals" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "companies_analysisResponsibleId_fkey" FOREIGN KEY ("analysisResponsibleId") REFERENCES "professionals" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "companies_reviewResponsibleId_fkey" FOREIGN KEY ("reviewResponsibleId") REFERENCES "professionals" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "companies_irRentResponsibleId_fkey" FOREIGN KEY ("irRentResponsibleId") REFERENCES "professionals" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "companies_mitResponsibleId_fkey" FOREIGN KEY ("mitResponsibleId") REFERENCES "professionals" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "companies_cellTeamId_fkey" FOREIGN KEY ("cellTeamId") REFERENCES "teams" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_companies" ("analysisResponsibleId", "cell", "code", "companyType", "corporateName", "createdAt", "document", "dpResponsibleId", "financialResponsibleId", "fiscalResponsibleId", "groupName", "id", "irRent", "irRentResponsibleId", "levelId", "mitResponsibleId", "openingCompany", "openingDate", "operationCommerce", "operationIndustry", "operationService", "reviewResponsibleId", "startCompetence", "terminated", "terminationMonth", "unit", "updatedAt") SELECT "analysisResponsibleId", "cell", "code", "companyType", "corporateName", "createdAt", "document", "dpResponsibleId", "financialResponsibleId", "fiscalResponsibleId", "groupName", "id", "irRent", "irRentResponsibleId", "levelId", "mitResponsibleId", "openingCompany", "openingDate", "operationCommerce", "operationIndustry", "operationService", "reviewResponsibleId", "startCompetence", "terminated", "terminationMonth", "unit", "updatedAt" FROM "companies";
DROP TABLE "companies";
ALTER TABLE "new_companies" RENAME TO "companies";
CREATE INDEX "companies_terminated_idx" ON "companies"("terminated");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
