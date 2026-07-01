# Checklist de Testes Gerais — Mapa da Equipe

> **Como usar:** Marque cada item com ✅ (passou), ❌ (falhou) ou ⚠️ (passou com ressalvas).
> Anote o problema encontrado ao lado do item com ❌.
>
> **Pré-requisito:** Rodar `npm run db:seed-test` para popular os dados de teste.

---

## Preparação

- [ ] `npm run db:seed-test` roda sem erros
- [ ] 15 empresas com prefixo `[TESTE]` aparecem na tela Empresas
- [ ] 8 profissionais `[TESTE]` aparecem em Configurações
- [ ] 5 equipes `[TESTE]` aparecem em Configurações

---

## 1. Navegação e Sidebar

| # | Teste | Resultado | Obs |
|---|-------|-----------|-----|
| 1.1 | Clicar em cada item do menu lateral (Dashboard, Empresas, Atividades, Lembretes, Anotações, Equipe, Metas do Dia, Rescindidas, Configurações) | | |
| 1.2 | Item ativo destacado visualmente na sidebar | | |
| 1.3 | Sidebar expandida — labels dos menus visíveis | | |
| 1.4 | Sidebar recolhida — apenas ícones visíveis | | |
| 1.5 | Tooltips aparecem ao passar o mouse com sidebar recolhida | | |
| 1.6 | Estado da sidebar (expandida/recolhida) persiste ao recarregar | | |
| 1.7 | Alternar tema claro → escuro → claro | | |
| 1.8 | Tema persiste após recarregar a página | | |
| 1.9 | Sidebar no tema escuro sem problemas visuais | | |
| 1.10 | Sidebar no tema claro sem problemas visuais | | |

---

## 2. Tela Configurações

### 2.1 Profissionais
| # | Teste | Resultado | Obs |
|---|-------|-----------|-----|
| 2.1.1 | Listar profissionais — ativos e inativos aparecem | | |
| 2.1.2 | Criar novo profissional com nome, e-mail e equipe | | |
| 2.1.3 | Toast de sucesso ao criar | | |
| 2.1.4 | Editar nome e e-mail de profissional existente | | |
| 2.1.5 | Desativar profissional ativo (dialog de confirmação) | | |
| 2.1.6 | Reativar profissional inativo | | |
| 2.1.7 | Tentar salvar profissional sem nome → validação | | |
| 2.1.8 | Persistência após recarregar | | |

### 2.2 Equipes
| # | Teste | Resultado | Obs |
|---|-------|-----------|-----|
| 2.2.1 | Listar equipes existentes incluindo `[TESTE]` | | |
| 2.2.2 | Criar equipe nova | | |
| 2.2.3 | Editar nome de equipe | | |
| 2.2.4 | Excluir equipe sem profissionais vinculados | | |
| 2.2.5 | Tentar excluir equipe com profissionais → verificar comportamento | | |
| 2.2.6 | Estado vazio quando não há equipes | | |

### 2.3 Tributações
| # | Teste | Resultado | Obs |
|---|-------|-----------|-----|
| 2.3.1 | Simples Nacional, Lucro Presumido, Lucro Real, Imunes, Isentas aparecem | | |
| 2.3.2 | Criar nova tributação com nome e cor | | |
| 2.3.3 | Editar tributação existente | | |
| 2.3.4 | Excluir tributação não vinculada a empresa | | |
| 2.3.5 | Toast de sucesso em todas as operações | | |

### 2.4 Níveis
| # | Teste | Resultado | Obs |
|---|-------|-----------|-----|
| 2.4.1 | Sênior, Pleno, Master, Básico aparecem | | |
| 2.4.2 | Criar nível | | |
| 2.4.3 | Editar nível | | |
| 2.4.4 | Excluir nível | | |

