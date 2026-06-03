ALTER TABLE "Question" ALTER COLUMN "quizId" SET DATA TYPE uuid;--> statement-breakpoint
ALTER TABLE "Quiz" ALTER COLUMN "id" SET DATA TYPE uuid;--> statement-breakpoint
ALTER TABLE "Quiz" ALTER COLUMN "id" SET DEFAULT gen_random_uuid();--> statement-breakpoint
ALTER TABLE "Quiz" ALTER COLUMN "score" SET DEFAULT 0;--> statement-breakpoint
ALTER TABLE "Quiz" ALTER COLUMN "userId" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "Card" ADD COLUMN "file" text NOT NULL;--> statement-breakpoint
ALTER TABLE "Card" ADD COLUMN "title_compact" text GENERATED ALWAYS AS (regexp_replace(lower(immutable_unaccent("Card"."title")), '[ -]', '', 'g')) STORED;--> statement-breakpoint
ALTER TABLE "Quiz" ADD COLUMN "questionCount" integer DEFAULT 30 NOT NULL;--> statement-breakpoint
ALTER TABLE "Quiz" ADD COLUMN "currentIndex" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "Quiz" ADD COLUMN "results" jsonb DEFAULT '[]'::jsonb NOT NULL;--> statement-breakpoint
CREATE INDEX "cards_title_compact_trgm" ON "Card" USING gin ("title_compact" gin_trgm_ops);