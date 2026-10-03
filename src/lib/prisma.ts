import { PrismaClient } from "@/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";

const prismaClientSingleton = () => {
  const connectionString =
    process.env.DATABASE_URL ||
    process.env.DIRECT_URL ||
    (process.env.NODE_ENV === "test"
      ? "postgresql://mock:mock@localhost:5432/test"
      : undefined);
  if (!connectionString) {
    throw new Error(
      "DATABASE_URL or DIRECT_URL is not set. Please check your .env file and restart the server.",
    );
  }

  const pool = new Pool({
    connectionString,
    max: process.env.NODE_ENV === "production" ? 5 : 10,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 5000,
  });
  const adapter = new PrismaPg(pool);
  return new PrismaClient({ adapter });
};

type PrismaClientSingleton = PrismaClient;

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClientSingleton | undefined;
};

const getPrismaClient = (): PrismaClientSingleton => {
  if (!globalForPrisma.prisma) {
    globalForPrisma.prisma = prismaClientSingleton();
  }
  return globalForPrisma.prisma;
};

export const prisma = new Proxy({} as PrismaClientSingleton, {
  get(_target, prop, receiver) {
    const client = getPrismaClient();
    const value = Reflect.get(client, prop, receiver);
    if (typeof value === "function") {
      return value.bind(client);
    }
    return value;
  },
});