### 2.5 Prazos
| # | Teste | Resultado | Obs |
|---|-------|-----------|-----|
| 2.5.1 | Prazos para todas as 11 obrigações aparecem | | |
| 2.5.2 | Editar prazo existente (mudar dueDay) | | |
| 2.5.3 | Inativar prazo | | |
| 2.5.4 | Ativar prazo inativado | | |
| 2.5.5 | Criar prazo duplicado → verificar comportamento | | |

### 2.6 Ano Contábil
| # | Teste | Resultado | Obs |
|---|-------|-----------|-----|
| 2.6.1 | Anos 2025, 2026 e 2027 aparecem | | |
| 2.6.2 | Abrir novo ano contábil | | |
| 2.6.3 | Ativar outro ano (verificar que apenas um fica ativo) | | |
| 2.6.4 | Não permite criar ano já existente | | |

---

## 3. Tela Empresas

### 3.1 Listagem e Filtros
| # | Teste | Resultado | Obs |
|---|-------|-----------|-----|
| 3.1.1 | Empresas `[TESTE]` aparecem na lista (apenas não rescindidas) | | |
| 3.1.2 | `[TESTE] Rescindida Maio LTDA` NÃO aparece na lista | | |
| 3.1.3 | `[TESTE] Rescindida Dezembro LTDA` NÃO aparece na lista | | |
| 3.1.4 | Buscar por "Alfa" → só Alfa aparece | | |
| 3.1.5 | Buscar por "[TESTE]" → todas as empresas teste | | |
| 3.1.6 | Filtrar por tributação "Lucro Real" → Ômega, Sigma, Matriz, Filial | | |
| 3.1.7 | Filtrar por nível "Master" → Ômega, Sigma, Matriz | | |
| 3.1.8 | Filtrar por responsável Fiscal → Bruno Costa | | |
| 3.1.9 | Filtrar por grupo "Grupo Teste Matriz" → Matriz + Filial | | |
| 3.1.10 | Limpar filtros → lista completa volta | | |

### 3.2 Drawer de Empresa
| # | Teste | Resultado | Obs |
|---|-------|-----------|-----|
| 3.2.1 | Clicar em empresa → drawer abre | | |
| 3.2.2 | Fechar drawer pelo X | | |
| 3.2.3 | Fechar drawer clicando fora | | |
| 3.2.4 | Drawer de `[TESTE] Sem Responsável Fiscal LTDA` — sem quebra visual | | |
| 3.2.5 | Aba Histórico exibe registros do histórico criados | | |
| 3.2.6 | Histórico de `[TESTE] Beta Serviços` mostra: null→P→OK→S/M | | |

### 3.3 CRUD
| # | Teste | Resultado | Obs |
|---|-------|-----------|-----|
| 3.3.1 | Criar empresa nova (campos obrigatórios) | | |
| 3.3.2 | Tentar criar sem razão social → validação | | |
| 3.3.3 | Editar empresa — alterar nome, responsáveis | | |
| 3.3.4 | Duplicar empresa → nova empresa com mesmos dados | | |
| 3.3.5 | Marcar empresa como rescindida sem mês → validação | | |
| 3.3.6 | Marcar `[TESTE] Alfa Comércio` como rescindida (mês 06/2026) | | |
| 3.3.7 | Confirmar que sai da listagem principal | | |
| 3.3.8 | Ir em Rescindidas e reverter rescisão | | |
| 3.3.9 | Confirmar que volta para Empresas | | |

---

## 4. Tela Atividades

