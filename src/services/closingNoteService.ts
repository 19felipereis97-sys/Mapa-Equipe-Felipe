import prisma from '@/lib/prisma';
import type { Prisma } from '@prisma/client';

const INCLUDE = {
  company: true,
} as const;

interface ListClosingNotesParams {
  search?: string | null;
  companyId?: number | null;
  showArchived?: boolean;
}

interface ClosingNoteInput {
  companyId?: number | null;
  title?: string | null;
  content?: string | null;
  pinned?: boolean;
  archived?: boolean;
}

function cleanCompanyId(value: number | null | undefined) {
  return value && Number.isFinite(value) ? value : null;
}

function validateInput(data: ClosingNoteInput, partial = false) {
  const title = data.title?.trim();
  const content = data.content?.trim();
  if (!partial || data.title !== undefined) {
    if (!title) throw new Error('Título é obrigatório');
  }
  if (!partial || data.content !== undefined) {
    if (!content) throw new Error('Anotação é obrigatória');
  }
  return { title, content };
}

export async function listClosingNotes(params: ListClosingNotesParams = {}) {
  const where: Prisma.ClosingNoteWhereInput = {};
  if (!params.showArchived) where.archived = false;
  if (params.companyId) where.companyId = params.companyId;
  if (params.search?.trim()) {
    const q = params.search.trim();
    where.OR = [
      { title: { contains: q } },
      { content: { contains: q } },
      { company: { corporateName: { contains: q } } },
    ];
  }

  return prisma.closingNote.findMany({
    where,
    include: INCLUDE,
    orderBy: [{ pinned: 'desc' }, { updatedAt: 'desc' }],
  });
}

export async function createClosingNote(data: ClosingNoteInput) {
  const valid = validateInput(data);
  return prisma.closingNote.create({
    data: {
      companyId: cleanCompanyId(data.companyId),
      title: valid.title!,
      content: valid.content!,
      pinned: data.pinned ?? false,
      archived: data.archived ?? false,
    },
    include: INCLUDE,
  });
}

export async function updateClosingNote(id: number, data: ClosingNoteInput) {
  const valid = validateInput(data, true);
  return prisma.closingNote.update({
    where: { id },
    data: {
      ...(data.companyId !== undefined ? { companyId: cleanCompanyId(data.companyId) } : {}),
      ...(data.title !== undefined ? { title: valid.title! } : {}),
      ...(data.content !== undefined ? { content: valid.content! } : {}),
      ...(data.pinned !== undefined ? { pinned: data.pinned } : {}),
      ...(data.archived !== undefined ? { archived: data.archived } : {}),
    },
    include: INCLUDE,
  });
}

export async function togglePinned(id: number) {
  const note = await prisma.closingNote.findUniqueOrThrow({ where: { id } });
  return updateClosingNote(id, { pinned: !note.pinned });
}

export async function archiveClosingNote(id: number) {
  return updateClosingNote(id, { archived: true });
}

export async function unarchiveClosingNote(id: number) {
  return updateClosingNote(id, { archived: false });
}

export async function deleteClosingNote(id: number) {
  await prisma.closingNote.delete({ where: { id } });
}
