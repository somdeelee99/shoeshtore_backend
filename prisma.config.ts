import 'dotenv/config';
import { defineConfig } from 'prisma/config';

/**
 * Prisma configuration — connection URL & migrations live here,
 * while the runtime client uses the pg driver adapter (see src/core/prisma).
 */
export default defineConfig({
  schema: 'prisma/schema.prisma',
  datasource: {
    url: process.env.DATABASE_URL,
  },
  migrations: {
    path: 'prisma/migrations',
    seed: 'tsx prisma/seed.ts',
  },
});