### 4.1 DP
| # | Teste | Resultado | Obs |
|---|-------|-----------|-----|
| 4.1.1 | Todas as empresas elegíveis aparecem (DP = todas) | | |
| 4.1.2 | Meses 1-5 de `[TESTE] Alfa Comércio` com OK | | |
| 4.1.3 | Mês 6 de `[TESTE] Alfa Comércio` com S/M | | |
| 4.1.4 | Mês 7 de `[TESTE] Alfa Comércio` com P + observação | | |
| 4.1.5 | Meses 1/2/3 de `[TESTE] Início Abril` bloqueados (startCompetence 04/2026) | | |
| 4.1.6 | Meses 6-12 de `[TESTE] Rescindida Maio` NÃO aparecem (empresa rescindida fora da lista principal) | | |
| 4.1.7 | Alterar status de vazio para OK → salva e mostra | | |
| 4.1.8 | Alterar para P → campo de observação obrigatório aparece | | |
| 4.1.9 | Alterar para ST-I → observação obrigatória | | |
| 4.1.10 | Alterar para S/M → sem observação obrigatória | | |
| 4.1.11 | Limpar status → célula fica vazia | | |
| 4.1.12 | Linha de totais no final da tabela | | |
| 4.1.13 | Histórico gerado após alterar status | | |
| 4.1.14 | Aplicação em lote — selecionar múltiplas empresas | | |
| 4.1.15 | Filtros por responsável, busca | | |

### 4.2 Fiscal Simples
| # | Teste | Resultado | Obs |
|---|-------|-----------|-----|
| 4.2.1 | Apenas empresas Simples Nacional aparecem (Alfa, Beta, Sem Responsável Fiscal) | | |
| 4.2.2 | `[TESTE] Gama Distribuidora` (LP) NÃO aparece | | |
| 4.2.3 | `[TESTE] Migração Regime` (LP em 2026) NÃO aparece | | |
| 4.2.4 | Status P com observação em `[TESTE] Alfa Comércio` mês 5 | | |
| 4.2.5 | Status ST-I com observação em `[TESTE] Alfa Comércio` mês 6 | | |

### 4.3 Fiscal ICMS
| # | Teste | Resultado | Obs |
|---|-------|-----------|-----|
| 4.3.1 | Apenas não-Simples com comércio ou indústria (Gama, Ômega, Início Abril, Resc. Maio, Resc. Dez, Sem Trib. Ant., Migração, Matriz, Filial) | | |
| 4.3.2 | `[TESTE] Beta Serviços` (Simples serviço) NÃO aparece | | |
| 4.3.3 | `[TESTE] Delta Consultoria` (LP serviço) NÃO aparece | | |
| 4.3.4 | Status P em `[TESTE] Gama Distribuidora` mês 4 | | |
| 4.3.5 | Status ST-I em `[TESTE] Gama Distribuidora` mês 5 | | |

### 4.4 Fiscal Serviço
| # | Teste | Resultado | Obs |
|---|-------|-----------|-----|
| 4.4.1 | Apenas não-Simples com serviço (Delta, Sigma, Imobiliária, Migração) | | |
| 4.4.2 | `[TESTE] Beta Serviços` (Simples) NÃO aparece | | |
| 4.4.3 | Status P em `[TESTE] Delta Consultoria` mês 4 | | |

### 4.5 Financeiro
| # | Teste | Resultado | Obs |
|---|-------|-----------|-----|
| 4.5.1 | Todas as empresas elegíveis aparecem | | |
| 4.5.2 | Status ST-C em `[TESTE] Alfa Comércio` mês 5 (sem observação obrigatória) | | |

### 4.6 Análise
| # | Teste | Resultado | Obs |
|---|-------|-----------|-----|
| 4.6.1 | Todas as empresas elegíveis aparecem | | |
| 4.6.2 | Status S/M em `[TESTE] Alfa Comércio` mês 4 | | |
| 4.6.3 | Status P em `[TESTE] Alfa Comércio` mês 5 com observação | | |

### 4.7 Revisão
| # | Teste | Resultado | Obs |
|---|-------|-----------|-----|
| 4.7.1 | Todas as empresas elegíveis aparecem | | |
| 4.7.2 | Status P em `[TESTE] Alfa Comércio` mês 4 com observação | | |

