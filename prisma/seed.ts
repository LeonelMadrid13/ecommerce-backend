import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }),
});

async function main() {
  console.log('🌱 Seeding...');

  // Clean DB (optional but useful for dev)
  await prisma.orderItem.deleteMany();
  await prisma.order.deleteMany();
  await prisma.product.deleteMany();
  await prisma.refreshToken.deleteMany();
  await prisma.user.deleteMany();

  // 🔐 Hash password
  const password = await bcrypt.hash('password123', 10);

  // 👤 Users
  await prisma.user.create({
    data: {
      name: 'Leonel',
      email: 'leonel@example.com',
      password,
      role: 'USER',
    },
  });

  await prisma.user.create({
    data: {
      name: 'Admin',
      email: 'admin@example.com',
      password,
      role: 'ADMIN',
    },
  });

  console.log('✅ Users created');

  // 📦 Products
  await prisma.product.createMany({
    data: [
      {
        name: 'Laptop',
        description: 'Gaming laptop',
        price: 1500,
        stock: 10,
      },
      {
        name: 'Mouse',
        description: 'Wireless mouse',
        price: 50,
        stock: 50,
      },
      {
        name: 'Keyboard',
        description: 'Mechanical keyboard',
        price: 120,
        stock: 30,
      },
    ],
  });

  console.log('✅ Products created');

  console.log('🌱 Seeding finished');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
