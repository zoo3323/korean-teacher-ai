import path from "node:path";
import { defineConfig } from "prisma/config";
import { PrismaLibSql } from "@prisma/adapter-libsql";
const dbUrl = process.env.DATABASE_URL ?? "file:./prisma/dev.db";

export default defineConfig({
  // @ts-ignore — earlyAccess is valid at runtime in Prisma v7 beta
  earlyAccess: true,
  schema: path.join(import.meta.dirname, "prisma", "schema.prisma"),
  // @ts-ignore — datasource.url required for db push
  datasource: {
    url: dbUrl,
  },
  migrate: {
    adapter: () => new PrismaLibSql({ url: dbUrl }),
  },
});
