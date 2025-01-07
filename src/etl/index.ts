import { pino } from "pino";
import playwright from "playwright";
import { Kysely, SqliteDialect } from "kysely";
import sqlite from "better-sqlite3";
import { OpenAI } from "openai";
import { fileURLToPath } from "node:url";
import type { Database } from "../db/schema.js";

export const TAAFT_TRENDING_PAGE_URL =
  "https://theresanaiforthat.com/trending/";

const main = async (): Promise<void> => {
  const logger = pino();
  const openai = new OpenAI();
  const browser = await playwright.chromium.connect("ws://127.0.0.1:4000/");
  const db = new Kysely<Database>({
    dialect: new SqliteDialect({
      database: new sqlite("data.db"),
    }),
  });

  await createOrUpdateDatabase(
    { maxServicesToScrape: 4 },
    { browser, db, openai, logger },
  );

  await browser.close();
};

export const ensureDatabaseTables = async (
  db: Kysely<Database>,
): Promise<void> => {
  await db.schema
    .createTable("services")
    .ifNotExists()
    .addColumn("id", "text", (col) => col.primaryKey())
    .addColumn("url", "text", (col) => col.unique())
    .addColumn("data", "text")
    .execute();

  await db.schema
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
};

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  await main();
}
