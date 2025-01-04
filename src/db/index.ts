// src/db/index.ts
import { drizzle } from 'drizzle-orm/vercel-postgres';
import { sql } from '@vercel/postgres';
import * as schema from './schema';

// Initialize drizzle with the schema
export const db = drizzle(sql, { schema });

// Export all schema objects
export * from './schema';
