import { pgTable, serial, timestamp, text, boolean, integer, pgEnum } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';

// --- Enums ---

export const setEnum = pgEnum('Set', [
  'ALPHA',
  'BETA',
  'UNLIMITED',
  'REVISED',
  'FOURTH_EDITION',
  'FIFTH_EDITION',
  'SIXTH_EDITION',
  'SEVENTH_EDITION',
  'EIGHTH_EDITION',
  'NINTH_EDITION',
  'TENTH_EDITION',
]);

// --- Tables ---

// User Table
export const users = pgTable('User', {
  id: serial('id').primaryKey(),
  createdAt: timestamp('createdAt', { mode: 'date' }).defaultNow().notNull(),
  updatedAt: timestamp('updatedAt', { mode: 'date' }).defaultNow().notNull(), // Note: Handle auto-updating via DB triggers or application level
  email: text('email').unique().notNull(),
  name: text('name'),
  password: text('password').notNull(),
  admin: boolean('admin').default(false).notNull(),
});

// Quiz Table
export const quizzes = pgTable('Quiz', {
  id: serial('id').primaryKey(),
  createdAt: timestamp('createdAt', { mode: 'date' }).defaultNow().notNull(),
  updatedAt: timestamp('updatedAt', { mode: 'date' }).defaultNow().notNull(),
  seed: integer('seed').notNull(),
  completed: boolean('completed').default(false).notNull(),
  score: integer('score'),
  userId: integer('userId')
    .notNull()
    .references(() => users.id, { onDelete: 'restrict', onUpdate: 'cascade' }),
});

// Question Table
export const questions = pgTable('Question', {
  id: serial('id').primaryKey(),
  createdAt: timestamp('createdAt', { mode: 'date' }).defaultNow().notNull(),
  updatedAt: timestamp('updatedAt', { mode: 'date' }).defaultNow().notNull(),
  imageUrl: text('imageUrl').notNull(),
  answer: text('answer').notNull(),
  quizId: integer('quizId')
    .notNull()
    .references(() => quizzes.id, { onDelete: 'restrict', onUpdate: 'cascade' }),
});

// Card Table
export const cards = pgTable('Card', {
  id: serial('id').primaryKey(),
  createdAt: timestamp('createdAt', { mode: 'date' }).defaultNow().notNull(),
  updatedAt: timestamp('updatedAt', { mode: 'date' }).defaultNow().notNull(),
  title: text('title').notNull(),
  set: setEnum('set').notNull(),
  year: integer('year').notNull(),
});

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
}));