### 4.8 IR Aluguel
| # | Teste | Resultado | Obs |
|---|-------|-----------|-----|
| 4.8.1 | Apenas Sigma Participações e Imobiliária Central aparecem | | |
| 4.8.2 | `[TESTE] Alfa Comércio` NÃO aparece (irRent = false) | | |
| 4.8.3 | Status OK mês 1, P mês 2 em Sigma | | |
| 4.8.4 | Status OK mês 1, P mês 2 em Imobiliária | | |

### 4.9 MIT
| # | Teste | Resultado | Obs |
|---|-------|-----------|-----|
| 4.9.1 | Apenas Lucro Real aparecem (Ômega, Sigma, Matriz, Filial) | | |
| 4.9.2 | `[TESTE] Gama Distribuidora` (LP) NÃO aparece | | |
| 4.9.3 | Status ST-C em `[TESTE] Ômega Indústria` mês 3 | | |

### 4.10 SPED ECD
| # | Teste | Resultado | Obs |
|---|-------|-----------|-----|
| 4.10.1 | Empresas com 2025 não-Simples aparecem (Gama, Delta, Ômega, Sigma, Imob., Sem Trib. Ant., Matriz, Filial, Resc. Maio, Resc. Dez) | | |
| 4.10.2 | `[TESTE] Alfa Comércio` (Simples 2025) NÃO aparece | | |
| 4.10.3 | `[TESTE] Migração Regime` (Simples 2025) NÃO aparece | | |
| 4.10.4 | `[TESTE] Sem Trib. Anterior` (2025 vazio → null → elegível) aparece | | |
| 4.10.5 | month = 0 (campo anual, sem seleção de mês) | | |
| 4.10.6 | Responsável = Ana Lima (analysisResponsible) | | |
| 4.10.7 | Status OK em `[TESTE] Gama`, P em `[TESTE] Delta` | | |
| 4.10.8 | Observação obrigatória ao setar P em SPED | | |

### 4.11 SPED ECF
| # | Teste | Resultado | Obs |
|---|-------|-----------|-----|
| 4.11.1 | Mesmas empresas elegíveis que SPED ECD | | |
| 4.11.2 | P em `[TESTE] Gama` com observação | | |
| 4.11.3 | P em `[TESTE] Matriz` com observação | | |

---

## 5. Kanban

| # | Teste | Resultado | Obs |
|---|-------|-----------|-----|
| 5.1 | Toggle Grade/Kanban funciona | | |
| 5.2 | Botão Kanban desabilitado para obrigações anuais (SPED) | | |
| 5.3 | Selecionar mês no Kanban | | |
| 5.4 | Coluna "A Fazer" — empresas sem status | | |
| 5.5 | Coluna "Pendente" — empresas com P | | |
| 5.6 | Coluna "Standby" — empresas com ST-I ou ST-C | | |
| 5.7 | Coluna "Concluído" — empresas com OK ou S/M | | |
| 5.8 | Contadores de cada coluna corretos | | |
| 5.9 | Empresas com mês bloqueado NÃO aparecem no Kanban | | |
| 5.10 | Buscar empresa no Kanban | | |
| 5.11 | Clicar em card abre modal de status | | |
| 5.12 | Alterar status pelo Kanban → card muda de coluna | | |
| 5.13 | Histórico gerado após alteração no Kanban | | |
| 5.14 | Voltar para Grade → dados consistentes com Kanban | | |
| 5.15 | Kanban no tema escuro sem problemas visuais | | |

---

## 6. Tela Rescindidas

