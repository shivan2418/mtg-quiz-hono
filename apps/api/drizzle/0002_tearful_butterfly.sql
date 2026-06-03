ALTER TABLE "Quiz" ADD COLUMN IF NOT EXISTS "format" text DEFAULT 'classic' NOT NULL;--> statement-breakpoint
ALTER TABLE "Quiz" RENAME COLUMN "completed" TO "completedAt";--> statement-breakpoint
ALTER TABLE "Quiz" ALTER COLUMN "completedAt" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "Quiz" ALTER COLUMN "completedAt" DROP DEFAULT;--> statement-breakpoint
ALTER TABLE "Quiz" ALTER COLUMN "completedAt" TYPE timestamp USING NULL;
