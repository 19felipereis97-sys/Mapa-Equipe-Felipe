/* Cria ou atualiza um usuário do sistema.
 *
 * Uso:
 *   node scripts/create-user.js <email> <senha> <nome> <ROLE>
 * Ex.:
 *   node scripts/create-user.js admin@empresa.com "SenhaForte123" "Administrador" ADMIN
 *
 * ROLE ∈ ADMIN | GESTOR | OPERADOR | LEITURA (default: LEITURA)
 */
const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function main() {
  const [, , emailArg, password, nameArg, roleArg] = process.argv;
  const email = (emailArg || '').toLowerCase().trim();
  const name = nameArg || email;
  const role = (roleArg || 'LEITURA').toUpperCase();

  if (!email || !password) {
    console.error('Uso: node scripts/create-user.js <email> <senha> <nome> <ROLE>');
    process.exit(1);
  }
  if (!['ADMIN', 'GESTOR', 'OPERADOR', 'LEITURA'].includes(role)) {
    console.error(`ROLE inválido: ${role}. Use ADMIN | GESTOR | OPERADOR | LEITURA.`);
    process.exit(1);
  }
  if (password.length < 8) {
    console.error('A senha deve ter pelo menos 8 caracteres.');
    process.exit(1);
  }

  const passwordHash = await bcrypt.hash(password, 10);

  const user = await prisma.user.upsert({
    where: { email },
    update: { name, role, passwordHash, active: true },
    create: { email, name, role, passwordHash, active: true },
  });

  console.log(`✔ Usuário salvo: ${user.email} (${user.role})`);
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
