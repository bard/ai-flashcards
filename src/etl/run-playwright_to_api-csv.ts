import playwright from "playwright";
import { pino } from "pino";
import { OpenAI } from "openai";
import { fileURLToPath } from "node:url";
import { performEtl } from "./orchestration.js";
import { ApiCsvLoader } from "./load-api-csv.js";
import { PlaywrightExtractor } from "./extract-playwright.js";

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const logger = pino();
  const openai = new OpenAI();
  // const browser = await playwright.chromium.connect("ws://127.0.0.1:4000/");
  const browser = await playwright.chromium.launch({ headless: false });

  const extractor = new PlaywrightExtractor({ browser, logger });
  const loader = new ApiCsvLoader({
    apiEndpoint: "http://localhost/api/admin/import",
    requestHeaders: { "x-api-key": "secret" },
  });

  await performEtl(
    { maxServicesToScrape: 5, urlsToSkip: [] },
    { extractor, loader, openai, logger },
  );

  await browser.close();
}
