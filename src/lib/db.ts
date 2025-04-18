// Always import the *generated* client from the path you set in schema.prisma
import { PrismaClient } from "@/generated/prisma";

const globalForPrisma = global as unknown as { prisma?: PrismaClient };

export const db =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: ["query"],     // remove later if too noisy
  });

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = db;