-- CreateTable
CREATE TABLE "gclick_tasks" (
    "id" SERIAL NOT NULL,
    "sourceKey" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "department" TEXT NOT NULL,
    "subject" TEXT NOT NULL,
    "competence" TEXT NOT NULL,
    "competenceSort" INTEGER,
    "clientCode" TEXT,
    "clientName" TEXT NOT NULL,
    "clientStatus" TEXT,
    "action" TEXT,
    "goal" TEXT,
    "dueDate" TIMESTAMP(3),
    "dueDateRaw" TEXT,
    "completed" BOOLEAN NOT NULL DEFAULT false,
    "completedAt" TIMESTAMP(3),
    "completedBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "gclick_tasks_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "gclick_tasks_sourceKey_key" ON "gclick_tasks"("sourceKey");

-- CreateIndex
CREATE INDEX "gclick_tasks_subject_idx" ON "gclick_tasks"("subject");

-- CreateIndex
CREATE INDEX "gclick_tasks_clientName_idx" ON "gclick_tasks"("clientName");

-- CreateIndex
CREATE INDEX "gclick_tasks_completed_idx" ON "gclick_tasks"("completed");

-- CreateIndex
CREATE INDEX "gclick_tasks_dueDate_idx" ON "gclick_tasks"("dueDate");
