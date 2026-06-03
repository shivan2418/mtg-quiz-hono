import { db } from "../src/db";
import { sql } from "drizzle-orm";

await db.execute(sql`CREATE EXTENSION IF NOT EXISTS pg_trgm`);
await db.execute(sql`CREATE EXTENSION IF NOT EXISTS unaccent`);
await db.execute(sql`
  CREATE OR REPLACE FUNCTION immutable_unaccent(text) RETURNS text
  LANGUAGE sql IMMUTABLE PARALLEL SAFE AS
  $$ SELECT unaccent('unaccent', $1) $$;
`);

console.log("Extensions and immutable_unaccent created.");
process.exit(0);
