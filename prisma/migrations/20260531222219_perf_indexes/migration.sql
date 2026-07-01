-- CreateIndex
CREATE INDEX "activity_statuses_obligationId_year_month_idx" ON "activity_statuses"("obligationId", "year", "month");

-- CreateIndex
CREATE INDEX "activity_statuses_companyId_year_idx" ON "activity_statuses"("companyId", "year");

-- CreateIndex
CREATE INDEX "companies_terminated_idx" ON "companies"("terminated");

-- CreateIndex
CREATE INDEX "company_tax_regimes_companyId_idx" ON "company_tax_regimes"("companyId");
