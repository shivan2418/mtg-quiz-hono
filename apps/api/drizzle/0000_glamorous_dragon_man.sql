CREATE EXTENSION IF NOT EXISTS pg_trgm;--> statement-breakpoint
CREATE EXTENSION IF NOT EXISTS unaccent;--> statement-breakpoint
CREATE FUNCTION immutable_unaccent(text) RETURNS text
  LANGUAGE sql IMMUTABLE PARALLEL SAFE AS
  $$ SELECT unaccent('unaccent', $1) $$;--> statement-breakpoint
CREATE TYPE "public"."Set" AS ENUM('ALPHA', 'BETA', 'UNLIMITED', 'REVISED', 'FOURTH_EDITION', 'FIFTH_EDITION', 'SIXTH_EDITION', 'SEVENTH_EDITION', 'EIGHTH_EDITION', 'NINTH_EDITION', 'TENTH_EDITION');--> statement-breakpoint
CREATE TABLE "Card" (
	"id" serial PRIMARY KEY NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL,
	"title" text NOT NULL,
	"set" "Set" NOT NULL,
	"year" integer NOT NULL,
	"title_norm" text GENERATED ALWAYS AS (lower(immutable_unaccent("Card"."title"))) STORED
);
--> statement-breakpoint
CREATE TABLE "Question" (
	"id" serial PRIMARY KEY NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL,
	"imageUrl" text NOT NULL,
	"answer" text NOT NULL,
	"quizId" integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE "Quiz" (
	"id" serial PRIMARY KEY NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL,
	"seed" integer NOT NULL,
	"completed" boolean DEFAULT false NOT NULL,
	"score" integer,
	"userId" integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE "User" (
	"id" serial PRIMARY KEY NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL,
	"email" text NOT NULL,
	"name" text,
	"password" text NOT NULL,
	"admin" boolean DEFAULT false NOT NULL,
	CONSTRAINT "User_email_unique" UNIQUE("email")
);
--> statement-breakpoint
ALTER TABLE "Question" ADD CONSTRAINT "Question_quizId_Quiz_id_fk" FOREIGN KEY ("quizId") REFERENCES "public"."Quiz"("id") ON DELETE restrict ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "Quiz" ADD CONSTRAINT "Quiz_userId_User_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE restrict ON UPDATE cascade;--> statement-breakpoint
CREATE INDEX "cards_title_norm_trgm" ON "Card" USING gin ("title_norm" gin_trgm_ops);