| # | Teste | Resultado | Obs |
|---|-------|-----------|-----|
| 6.1 | `[TESTE] Rescindida Maio LTDA` aparece | | |
| 6.2 | `[TESTE] Rescindida Dezembro LTDA` aparece | | |
| 6.3 | `[TESTE] Alfa Comércio` (ativa) NÃO aparece | | |
| 6.4 | Selecionar obrigação DP, ano 2026 | | |
| 6.5 | `[TESTE] Rescindida Maio` — meses 1-5 com status, 6-12 bloqueados | | |
| 6.6 | `[TESTE] Rescindida Dezembro` — meses 1-11 livres, 12 é o último | | |
| 6.7 | Tentar marcar mês bloqueado → impedido visualmente | | |
| 6.8 | Aplicação em lote nas rescindidas | | |
| 6.9 | SPED ECD para `[TESTE] Rescindida Maio` — OK salvo | | |
| 6.10 | Histórico gerado após alteração | | |
| 6.11 | Reverter rescisão de `[TESTE] Rescindida Maio` | | |
| 6.12 | Empresa sai de Rescindidas | | |
| 6.13 | Empresa volta para Empresas | | |
| 6.14 | Empresa volta para Atividades | | |
| 6.15 | Status e histórico preservados | | |

---

## 7. Dashboard

| # | Teste | Resultado | Obs |
|---|-------|-----------|-----|
| 7.1 | Trocar mês — KPIs atualizam | | |
| 7.2 | Trocar ano | | |
| 7.3 | KPI "Empresas" — contagem correta | | |
| 7.4 | KPI "Concluído" — empresas com OK + S/M | | |
| 7.5 | KPI "Pendências" — empresas com P + ST-I + ST-C | | |
| 7.6 | KPI "Alertas Atraso" | | |
| 7.7 | Bloco "Progresso por Área" com percentuais | | |
| 7.8 | Clicar em área → navega para Atividades com filtro correto | | |
| 7.9 | Bloco "Alertas de Atraso" aparece quando há pendências | | |
| 7.10 | Clicar em alerta → navega para Atividades | | |
| 7.11 | Bloco "Alertas de Prazo" com severidades (vencido/urgente/atenção) | | |
| 7.12 | Gráfico anual — mês selecionado destacado em azul | | |
| 7.13 | Gráfico anual — meses anteriores em verde | | |
| 7.14 | Cálculo ignora meses bloqueados por início de competência | | |
| 7.15 | Cálculo ignora empresas rescindidas (separadas) | | |
| 7.16 | Dashboard no tema escuro sem problemas visuais | | |
| 7.17 | Impressão do Dashboard (Ctrl+P) — sidebar não aparece | | |

---

## 8. Exportação Excel e Impressão

### 8.1 Excel
| # | Teste | Resultado | Obs |
|---|-------|-----------|-----|
| 8.1.1 | Exportar DP → arquivo .xlsx baixado | | |
| 8.1.2 | Abrir Excel — cabeçalhos corretos | | |
| 8.1.3 | Status OK, P, S/M, ST-I, ST-C aparecem | | |
| 8.1.4 | Observações aparecem nas células correspondentes | | |
| 8.1.5 | Células bloqueadas visualmente diferenciadas | | |
| 8.1.6 | Exportar Excel completo anual (todas as obrigações) | | |
| 8.1.7 | Abas por obrigação no Excel completo | | |
| 8.1.8 | Exportar SPED | | |
| 8.1.9 | Exportar Rescindidas | | |
| 8.1.10 | Largura das colunas adequada para leitura | | |

### 8.2 Impressão
| # | Teste | Resultado | Obs |
|---|-------|-----------|-----|
| 8.2.1 | Imprimir Atividades — sidebar não aparece | | |
| 8.2.2 | Imprimir — botões e filtros não aparecem | | |
| 8.2.3 | Grade legível no modo impressão | | |
| 8.2.4 | Imprimir Rescindidas | | |
| 8.2.5 | Imprimir Dashboard | | |

---

## 9. Anotações de Fechamento

