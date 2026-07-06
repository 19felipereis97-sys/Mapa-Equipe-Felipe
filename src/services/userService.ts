import prisma from '@/lib/prisma';
import bcrypt from 'bcryptjs';
import type { Role } from '@/lib/permissions';

const ROLES: Role[] = ['ADMIN', 'GESTOR', 'OPERADOR', 'LEITURA'];
const SELECT = { id: true, name: true, email: true, role: true, active: true, createdAt: true } as const;

export async function listUsers() {
  return prisma.user.findMany({ orderBy: [{ active: 'desc' }, { name: 'asc' }], select: SELECT });
}

export async function createUser(data: { name: string; email: string; password: string; role: string }) {
  const email = (data.email ?? '').toLowerCase().trim();
  const name = (data.name ?? '').trim();
  if (!name) throw new Error('Nome é obrigatório');
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new Error('E-mail inválido');
  if (!data.password || data.password.length < 8) throw new Error('Senha deve ter ao menos 8 caracteres');
  if (!ROLES.includes(data.role as Role)) throw new Error('Papel inválido');

  const exists = await prisma.user.findUnique({ where: { email } });
  if (exists) throw new Error('Já existe um usuário com este e-mail');

  const passwordHash = await bcrypt.hash(data.password, 10);
  return prisma.user.create({ data: { name, email, role: data.role as Role, passwordHash, active: true }, select: SELECT });
}

// Impede deixar o sistema sem nenhum admin ativo.
async function assertNotLastAdmin(targetId: number, willRemainAdmin: boolean) {
  const target = await prisma.user.findUnique({ where: { id: targetId }, select: { role: true, active: true } });
  if (!target || target.role !== 'ADMIN' || !target.active) return; // não era admin ativo → sem risco
  if (willRemainAdmin) return;
  const otherAdmins = await prisma.user.count({ where: { role: 'ADMIN', active: true, id: { not: targetId } } });
  if (otherAdmins === 0) throw new Error('Não é possível remover o último administrador ativo');
}

export async function updateUser(id: number, data: { name?: string; role?: string; active?: boolean; password?: string }) {
  const patch: Record<string, unknown> = {};
  if (data.name !== undefined) patch.name = data.name.trim();
  if (data.role !== undefined) {
    if (!ROLES.includes(data.role as Role)) throw new Error('Papel inválido');
    await assertNotLastAdmin(id, data.role === 'ADMIN' && data.active !== false);
    patch.role = data.role;
  }
  if (data.active !== undefined) {
    if (!data.active) await assertNotLastAdmin(id, false);
    patch.active = data.active;
  }
  if (data.password) {
    if (data.password.length < 8) throw new Error('Senha deve ter ao menos 8 caracteres');
    patch.passwordHash = await bcrypt.hash(data.password, 10);
  }
  return prisma.user.update({ where: { id }, data: patch, select: SELECT });
}

export async function deleteUser(id: number) {
  await assertNotLastAdmin(id, false);
  await prisma.user.delete({ where: { id } });
}

export async function changeOwnPassword(userId: number, currentPassword: string, newPassword: string) {
  if (!newPassword || newPassword.length < 8) throw new Error('A nova senha deve ter ao menos 8 caracteres');
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) throw new Error('Usuário não encontrado');
  const ok = await bcrypt.compare(currentPassword ?? '', user.passwordHash);
  if (!ok) throw new Error('Senha atual incorreta');
  const passwordHash = await bcrypt.hash(newPassword, 10);
  await prisma.user.update({ where: { id: userId }, data: { passwordHash } });
}
