import { pino, type Logger } from "pino";
import playwright from "playwright";
import { Kysely, SqliteDialect } from "kysely";
import sqlite from "better-sqlite3";
import { OpenAI } from "openai";
import { fileURLToPath } from "node:url";
import type { Database } from "../db/schema.js";
import {
  fetchTaaftServiceInfo,
  fetchTaaftTrendingServicesUrls,
} from "./extract.js";
import { generateFlashcards } from "./transform.js";
import type { Loader } from "./types.js";
import { DatabaseLoader } from "./load-db.js";

export const TAAFT_TRENDING_PAGE_URL =
  "https://theresanaiforthat.com/trending/";

export const perform = async (
  params: {
    maxServicesToScrape: number;
    urlsToSkip: string[];
  },
  deps: {
    logger: Logger;
    openai: OpenAI;
    browser: playwright.Browser;
    loader: Loader;
  },
): Promise<void> => {
  const { maxServicesToScrape, urlsToSkip } = params;

  await deps.loader.setup();

  const taafTrendingServicesUrls = await fetchTaaftTrendingServicesUrls(
    { limit: maxServicesToScrape, urlsToSkip },
    { logger: deps.logger, browser: deps.browser },
  );

  for (const serviceUrl of taafTrendingServicesUrls) {
    // extract
    deps.logger?.info(`fetching information for ${serviceUrl}`);
    const serviceInfo = await fetchTaaftServiceInfo(
      { serviceUrl },
      { browser: deps.browser, logger: deps.logger },
    );

    // transform
    deps.logger?.info(`generating flashcards for ${serviceUrl}`);
    const flashcards = await generateFlashcards(
      { service: serviceInfo },
      { openai: deps.openai, logger: deps.logger },
    );

    // load
    deps.logger?.info(`loading flashcards for ${serviceUrl}`);
    await deps.loader.load(flashcards);
  }
};

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const logger = pino();
  const openai = new OpenAI();
  const browser = await playwright.chromium.connect("ws://127.0.0.1:4000/");
  const db = new Kysely<Database>({
    dialect: new SqliteDialect({
      database: new sqlite("data.db"),
    }),
  });
  const loader = new DatabaseLoader(db);

  await perform(
    { maxServicesToScrape: 5, urlsToSkip: [] },
    { logger, openai, browser, loader },
  );

  await browser.close();
}
