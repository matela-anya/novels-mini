// src/db/schema.ts
import { pgTable, serial, text, timestamp, integer } from 'drizzle-orm/pg-core';

export const novels = pgTable('novels', {
  id: serial('id').primaryKey(),
  title: text('title').notNull(),
  coverUrl: text('cover_url').notNull(),
  description: text('description'),
  status: text('status').notNull().default('в процессе'),
  chaptersCount: integer('chapters_count').notNull().default(0),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

export const chapters = pgTable('chapters', {
  id: serial('id').primaryKey(),
  novelId: integer('novel_id').references(() => novels.id).notNull(),
  number: integer('number').notNull(),
  title: text('title'),
  content: text('content').notNull(),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

export const translators = pgTable('translators', {
  id: serial('id').primaryKey(),
  telegramId: text('telegram_id').notNull().unique(),
  name: text('name').notNull(),
  avatarUrl: text('avatar_url'),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

export const comments = pgTable('comments', {
  id: serial('id').primaryKey(),
  chapterId: integer('chapter_id').references(() => chapters.id).notNull(),
  telegramId: text('telegram_id').notNull(),
  userName: text('user_name').notNull(),
  content: text('content').notNull(),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});
