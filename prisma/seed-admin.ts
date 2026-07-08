import { PrismaClient, UserRole } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

function requireEnv(name: string) {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`${name} is required.`);
  return value;
}

function assertStrongPassword(password: string) {
  const checks = [
    password.length >= 12,
    /[A-Z]/.test(password),
    /[a-z]/.test(password),
    /\d/.test(password),
    /[^A-Za-z0-9]/.test(password),
  ];
  if (!checks.every(Boolean)) {
    throw new Error('ADMIN_PASSWORD must be at least 12 characters and include uppercase, lowercase, number, and symbol characters.');
  }
}

async function main() {
  const email = requireEnv('ADMIN_EMAIL').toLowerCase();
  const password = requireEnv('ADMIN_PASSWORD');
  const firstName = process.env.ADMIN_FIRST_NAME?.trim() || 'Store';
  const lastName = process.env.ADMIN_LAST_NAME?.trim() || 'Administrator';
  const saltRounds = Number(process.env.BCRYPT_SALT_ROUNDS ?? 12);
  const allowPromoteExisting = process.env.ADMIN_BOOTSTRAP_ALLOW_PROMOTE_EXISTING === 'true';

  assertStrongPassword(password);

  const passwordHash = await bcrypt.hash(password, saltRounds);
  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing && existing.role !== UserRole.ADMIN && !allowPromoteExisting) {
    throw new Error(
      'Refusing to promote an existing non-admin account. Use a dedicated ADMIN_EMAIL, or set ADMIN_BOOTSTRAP_ALLOW_PROMOTE_EXISTING=true for an intentional one-time bootstrap.',
    );
  }

  const user = existing
    ? await prisma.user.update({
      where: { email },
      data: {
      passwordHash,
      firstName,
      lastName,
      role: existing.role === UserRole.ADMIN || allowPromoteExisting ? UserRole.ADMIN : existing.role,
      active: true,
    },
    })
    : await prisma.user.create({
      data: {
      email,
      passwordHash,
      firstName,
      lastName,
      role: UserRole.ADMIN,
      active: true,
      cart: { create: {} },
    },
    });

  await prisma.cart.upsert({
    where: { userId: user.id },
    update: {},
    create: { userId: user.id },
  });

  console.log(`Administrator ready: ${email}`);
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async error => {
    console.error(error instanceof Error ? error.message : error);
    await prisma.$disconnect();
    process.exit(1);
  });
