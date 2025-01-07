import type { Kysely } from "kysely";
import type { Database } from "../db/schema.js";
import type { Flashcard } from "../types.js";
import type { Loader } from "./types.js";

export class DatabaseLoader implements Loader {
  private db: Kysely<Database>;

  constructor(db: Kysely<Database>) {
    this.db = db;
  }

  async setup() {
    await this.db.schema
      .createTable("services")
      .ifNotExists()
      .addColumn("id", "text", (col) => col.primaryKey())
      .addColumn("url", "text", (col) => col.unique())
      .addColumn("data", "text")
      .execute();

    await this.db.schema
      .createTable("flashcards")
      .ifNotExists()
      .addColumn("id", "text", (col) => col.primaryKey())
      .addColumn("question", "text")
      .addColumn("answer", "text")
      .addColumn("feature", "text")
      .addColumn("service_id", "text")
      .addForeignKeyConstraint("fk_service_id", ["service_id"], "services", [
        "id",
      ])
      .execute();
  }

  async load(flashcards: Flashcard[]): Promise<void> {
    await this.db.transaction().execute(async (trx) => {
      for (const flashcard of flashcards) {
        trx.insertInto("flashcards").values({
          id: crypto.randomUUID(),
          question: flashcard.question,
          answer: flashcard.answer,
        });
      }
    });
  }
}
