CREATE TABLE "QuizFormat" (
  "id" text PRIMARY KEY NOT NULL,
  "name" text NOT NULL,
  "description" text DEFAULT '' NOT NULL,
  "enabled" boolean DEFAULT true NOT NULL,
  "sortOrder" integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "QuizFormatSet" (
  "id" serial PRIMARY KEY NOT NULL,
  "formatId" text NOT NULL REFERENCES "QuizFormat"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  "setCode" text NOT NULL,
  "position" integer DEFAULT 0 NOT NULL
);
