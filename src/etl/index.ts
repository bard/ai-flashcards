import { z } from "zod";
import sleep from "sleep-promise";
import { pino, type Logger } from "pino";
import playwright from "playwright";
import sqlite from "better-sqlite3";
import { OpenAI } from "openai";
import { fileURLToPath } from "node:url";
import type { ServiceLink } from "../types.js";
import {
  extractServiceFeaturesWithLlm,
  extractTaaftServiceBasicInfo,
  extractTaaftTrendingServices,
  generateQuestionAnswerPair,
} from "./operations.js";
import { fetchPageContentWithPlaywright } from "./util.js";

const TAAFT_TRENDING_PAGE_URL = "https://theresanaiforthat.com/trending/";

const main = async (): Promise<void> => {
  const logger = pino();
  const openai = new OpenAI();
  const browser = await playwright.chromium.connect("ws://127.0.0.1:4000/");
  const db = new sqlite("data.db");
  await createOrUpdateDatabase(
    { maxServicesToScrape: 4 },
    { browser, db, openai, logger },
  );
  await browser.close();
};

export const createOrUpdateDatabase = async (
  { maxServicesToScrape }: { maxServicesToScrape: number },
  deps: {
    browser: playwright.Browser;
    db: sqlite.Database;
    openai: OpenAI;
    logger?: Logger;
  },
): Promise<void> => {
  ensureDatabaseTables(deps.db);

  deps.logger?.info("fetching trending services on theresanaiforthat.com");
  const serviceLinks = extractTaaftTrendingServices(
    await fetchPageContentWithPlaywright(deps.browser, TAAFT_TRENDING_PAGE_URL),
  ).map((link) => ({
    // ensure absolute url
    ...link,
    href: new URL(link.href, TAAFT_TRENDING_PAGE_URL).href,
  }));

  const newServiceLinks = filterOutExistingServiceLinks(serviceLinks, {
    db: deps.db,
    logger: deps.logger,
  });

  for (const serviceLink of newServiceLinks.slice(0, maxServicesToScrape)) {
    // slow down to avoid abusing upstream
    await sleep(Math.floor(Math.random() * 2000) + 2000);

    deps.logger?.info(`fetching information for ${serviceLink.href}`);
    const { descriptions, tags } = await extractTaaftServiceBasicInfo(
      await fetchPageContentWithPlaywright(deps.browser, serviceLink.href),
    );

    deps.logger?.info(`extracting features for ${serviceLink.href}`);
    const { goals, methods, fields } = await extractServiceFeaturesWithLlm(
      { descriptions, tags },
      { openai: deps.openai },
    );

    const serviceId = crypto.randomUUID();
    const flashcards = await Promise.all(
      ["goals", "fields", "methods"].map(async (feature) => {
        const qaPair = await generateQuestionAnswerPair({
          service: {
            ...serviceLink,
            descriptions,
            tags,
            fields,
            goals,
            methods,
          },
          featureToAskAbout: feature,
        });
        return {
          id: crypto.randomUUID(),
          question: qaPair.question,
          answer: qaPair.answer,
          feature,
          service_id: serviceId,
        };
      }),
    );

    const insertServiceStmt = deps.db.prepare(
      "INSERT INTO services (id, url, data) VALUES (?, ?, ?)",
    );
    const insertFlashcardStmt = deps.db.prepare(
      "INSERT INTO flashcards (id, question, answer, feature, service_id) VALUES (?, ?, ?, ?, ?)",
    );
    const insertTransaction = deps.db.transaction(() => {
      insertServiceStmt.run(
        serviceId,
        serviceLink.href,
        JSON.stringify(
          {
            name: serviceLink.name,
            descriptions,
            tags,
            fields,
            goals,
            methods,
          },
          null,
          2,
        ),
      );

      for (const flashcard of flashcards) {
        insertFlashcardStmt.run(
          flashcard.id,
          flashcard.question,
          flashcard.answer,
          flashcard.feature,
          flashcard.service_id,
        );
      }
    });

    insertTransaction();
  }
};

const ensureDatabaseTables = (db: sqlite.Database): void => {
  db.prepare(
    `
    CREATE TABLE IF NOT EXISTS services (
      id TEXT PRIMARY KEY,
      url TEXT UNIQUE,
      data TEXT
    );
  `,
  ).run();

  db.prepare(
    `
    CREATE TABLE IF NOT EXISTS flashcards (
      id TEXT PRIMARY KEY,
      question TEXT,
      answer TEXT,
      feature TEXT,
      service_id TEXT,
      FOREIGN KEY(service_id) REFERENCES services(id)
    );
  `,
  ).run();
};

const filterOutExistingServiceLinks = (
  serviceLinks: ServiceLink[],
  deps: { db: sqlite.Database; logger?: { info: (message: string) => void } },
): ServiceLink[] => {
  const serviceUrls = serviceLinks.map((service) => service.href);
  const existingServicesUrls = deps.db
    .prepare(
      `SELECT url FROM services WHERE url IN (${serviceUrls
        .map(() => "?")
        .join(", ")})`,
    )
    .all(...serviceUrls)
    .map((record) => z.object({ url: z.string() }).parse(record))
    .map((service) => service.url);

  if (existingServicesUrls.length > 0) {
    deps.logger?.info(
      `skipping fetching information for ${existingServicesUrls.length} services (already in db)`,
    );
  }
  const newServices = serviceLinks.filter(
    (service) => !existingServicesUrls.includes(service.href),
  );
  return newServices;
};

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  await main();
}
