// lib/prisma.ts
import { PrismaClient } from '@prisma/client';

let Prisma: PrismaClient;

if (process.env.NODE_ENV === 'production') {
  Prisma = new PrismaClient();
} else {
  if (!global.prisma) {
    global.prisma = new PrismaClient();
  }
  Prisma = global.prisma;
}

export default Prisma;
