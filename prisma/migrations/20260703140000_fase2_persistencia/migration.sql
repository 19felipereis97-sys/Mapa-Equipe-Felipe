-- CreateEnum
CREATE TYPE "TaskStatus" AS ENUM ('AGUARDANDO', 'PROCESSANDO', 'CONCLUIDO', 'CONCLUIDO_COM_ALERTAS', 'ERRO', 'CANCELADO', 'PENDENTE_REVISAO');

-- CreateTable
CREATE TABLE "tarefas_processamento" (
    "id" SERIAL NOT NULL,
    "tipo" TEXT NOT NULL,
    "status" "TaskStatus" NOT NULL DEFAULT 'AGUARDANDO',
    "prioridade" INTEGER NOT NULL DEFAULT 100,
    "params" JSONB,
    "resultRef" TEXT,
    "mensagemUsuario" TEXT,
    "userId" INTEGER,
    "tentativas" INTEGER NOT NULL DEFAULT 0,
    "maxTentativas" INTEGER NOT NULL DEFAULT 3,
    "proximaTentativaEm" TIMESTAMP(3),
    "lockedBy" TEXT,
    "lockedAt" TIMESTAMP(3),
    "erroResumo" TEXT,
    "erroDetalhado" TEXT,
    "registrosProcessados" INTEGER,
    "durationMs" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "startedAt" TIMESTAMP(3),
    "finishedAt" TIMESTAMP(3),
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "tarefas_processamento_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "arquivos_importados" (
    "id" SERIAL NOT NULL,
    "nomeOriginal" TEXT NOT NULL,
    "hash" TEXT NOT NULL,
    "tamanho" INTEGER NOT NULL,
    "tipo" TEXT NOT NULL,
    "mimeType" TEXT,
    "storagePath" TEXT,
    "userId" INTEGER,
    "status" TEXT NOT NULL DEFAULT 'recebido',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "arquivos_importados_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "indicadores_processados" (
    "id" SERIAL NOT NULL,
    "chave" TEXT NOT NULL,
    "ano" INTEGER NOT NULL,
    "mes" INTEGER NOT NULL,
    "payload" JSONB NOT NULL,
    "recalculationReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "indicadores_processados_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cards_processados" (
    "id" SERIAL NOT NULL,
    "chave" TEXT NOT NULL,
    "tipo" TEXT NOT NULL,
    "payload" JSONB NOT NULL,
    "versao" INTEGER NOT NULL DEFAULT 1,
    "sourceRef" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "cards_processados_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "relatorios_gerados" (
    "id" SERIAL NOT NULL,
    "tipo" TEXT NOT NULL,
    "filtros" JSONB,
    "storagePath" TEXT,
    "status" "TaskStatus" NOT NULL DEFAULT 'AGUARDANDO',
    "userId" INTEGER,
    "expiresAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "relatorios_gerados_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "logs_processamento" (
    "id" SERIAL NOT NULL,
    "taskId" INTEGER,
    "etapa" TEXT NOT NULL,
    "mensagem" TEXT,
    "durationMs" INTEGER,
    "registrosProcessados" INTEGER,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "logs_processamento_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "erros_processamento" (
    "id" SERIAL NOT NULL,
    "taskId" INTEGER,
    "etapa" TEXT NOT NULL,
    "erroResumo" TEXT NOT NULL,
    "erroDetalhado" TEXT,
    "stack" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "erros_processamento_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "tarefas_processamento_status_prioridade_createdAt_idx" ON "tarefas_processamento"("status", "prioridade", "createdAt");

-- CreateIndex
CREATE INDEX "tarefas_processamento_tipo_idx" ON "tarefas_processamento"("tipo");

-- CreateIndex
CREATE INDEX "tarefas_processamento_userId_idx" ON "tarefas_processamento"("userId");

-- CreateIndex
CREATE INDEX "arquivos_importados_hash_idx" ON "arquivos_importados"("hash");

-- CreateIndex
CREATE INDEX "arquivos_importados_userId_idx" ON "arquivos_importados"("userId");

-- CreateIndex
CREATE INDEX "arquivos_importados_tipo_idx" ON "arquivos_importados"("tipo");

-- CreateIndex
CREATE UNIQUE INDEX "indicadores_processados_chave_key" ON "indicadores_processados"("chave");

-- CreateIndex
CREATE INDEX "indicadores_processados_ano_mes_idx" ON "indicadores_processados"("ano", "mes");

-- CreateIndex
CREATE UNIQUE INDEX "cards_processados_chave_key" ON "cards_processados"("chave");

-- CreateIndex
CREATE INDEX "cards_processados_tipo_idx" ON "cards_processados"("tipo");

-- CreateIndex
CREATE INDEX "relatorios_gerados_tipo_idx" ON "relatorios_gerados"("tipo");

-- CreateIndex
CREATE INDEX "relatorios_gerados_userId_idx" ON "relatorios_gerados"("userId");

-- CreateIndex
CREATE INDEX "relatorios_gerados_expiresAt_idx" ON "relatorios_gerados"("expiresAt");

-- CreateIndex
CREATE INDEX "logs_processamento_taskId_idx" ON "logs_processamento"("taskId");

-- CreateIndex
CREATE INDEX "logs_processamento_etapa_idx" ON "logs_processamento"("etapa");

-- CreateIndex
CREATE INDEX "logs_processamento_createdAt_idx" ON "logs_processamento"("createdAt");

-- CreateIndex
CREATE INDEX "erros_processamento_taskId_idx" ON "erros_processamento"("taskId");

-- CreateIndex
CREATE INDEX "erros_processamento_etapa_idx" ON "erros_processamento"("etapa");

-- AddForeignKey
ALTER TABLE "logs_processamento" ADD CONSTRAINT "logs_processamento_taskId_fkey" FOREIGN KEY ("taskId") REFERENCES "tarefas_processamento"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "erros_processamento" ADD CONSTRAINT "erros_processamento_taskId_fkey" FOREIGN KEY ("taskId") REFERENCES "tarefas_processamento"("id") ON DELETE SET NULL ON UPDATE CASCADE;

