-- CreateTable
CREATE TABLE "companies" (
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
    CONSTRAINT "companies_mitResponsibleId_fkey" FOREIGN KEY ("mitResponsibleId") REFERENCES "professionals" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "company_tax_regimes" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "companyId" INTEGER NOT NULL,
    "accountingYearId" INTEGER NOT NULL,
    "taxRegimeId" INTEGER NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "company_tax_regimes_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "company_tax_regimes_accountingYearId_fkey" FOREIGN KEY ("accountingYearId") REFERENCES "accounting_years" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "company_tax_regimes_taxRegimeId_fkey" FOREIGN KEY ("taxRegimeId") REFERENCES "tax_regimes" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "company_tax_regimes_companyId_accountingYearId_key" ON "company_tax_regimes"("companyId", "accountingYearId");
