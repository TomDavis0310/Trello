import { PrismaClient } from '../generated/prisma/client';
import { PrismaLibSql } from '@prisma/adapter-libsql';
import * as bcrypt from 'bcrypt';

const adapter = new PrismaLibSql({ url: process.env.DATABASE_URL || 'file:./dev.db' });
const prisma = new PrismaClient({ adapter });

async function main() {
  const existing = await prisma.user.findUnique({ where: { email: 'demo@trello.com' } });
  if (existing) {
    console.log('Seed data already exists, skipping.');
    return;
  }

  const hashed = await bcrypt.hash('123456', 10);

  const user = await prisma.user.create({
    data: { email: 'demo@trello.com', password: hashed, name: 'Demo User' },
  });

  const board = await prisma.board.create({
    data: { userId: user.id, name: 'My Trello Board' },
  });

  const listData = [
    { boardId: board.id, name: 'Todo', order: 0 },
    { boardId: board.id, name: 'In Progress', order: 1 },
    { boardId: board.id, name: 'Review', order: 2 },
    { boardId: board.id, name: 'Done', order: 3 },
  ];

  for (const data of listData) {
    await prisma.list.create({ data });
  }

  const lists = await prisma.list.findMany({ where: { boardId: board.id } });

  const sampleCards = [
    { listId: lists[0].id, title: 'Set up NestJS backend', position: 0 },
    { listId: lists[0].id, title: 'Design database schema', position: 1 },
    { listId: lists[1].id, title: 'Implement auth module', position: 0 },
    { listId: lists[1].id, title: 'Build board CRUD', position: 1 },
    { listId: lists[2].id, title: 'Test card reorder', position: 0 },
    { listId: lists[3].id, title: 'Deploy to production', position: 0 },
  ];

  for (const data of sampleCards) {
    await prisma.card.create({ data });
  }

  console.log('✅ Seed data created successfully!');
  console.log('   Email: demo@trello.com');
  console.log('   Password: 123456');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
