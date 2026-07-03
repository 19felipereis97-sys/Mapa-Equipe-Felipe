-- Fase 1 — índices de performance
-- Empresas: ordenação padrão e filtros (nível + responsáveis).
CREATE INDEX "companies_groupName_corporateName_idx" ON "companies"("groupName", "corporateName");
CREATE INDEX "companies_levelId_idx" ON "companies"("levelId");
CREATE INDEX "companies_financialResponsibleId_idx" ON "companies"("financialResponsibleId");
CREATE INDEX "companies_dpResponsibleId_idx" ON "companies"("dpResponsibleId");
CREATE INDEX "companies_fiscalResponsibleId_idx" ON "companies"("fiscalResponsibleId");
CREATE INDEX "companies_analysisResponsibleId_idx" ON "companies"("analysisResponsibleId");
CREATE INDEX "companies_reviewResponsibleId_idx" ON "companies"("reviewResponsibleId");
CREATE INDEX "companies_irRentResponsibleId_idx" ON "companies"("irRentResponsibleId");
CREATE INDEX "companies_mitResponsibleId_idx" ON "companies"("mitResponsibleId");

-- Trilha de auditoria de status: consultada por empresa/obrigação/período.
CREATE INDEX "activity_status_history_companyId_obligationId_year_month_idx" ON "activity_status_history"("companyId", "obligationId", "year", "month");
