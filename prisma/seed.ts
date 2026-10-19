import 'dotenv/config';
import bcrypt from 'bcryptjs';
import { PrismaPg } from '@prisma/adapter-pg';
import { Prisma, PrismaClient } from '../src/generated/prisma/client';

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
const prisma = new PrismaClient({ adapter });

const email = process.env.SEED_USER_EMAIL ?? 'designer@example.com';
const password = process.env.SEED_USER_PASSWORD ?? 'change-me';

// Fixed ids keep the seed idempotent
const P1 = '00000000-0000-4000-8000-000000000001';
const P2 = '00000000-0000-4000-8000-000000000002';
const P3 = '00000000-0000-4000-8000-000000000003';

async function main() {
  const user = await prisma.user.upsert({
    where: { email },
    update: {},
    create: { email, passwordHash: await bcrypt.hash(password, 10) },
  });

  const projects = [
    {
      id: P1,
      title: 'Premium SUV interior: warm earth tones',
      description:
        'Warm earth tones, matte leather, brushed bronze accents. Target: premium family SUV, calm and tactile cabin.',
    },
    {
      id: P2,
      title: 'Matte EV exterior palette',
      description:
        'Three-colour exterior palette for a compact EV. Matte finishes, sustainable pigments, easy to repair.',
    },
    {
      id: P3,
      title: 'Sustainable sport coupe cabin',
      description: null,
    },
  ];

  for (const p of projects) {
    await prisma.project.upsert({
      where: { id: p.id },
      update: { title: p.title, description: p.description },
      create: { ...p, userId: user.id },
    });
  }

  // Reset seeded chats so reruns do not duplicate
  await prisma.message.deleteMany({ where: { projectId: { in: [P1, P2] } } });

  const seedMessages: Prisma.MessageCreateManyInput[] = [
    {
      projectId: P1,
      role: 'USER',
      type: 'CHAT',
      content: 'What leather finish fits a warm, matte premium cabin?',
    },
    {
      projectId: P1,
      role: 'ASSISTANT',
      type: 'CHAT',
      content:
        'Go for full-grain aniline or semi-aniline leather with a matte topcoat. Pair with a cognac or terracotta base, and brushed bronze trim so metal does not glare.',
    },
    {
      projectId: P1,
      role: 'USER',
      type: 'CHAT',
      content: 'Any sustainable alternative to leather?',
    },
    {
      projectId: P1,
      role: 'ASSISTANT',
      type: 'CHAT',
      content:
        'Chrome-free tanned leather or high-quality bio-based textiles with a suede-like hand. Check abrasion rating and UV stability for seat bolsters.',
    },
    {
      projectId: P1,
      role: 'ASSISTANT',
      type: 'SUMMARY',
      content:
        '**Decisions**\n- Matte semi-aniline leather, cognac/terracotta base\n- Brushed bronze trim\n\n**Open questions**\n- Sustainable leather alternative for seat bolsters\n- Abrasion and UV targets',
    },
    {
      projectId: P2,
      role: 'USER',
      type: 'CHAT',
      content: 'Suggest a matte three-colour palette for a compact EV.',
    },
    {
      projectId: P2,
      role: 'ASSISTANT',
      type: 'CHAT',
      content:
        'Try a sage green, a warm stone grey and a deep ink blue. All three hold up well in matte and photograph well in low light.',
    },
  ];
  const base = Date.now() - 60 * 60 * 1000;
  await prisma.message.createMany({
    data: seedMessages.map((m, i) => ({
      ...m,
      createdAt: new Date(base + i * 1000),
    })),
  });

  console.log(`Seeded user ${email} with ${projects.length} projects`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
