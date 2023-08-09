// 1. prisma with proxy

// import { PrismaClient } from "@prisma/client/edge";

// const globalForPrisma = global as unknown as { prisma: PrismaClient };

// export const prisma = globalForPrisma.prisma || new PrismaClient();

// if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;

// export default prisma;

// 2.prisma with sqlite

import { PrismaClient } from "@prisma/client";

const globalForPrisma = global as unknown as { prisma: PrismaClient };

export const prisma = globalForPrisma.prisma || new PrismaClient();

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;

export default prisma;


// 3. prisma with vercel
// import { PrismaClient } from '@prisma/client'

// // Avoid instantiating too many instances of Prisma in development
// // https://www.prisma.io/docs/support/help-articles/nextjs-prisma-client-dev-practices#problem
// let prisma

// if (process.env.NODE_ENV === 'production') {
//   prisma = new PrismaClient()
// } else {
//   if (!(global as any).prisma) {
//     (global as any).prisma = new PrismaClient()
//   }
//   prisma = (global as any).prisma;
// }

// export default prisma