import { pgTable, serial, timestamp, text, boolean, integer, index, uuid, jsonb } from 'drizzle-orm/pg-core';
import { relations, sql } from 'drizzle-orm';

// --- Tables ---

// User Table
export const users = pgTable('User', {
  id: serial('id').primaryKey(),
  createdAt: timestamp('createdAt', { mode: 'date' }).defaultNow().notNull(),
  updatedAt: timestamp('updatedAt', { mode: 'date' }).defaultNow().notNull(),
  email: text('email').unique().notNull(),
  name: text('name'),
  password: text('password').notNull(),
  admin: boolean('admin').default(false).notNull(),
});

// Quiz Format Table
export const quizFormats = pgTable('QuizFormat', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  description: text('description').notNull().default(''),
  enabled: boolean('enabled').default(true).notNull(),
  sortOrder: integer('sortOrder').default(0).notNull(),
});

// Quiz Format Sets (join table)
export const quizFormatSets = pgTable('QuizFormatSet', {
  id: serial('id').primaryKey(),
  formatId: text('formatId').notNull().references(() => quizFormats.id, {
    onDelete: 'cascade',
    onUpdate: 'cascade',
  }),
  setCode: text('setCode').notNull(),
  position: integer('position').default(0).notNull(),
});

// Quiz Table
export const quizzes = pgTable('Quiz', {
  id: uuid('id').primaryKey().defaultRandom(),
  createdAt: timestamp('createdAt', { mode: 'date' }).defaultNow().notNull(),
  updatedAt: timestamp('updatedAt', { mode: 'date' }).defaultNow().notNull(),
  seed: integer('seed').notNull(),
  format: text('format').notNull().default('classic'),
  questionCount: integer('questionCount').default(30).notNull(),
  currentIndex: integer('currentIndex').default(0).notNull(),
  completedAt: timestamp('completedAt', { mode: 'date' }),
  score: integer('score').default(0),
  results: jsonb('results')
    .$type<{ questionIndex: number; guess: string | null; correct: boolean; correctAnswer: string; imageUrl: string; cardId: number | null }[]>()
    .default(sql`'[]'::jsonb`)
    .notNull(),
  userId: integer('userId').references(() => users.id, {
    onDelete: 'restrict',
    onUpdate: 'cascade',
  }),
});

// Question Table
export const questions = pgTable('Question', {
  id: serial('id').primaryKey(),
  createdAt: timestamp('createdAt', { mode: 'date' }).defaultNow().notNull(),
  updatedAt: timestamp('updatedAt', { mode: 'date' }).defaultNow().notNull(),
  imageUrl: text('imageUrl').notNull(),
  answer: text('answer').notNull(),
  quizId: uuid('quizId')
    .notNull()
    .references(() => quizzes.id, { onDelete: 'restrict', onUpdate: 'cascade' }),
  cardId: integer('cardId').references(() => cards.id, {
    onDelete: 'restrict',
    onUpdate: 'cascade',
  }),
});

// Card Table
export const cards = pgTable('Card', {
  id: serial('id').primaryKey(),
  createdAt: timestamp('createdAt', { mode: 'date' }).defaultNow().notNull(),
  updatedAt: timestamp('updatedAt', { mode: 'date' }).defaultNow().notNull(),
  title: text('title').notNull(),
  file: text('file').notNull().default(''),
  set: text('set').notNull(),
  year: integer('year').notNull(),
  titleNorm: text('title_norm').generatedAlwaysAs(
    (): any => sql`lower(immutable_unaccent(${cards.title}))`,
  ),
  titleCompact: text('title_compact').generatedAlwaysAs(
    (): any => sql`regexp_replace(lower(immutable_unaccent(${cards.title})), '[ -]', '', 'g')`,
  ),
}, (t) => [
  index('cards_title_norm_trgm').using('gin', t.titleNorm.op('gin_trgm_ops')),
  index('cards_title_compact_trgm').using('gin', t.titleCompact.op('gin_trgm_ops')),
]);

// --- Relations ---

// Users Relations
export const usersRelations = relations(users, ({ many }) => ({
  quizzes: many(quizzes),
}));

// Quizzes Relations
export const quizzesRelations = relations(quizzes, ({ one, many }) => ({
  user: one(users, {
    fields: [quizzes.userId],
    references: [users.id],
  }),
  questions: many(questions),
}));

// Questions Relations
export const questionsRelations = relations(questions, ({ one }) => ({
  quiz: one(quizzes, {
    fields: [questions.quizId],
    references: [quizzes.id],
  }),
  card: one(cards, {
    fields: [questions.cardId],
    references: [cards.id],
  }),
}));

// Quiz Format Relations
export const quizFormatsRelations = relations(quizFormats, ({ many }) => ({
  sets: many(quizFormatSets),
}));

// Quiz Format Sets Relations
export const quizFormatSetsRelations = relations(quizFormatSets, ({ one }) => ({
  format: one(quizFormats, {
    fields: [quizFormatSets.formatId],
    references: [quizFormats.id],
  }),
}));
