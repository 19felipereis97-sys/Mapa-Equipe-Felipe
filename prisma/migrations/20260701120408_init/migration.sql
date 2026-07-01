-- CreateTable
CREATE TABLE "system_config" (
    "id" SERIAL NOT NULL,
    "key" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "system_config_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "teams" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "teams_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "professionals" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "teamId" INTEGER,
    "email" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "professionals_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "leaves" (
    "id" SERIAL NOT NULL,
    "professionalId" INTEGER NOT NULL,
    "startDate" TEXT NOT NULL,
    "endDate" TEXT NOT NULL,
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "leaves_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "monthly_goals" (
    "id" SERIAL NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "month" INTEGER NOT NULL,
    "year" INTEGER NOT NULL,
    "completed" BOOLEAN NOT NULL DEFAULT false,
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "monthly_goals_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "daily_goals" (
    "id" SERIAL NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "date" TEXT NOT NULL,
    "completed" BOOLEAN NOT NULL DEFAULT false,
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "daily_goals_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tax_regimes" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "color" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "tax_regimes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "levels" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "color" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "levels_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "obligations" (
    "id" SERIAL NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "group" TEXT,
    "type" TEXT NOT NULL,
    "order" INTEGER NOT NULL DEFAULT 0,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "obligations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "deadlines" (
    "id" SERIAL NOT NULL,
    "obligationId" INTEGER NOT NULL,
    "startDay" INTEGER,
    "dueDay" INTEGER NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "deadlines_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "accounting_years" (
    "id" SERIAL NOT NULL,
    "year" INTEGER NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "accounting_years_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "companies" (
    "id" SERIAL NOT NULL,
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
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "companies_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "closing_notes" (
    "id" SERIAL NOT NULL,
    "companyId" INTEGER,
    "title" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "pinned" BOOLEAN NOT NULL DEFAULT false,
    "archived" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "closing_notes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "reminders" (
    "id" SERIAL NOT NULL,
    "companyId" INTEGER,
    "text" TEXT NOT NULL,
    "remindAt" TIMESTAMP(3),
    "completed" BOOLEAN NOT NULL DEFAULT false,
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "reminders_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "activity_statuses" (
    "id" SERIAL NOT NULL,
    "companyId" INTEGER NOT NULL,
    "obligationId" INTEGER NOT NULL,
    "year" INTEGER NOT NULL,
    "month" INTEGER NOT NULL,
    "status" TEXT NOT NULL,
    "observation" TEXT,
    "responsibleId" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "activity_statuses_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "activity_status_history" (
    "id" SERIAL NOT NULL,
    "companyId" INTEGER NOT NULL,
    "obligationId" INTEGER NOT NULL,
    "year" INTEGER NOT NULL,
    "month" INTEGER NOT NULL,
    "previousStatus" TEXT,
    "newStatus" TEXT,
    "observation" TEXT,
    "responsibleId" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "activity_status_history_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "portal_notifications" (
    "id" SERIAL NOT NULL,
    "companyId" INTEGER NOT NULL,
    "cnpj" TEXT NOT NULL,
    "companyName" TEXT NOT NULL,
    "notificationDate" TEXT NOT NULL,
    "subject" TEXT NOT NULL,
    "urgency" TEXT NOT NULL DEFAULT 'normal',
    "batchName" TEXT NOT NULL,
    "completed" BOOLEAN NOT NULL DEFAULT false,
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "portal_notifications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "company_tax_regimes" (
    "id" SERIAL NOT NULL,
    "companyId" INTEGER NOT NULL,
    "accountingYearId" INTEGER NOT NULL,
    "taxRegimeId" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "company_tax_regimes_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "system_config_key_key" ON "system_config"("key");

-- CreateIndex
CREATE UNIQUE INDEX "obligations_code_key" ON "obligations"("code");

-- CreateIndex
CREATE UNIQUE INDEX "deadlines_obligationId_key" ON "deadlines"("obligationId");

-- CreateIndex
CREATE UNIQUE INDEX "accounting_years_year_key" ON "accounting_years"("year");

-- CreateIndex
CREATE INDEX "companies_terminated_idx" ON "companies"("terminated");

-- CreateIndex
CREATE INDEX "activity_statuses_obligationId_year_month_idx" ON "activity_statuses"("obligationId", "year", "month");

-- CreateIndex
CREATE INDEX "activity_statuses_companyId_year_idx" ON "activity_statuses"("companyId", "year");

-- CreateIndex
CREATE UNIQUE INDEX "activity_statuses_companyId_obligationId_year_month_key" ON "activity_statuses"("companyId", "obligationId", "year", "month");

-- CreateIndex
CREATE INDEX "portal_notifications_companyId_idx" ON "portal_notifications"("companyId");

-- CreateIndex
CREATE INDEX "portal_notifications_completed_idx" ON "portal_notifications"("completed");

-- CreateIndex
CREATE INDEX "company_tax_regimes_companyId_idx" ON "company_tax_regimes"("companyId");

-- CreateIndex
CREATE UNIQUE INDEX "company_tax_regimes_companyId_accountingYearId_key" ON "company_tax_regimes"("companyId", "accountingYearId");

-- AddForeignKey
ALTER TABLE "professionals" ADD CONSTRAINT "professionals_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "teams"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "leaves" ADD CONSTRAINT "leaves_professionalId_fkey" FOREIGN KEY ("professionalId") REFERENCES "professionals"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "deadlines" ADD CONSTRAINT "deadlines_obligationId_fkey" FOREIGN KEY ("obligationId") REFERENCES "obligations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "companies" ADD CONSTRAINT "companies_levelId_fkey" FOREIGN KEY ("levelId") REFERENCES "levels"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "companies" ADD CONSTRAINT "companies_financialResponsibleId_fkey" FOREIGN KEY ("financialResponsibleId") REFERENCES "professionals"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "companies" ADD CONSTRAINT "companies_dpResponsibleId_fkey" FOREIGN KEY ("dpResponsibleId") REFERENCES "professionals"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "companies" ADD CONSTRAINT "companies_fiscalResponsibleId_fkey" FOREIGN KEY ("fiscalResponsibleId") REFERENCES "professionals"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "companies" ADD CONSTRAINT "companies_analysisResponsibleId_fkey" FOREIGN KEY ("analysisResponsibleId") REFERENCES "professionals"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "companies" ADD CONSTRAINT "companies_reviewResponsibleId_fkey" FOREIGN KEY ("reviewResponsibleId") REFERENCES "professionals"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "companies" ADD CONSTRAINT "companies_irRentResponsibleId_fkey" FOREIGN KEY ("irRentResponsibleId") REFERENCES "professionals"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "companies" ADD CONSTRAINT "companies_mitResponsibleId_fkey" FOREIGN KEY ("mitResponsibleId") REFERENCES "professionals"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "companies" ADD CONSTRAINT "companies_cellTeamId_fkey" FOREIGN KEY ("cellTeamId") REFERENCES "teams"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "closing_notes" ADD CONSTRAINT "closing_notes_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reminders" ADD CONSTRAINT "reminders_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "activity_statuses" ADD CONSTRAINT "activity_statuses_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "activity_statuses" ADD CONSTRAINT "activity_statuses_obligationId_fkey" FOREIGN KEY ("obligationId") REFERENCES "obligations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "activity_statuses" ADD CONSTRAINT "activity_statuses_responsibleId_fkey" FOREIGN KEY ("responsibleId") REFERENCES "professionals"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "activity_status_history" ADD CONSTRAINT "activity_status_history_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "activity_status_history" ADD CONSTRAINT "activity_status_history_obligationId_fkey" FOREIGN KEY ("obligationId") REFERENCES "obligations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "activity_status_history" ADD CONSTRAINT "activity_status_history_responsibleId_fkey" FOREIGN KEY ("responsibleId") REFERENCES "professionals"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "portal_notifications" ADD CONSTRAINT "portal_notifications_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "company_tax_regimes" ADD CONSTRAINT "company_tax_regimes_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "company_tax_regimes" ADD CONSTRAINT "company_tax_regimes_accountingYearId_fkey" FOREIGN KEY ("accountingYearId") REFERENCES "accounting_years"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "company_tax_regimes" ADD CONSTRAINT "company_tax_regimes_taxRegimeId_fkey" FOREIGN KEY ("taxRegimeId") REFERENCES "tax_regimes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
