import { z } from "zod";
import sleep from "sleep-promise";
import type { OpenAI } from "openai";
import { zodResponseFormat } from "openai/helpers/zod";
import type sqlite from "better-sqlite3";
import type playwright from "playwright";
import * as cheerio from "cheerio";
import type {
  ServiceLink,
  ServiceDescription,
  ServiceFeatures,
} from "./types.js";

const TAAFT_TRENDING_PAGE_URL = "https://theresanaiforthat.com/trending/";

export const extractTaaftServiceBasicInfo = async (
  taaftServicePageContent: string,
): Promise<ServiceDescription> => {
  const $ = cheerio.load(taaftServicePageContent);

  const description = $(".description").first().find("p").text().trim();

  const tags: string[] = [];
  $(".tags .tag:not(.price)").each((_, el) => {
    const tag = $(el).text().trim();
    tags.push(tag);
  });

  return { tags, descriptions: [description] };
};

export const extractTaaftTrendingServices = (
  taaftTrendingPageContent: string,
): ServiceLink[] => {
  const $ = cheerio.load(taaftTrendingPageContent);

  const services: ServiceLink[] = [];

  $("a.ai_link").each((_, element) => {
    const name = $(element).text();
    const url = $(element).attr("href");
    if (name !== undefined && url !== undefined) {
      services.push({
        name,
        url: new URL(url, TAAFT_TRENDING_PAGE_URL).href,
      });
    }
  });

  return services;
};

export const extractServiceFeaturesWithLlm = async (
  unstructuredServiceInfo: ServiceDescription,
  deps: { openai: OpenAI },
): Promise<ServiceFeatures> => {
  const SYSTEM_PROMPT =
    "You are an assistant that, given information about online services that use AI-based methods, extracts information such as the service's goals, what fields it operates in, and what AI-based methods it uses in pursuit of the goals.";
  const ONE_SHOT_EXAMPLE_PROMPT = `{
  "description": "Sketch2Photo AI is a cutting-edge online platform that transforms your hand-drawn sketches into stunning, photorealistic images using advanced artificial intelligence. Whether you’re a professional designer, an aspiring artist, or someone with a creative idea, Sketch2Photo AI brings your imagination to life with precision and realism. Simply upload your sketch, and our AI-powered service enhances it with realistic textures, colors, and details, turning your vision into reality in seconds.",
  "tags": [
    "AI Image Creation",
    "Sketch to Image",
    "Photorealistic Rendering",
    "Concept Art Tool",
    "Digital Illustration"
  ]
}`;
  const ONE_SHOT_EXAMPLE_RESPONSE = `{
  "fields": [
    "Digital Illustration",
    "Concept Art",
    "Photorealistic Rendering"
  ],
  "goals": [
    "Transform hand-drawn sketches into photorealistic images",
    "Enhance user creativity by turning imaginative ideas into realistic visuals",
    "Provide an efficient and precise tool for designers and artists to visualize concepts"
  ],
  "methods": [
    "Advanced image generation models for creating photorealistic textures, colors, and details",
    "Neural networks for sketch interpretation and enhancement",
    "Real-time AI-powered rendering for rapid image transformation"
  ]
}`;
  const PROMPT = JSON.stringify(unstructuredServiceInfo);

  const llmResponse = await deps.openai.beta.chat.completions.parse({
    model: "gpt-4o-2024-08-06",
    messages: [
      { role: "system", content: SYSTEM_PROMPT },
      { role: "user", content: ONE_SHOT_EXAMPLE_PROMPT },
      { role: "assistant", content: ONE_SHOT_EXAMPLE_RESPONSE },
      { role: "user", content: PROMPT },
    ],
    response_format: zodResponseFormat(
      z.object({
        methods: z.array(z.string()),
        fields: z.array(z.string()),
        goals: z.array(z.string()),
      }),
      "extended_service_info",
    ),
  });

  const response = llmResponse.choices[0].message.parsed;
  if (response === null) {
    throw new Error("nothing");
  } else {
    const { methods, goals, fields } = response;
    return { methods, goals, fields };
  }
};

export const createOrUpdateDatabase = async (
  { maxServicesToScrape }: { maxServicesToScrape: number },
  deps: {
    browser: playwright.Browser;
    db: sqlite.Database;
    openai: OpenAI;
    logger?: { info: (message: string) => void };
  },
) => {
  ensureDatabaseTables(deps.db);

  deps.logger?.info("fetching trending services on theresanaiforthat.com");
  const serviceLinks = extractTaaftTrendingServices(
    await fetchPageContentWithPlaywright(deps.browser, TAAFT_TRENDING_PAGE_URL),
  );

  const newServiceLinks = filterOutExistingServiceLinks(serviceLinks, {
    db: deps.db,
    logger: deps.logger,
  });

  for (const serviceLink of newServiceLinks.slice(0, maxServicesToScrape)) {
    deps.logger?.info(
      `fetching and extracting information for ${serviceLink.url}`,
    );

    // slow down to avoid abusing upstream
    await sleep(Math.floor(Math.random() * 2000) + 2000);

    const { descriptions, tags } = await extractTaaftServiceBasicInfo(
      await fetchPageContentWithPlaywright(deps.browser, serviceLink.url),
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
        serviceLink.url,
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
  const serviceUrls = serviceLinks.map((service) => service.url);
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
    (service) => !existingServicesUrls.includes(service.url),
  );
  return newServices;
};
