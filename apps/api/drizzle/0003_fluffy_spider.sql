ALTER TABLE "Question" ADD COLUMN "cardId" integer;--> statement-breakpoint
ALTER TABLE "Question" ADD CONSTRAINT "Question_cardId_Card_id_fk" FOREIGN KEY ("cardId") REFERENCES "Card"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
