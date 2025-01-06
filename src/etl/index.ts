import sleep from "sleep-promise";
import { pino, type Logger } from "pino";
import playwright from "playwright";
import { Kysely, SqliteDialect } from "kysely";
import sqlite from "better-sqlite3";
import { OpenAI } from "openai";
import { fileURLToPath } from "node:url";
import type { ServiceLink } from "../types.js";
import type { Database } from "../db/schema.js";
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

export const createOrUpdateDatabase = async (
  { maxServicesToScrape }: { maxServicesToScrape: number },
  deps: {
    browser: playwright.Browser;
    db: Kysely<Database>;
    openai: OpenAI;
    logger?: Logger;
  },
): Promise<void> => {
  await ensureDatabaseTables(deps.db);

  deps.logger?.info("fetching trending services on theresanaiforthat.com");
  const serviceLinks = extractTaaftTrendingServices(
    await fetchPageContentWithPlaywright(deps.browser, TAAFT_TRENDING_PAGE_URL),
  ).map((link) => ({
    // ensure absolute url
    ...link,
    href: new URL(link.href, TAAFT_TRENDING_PAGE_URL).href,
  }));

  const newServiceLinks = await filterOutExistingServiceLinks(serviceLinks, {
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

    await deps.db
      .insertInto("services")
      .values({
        id: serviceId,
        url: serviceLink.href,
        data: JSON.stringify(
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
      })
      .execute();

    await deps.db.insertInto("flashcards").values(flashcards).execute();
  }
};

const ensureDatabaseTables = async (db: Kysely<Database>): Promise<void> => {
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

const filterOutExistingServiceLinks = async (
  serviceLinks: ServiceLink[],
  deps: { db: Kysely<Database>; logger?: { info: (message: string) => void } },
): Promise<ServiceLink[]> => {
  const serviceUrls = serviceLinks.map((service) => service.href);
  const existingServicesUrls = await deps.db
    .selectFrom("services")
    .select("url")
    .where("url", "in", serviceUrls)
    .execute()
    .then((rows) => rows.map((row) => row.url));

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