| # | Teste | Resultado | Obs |
|---|-------|-----------|-----|
| 9.1 | Anotações `[TESTE]` aparecem na tela | | |
| 9.2 | Anotação fixada (`[TESTE] Alfa`) aparece primeiro | | |
| 9.3 | Criar anotação nova | | |
| 9.4 | Editar anotação | | |
| 9.5 | Fixar anotação — vai para o topo | | |
| 9.6 | Desafixar anotação | | |
| 9.7 | Arquivar anotação — sai da lista principal | | |
| 9.8 | Mostrar arquivadas — `[TESTE] Delta (ARQUIVADA)` aparece | | |
| 9.9 | Desarquivar anotação | | |
| 9.10 | Excluir anotação (dialog de confirmação) | | |
| 9.11 | Buscar por texto | | |
| 9.12 | Filtrar por empresa | | |
| 9.13 | Anotação longa (`[TESTE] Controles especiais do grupo`) — layout OK | | |
| 9.14 | Anotação sem empresa (`[TESTE] Lembrete geral`) aparece | | |
| 9.15 | Toast de sucesso em todas as operações | | |

---

## 10. Lembretes

| # | Teste | Resultado | Obs |
|---|-------|-----------|-----|
| 10.1 | Lembretes `[TESTE]` aparecem | | |
| 10.2 | Lembrete vencido (`[TESTE] ICMS foi paga`) indicado visualmente | | |
| 10.3 | Lembrete para hoje indicado visualmente | | |
| 10.4 | Lembrete concluído separado ou diferenciado | | |
| 10.5 | Criar lembrete | | |
| 10.6 | Editar lembrete | | |
| 10.7 | Marcar como concluído | | |
| 10.8 | Reabrir lembrete concluído | | |
| 10.9 | Excluir lembrete | | |
| 10.10 | Filtrar por abertos | | |
| 10.11 | Filtrar por concluídos | | |
| 10.12 | Filtrar por todos | | |
| 10.13 | Filtrar por empresa | | |
| 10.14 | Buscar por texto | | |
| 10.15 | Lembrete sem data de vencimento (`[TESTE] Sigma`) — sem erro visual | | |

---

## 11. Equipe

| # | Teste | Resultado | Obs |
|---|-------|-----------|-----|
| 11.1 | Profissionais ativos `[TESTE]` aparecem | | |
| 11.2 | `[TESTE] Paula Nogueira` e `[TESTE] Ricardo Alves` (inativos) separados ou ausentes | | |
| 11.3 | Folgas do mês aparecem nos cards dos profissionais | | |
| 11.4 | Folga de hoje em `[TESTE] Ana Lima` aparece | | |
| 11.5 | Criar nova folga | | |
| 11.6 | Editar folga | | |
| 11.7 | Excluir folga | | |
| 11.8 | Metas mensais aparecem no card ou seção | | |
| 11.9 | Meta concluída `[TESTE] Treinamento de nova ferramenta` diferenciada | | |
| 11.10 | Criar nova meta mensal | | |
| 11.11 | Marcar meta mensal como concluída | | |
| 11.12 | Excluir meta mensal | | |
| 11.13 | Selecionar mês diferente — dados atualizam | | |

---

## 12. Metas do Dia

| # | Teste | Resultado | Obs |
|---|-------|-----------|-----|
| 12.1 | Metas de hoje aparecem | | |
| 12.2 | `[TESTE] Ligar para Alfa Comércio` concluída aparece diferenciada | | |
| 12.3 | Barra de progresso do dia | | |
| 12.4 | Navegar para dia anterior (ontem) | | |
| 12.5 | Metas de ontem aparecem (incl. concluída e não concluída) | | |
| 12.6 | Navegar para amanhã | | |
| 12.7 | Meta futura em `[TESTE] Fechar SPED ECD da Delta` | | |
| 12.8 | Criar meta para hoje | | |
| 12.9 | Marcar meta como concluída | | |
| 12.10 | Desmarcar meta concluída | | |
| 12.11 | Excluir meta | | |
| 12.12 | Seletor de data — mudar para data específica | | |
| 12.13 | Estado vazio em dia sem metas | | |

---

## 13. Testes Visuais e UX

