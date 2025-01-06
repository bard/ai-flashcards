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
} from "./operations.js";

const TAAFT_TRENDING_PAGE_URL = "https://theresanaiforthat.com/trending/";

const main = async () => {
  const logger = pino();
  const openai = new OpenAI();
  const browser = await playwright.chromium.connect("ws://127.0.0.1:4000/");
  const db = new sqlite("data.db");
  await createOrUpdateDatabase(
    { maxServicesToScrape: 3 },
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
) => {
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
    deps.logger?.info(
      `fetching and extracting information for ${serviceLink.href}`,
    );

    // slow down to avoid abusing upstream
    await sleep(Math.floor(Math.random() * 2000) + 2000);

    const { descriptions, tags } = await extractTaaftServiceBasicInfo(
      await fetchPageContentWithPlaywright(deps.browser, serviceLink.href),
    );
    const { goals, methods, fields } = await extractServiceFeaturesWithLlm(
      { descriptions, tags },
      { openai: deps.openai },
    );

    const id = crypto.randomUUID();
    deps.db
      .prepare("INSERT INTO services (id, name, url, data) VALUES (?, ?, ?, ?)")
      .run(
        id,
        serviceLink.name,
        serviceLink.href,
        JSON.stringify({ descriptions, tags, fields, goals, methods }, null, 2),
      );
  }
};

const ensureDatabaseTables = (db: sqlite.Database): void => {
  db.prepare(
    `
    CREATE TABLE IF NOT EXISTS services (
      id TEXT PRIMARY KEY,
      url TEXT UNIQUE,
      name TEXT,
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
      service_id TEXT,
      FOREIGN KEY(service_id) REFERENCES services(id)
    );
  `,
  ).run();
};

const fetchPageContentWithPlaywright = async (
  browser: playwright.Browser,
  url: string,
): Promise<string> => {
  const page = await browser.newPage();
  await page.setExtraHTTPHeaders({
    "User-Agent":
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/110.0.0.0 Safari/537.36",
    "Accept-Language": "en-US,en;q=0.9",
  });
  await page.goto(url, { waitUntil: "domcontentloaded" });
  const content = await page.content();
  return content;
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
      `information for ${existingServicesUrls.length} already exists in database, not scraping`,
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
