import { z } from "zod";
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

export const extractTaaftServiceInformation = async (
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

export const extractExtendedServiceInfoWithLlm = async (
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
  // move table setup to a function named `ensureDatabaseTables` ai!
  deps.db
    .prepare(
      `
      CREATE TABLE IF NOT EXISTS services (
        id TEXT PRIMARY KEY,
        url TEXT UNIQUE,
        name TEXT,
        data TEXT
      );
    `,
    )
    .run();

  deps.db
    .prepare(
      `
      CREATE TABLE IF NOT EXISTS flashcards (
        id TEXT PRIMARY KEY,
        question TEXT,
        answer TEXT,
        service_id TEXT,
        FOREIGN KEY(service_id) REFERENCES services(id)
      );
    `,
    )
    .run();

  deps.logger?.info("fetching theresanaiforthat.com trending page");
  const taaftTrendingPageContent = await fetchPageContentWithPlaywright(
    deps.browser,
    TAAFT_TRENDING_PAGE_URL,
  );
  const services = extractTaaftTrendingServices(taaftTrendingPageContent);

  const serviceUrls = services.map((service) => service.url);
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
  const newServices = services.filter(
    (service) => !existingServicesUrls.includes(service.url),
  );

  let scrapesLeft = maxServicesToScrape;
  for (const service of newServices) {
    if (scrapesLeft === 0) {
      break;
    }

    deps.logger?.info(`scraping: ${service.name} at ${service.url}`);

    const delay = Math.floor(Math.random() * 2000) + 2000;
    await new Promise((resolve) => setTimeout(resolve, delay));

    const servicePageContent = await fetchPageContentWithPlaywright(
      deps.browser,
      service.url,
    );
    const unstructuredInfo =
      await extractTaaftServiceInformation(servicePageContent);
    const structuredInfo = await extractExtendedServiceInfoWithLlm(
      unstructuredInfo,
      { openai: deps.openai },
    );

    const id = crypto.randomUUID();
    deps.db
      .prepare("INSERT INTO services (id, name, url, data) VALUES (?, ?, ?, ?)")
      .run(
        id,
        service.name,
        service.url,
        JSON.stringify(
          {
            descriptions: unstructuredInfo.descriptions,
            tags: unstructuredInfo.tags,
            fields: structuredInfo.fields,
            goals: structuredInfo.goals,
            methods: structuredInfo.methods,
          },
          null,
          2,
        ),
      );

    scrapesLeft--;
  }
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