### 13.1 Tema
| # | Teste | Resultado | Obs |
|---|-------|-----------|-----|
| 13.1.1 | Todas as telas em tema claro sem problemas | | |
| 13.1.2 | Todas as telas em tema escuro sem problemas | | |
| 13.1.3 | Contraste adequado em tema escuro | | |
| 13.1.4 | Badges de status com cores corretas em ambos os temas | | |

### 13.2 Componentes
| # | Teste | Resultado | Obs |
|---|-------|-----------|-----|
| 13.2.1 | Modais abrem e fecham corretamente | | |
| 13.2.2 | Drawers abrem e fecham corretamente | | |
| 13.2.3 | Toasts aparecem e somem automaticamente | | |
| 13.2.4 | Dialogs de confirmação (excluir/desativar) | | |
| 13.2.5 | Estados vazios com mensagem adequada | | |
| 13.2.6 | Loading states durante chamadas de API | | |
| 13.2.7 | Botões desabilitados claramente diferenciados | | |
| 13.2.8 | Hover em linhas da tabela | | |
| 13.2.9 | Foco nos inputs (acessibilidade) | | |
| 13.2.10 | Textos longos não quebram layout | | |
| 13.2.11 | Tabela de Atividades com scroll horizontal se necessário | | |

---

## 14. Fluxos Críticos de Ponta a Ponta

| # | Fluxo | Resultado | Obs |
|---|-------|-----------|-----|
| 14.1 | Criar empresa → vincular a ano → setar status → ver no Dashboard | | |
| 14.2 | Setar status P → ver no Dashboard como pendência → clicar → ir para Atividades | | |
| 14.3 | Marcar empresa como rescindida → verificar em Rescindidas → lançar status → reverter | | |
| 14.4 | Criar profissional → vincular a empresa → verificar responsável nas Atividades | | |
| 14.5 | Desativar profissional → verificar que não aparece como opção de responsável | | |
| 14.6 | Exportar Excel de obrigação → abrir e verificar dados | | |
| 14.7 | Criar lembrete vencido → verificar badge de urgência | | |
| 14.8 | Criar anotação → fixar → verificar ordem → arquivar → mostrar arquivadas | | |
| 14.9 | Alterar status no Kanban → verificar na Grade → verificar Histórico no Drawer | | |
| 14.10 | `[TESTE] Migração Regime` — verificar que está em Fiscal ICMS (LP 2026), não em Fiscal Simples e não em SPED (Simples 2025) | | |

---

## 15. Validações e Erros

| # | Teste | Resultado | Obs |
|---|-------|-----------|-----|
| 15.1 | Campo razão social obrigatório em empresa | | |
| 15.2 | Observação obrigatória ao setar P ou ST-I | | |
| 15.3 | Não permite SPED com observação vazia em P | | |
| 15.4 | Mês de rescisão obrigatório ao rescindir | | |
| 15.5 | Formato inválido de CPF/CNPJ — validação | | |
| 15.6 | Abertura como empresa de abertura sem data — verificar comportamento | | |
| 15.7 | Ano contábil duplicado — impede criação | | |
| 15.8 | Tributação duplicada — verificar comportamento | | |

---

## Limpeza e Finalização

- [ ] `npm run db:clear-test` remove apenas dados `[TESTE]`
- [ ] Dados reais (se existiam) não foram afetados
- [ ] Script de clear pode ser rodado novamente sem erros

---

## Resumo de Falhas

| # | Tela | Falha | Prioridade | Correção Sugerida |
|---|------|-------|------------|-------------------|
| | | | | |

---

## Como Rodar os Testes

```bash
# 1. Popular dados de teste
npm run db:seed-test

# 2. Iniciar o servidor
npm run dev

# 3. Acessar http://localhost:3000

# 4. Executar os testes deste checklist manualmente

# 5. Após concluir, limpar os dados de teste
npm run db:clear-test
```

**Para re-rodar:** execute o clear antes do seed.

```bash
npm run db:clear-test && npm run db:seed-test
```
