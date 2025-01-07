import { Kysely, SqliteDialect } from "kysely";
import { OpenAI } from "openai";
import { test as baseTest } from "vitest";
import playwright from "playwright";
import sqlite from "better-sqlite3";
import type { Database } from "./db/schema.js";

export const test = baseTest.extend<{
  browser: playwright.Browser;
  db: Kysely<Database>;
  openai: OpenAI;
}>({
  browser: async ({ task: _task }, use) => {
    const browser = await playwright.chromium.connect("ws://127.0.0.1:4000/");
    //const browser = await playwright.chromium.launch();

    await use(browser);
  },
  db: async ({ task: _task }, use) => {
    const db = new Kysely<Database>({
      dialect: new SqliteDialect({
        database: new sqlite(":memory:"),
      }),
    });

    await use(db);
  },
  openai: async ({ task: _task }, use) => {
    const openai = new OpenAI();
    await use(openai);
  },
});
