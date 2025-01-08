import playwright from "playwright";
import { pino } from "pino";
import { OpenAI } from "openai";
import { fileURLToPath } from "node:url";
import { FileCsvLoader } from "./load-stdout-csv.js";
import { JinaOpenaiExtractor } from "./extract-jina-openai.js";
import { PlaywrightExtractor } from "./extract-playwright.js";
import { performEtl } from "./orchestration.js";
import { type Config, parseEnvConfig } from "./config.js";
import type { Extractor, Loader } from "./types.js";
import { ApiCsvLoader } from "./load-api-csv.js";
import { ZodError } from "zod";

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const logger = pino();

  let config: Config;
  try {
    config = parseEnvConfig(process.env);
  } catch (err) {
    if (err instanceof ZodError) {
      logger.error(err.message);
    }
    process.exit(1);
  }

  const openai = new OpenAI({ apiKey: config.OPENAI_API_KEY });

  let extractor: Extractor;
  switch (config.EXTRACTOR) {
    case "jina-openai": {
      extractor = new JinaOpenaiExtractor({ logger, openai, fetch });
      break;
    }
    case "playwright": {
      const browser = await playwright.chromium.launch({ headless: false });
      extractor = new PlaywrightExtractor({ browser, logger });
      break;
    }
  }

  let loader: Loader;
  switch (config.LOADER) {
    case "api-csv": {
      loader = new ApiCsvLoader({
        apiEndpoint: config.LOAD_TARGET,
        requestHeaders: { "x-api-key": config.API_SECRET },
      });
      break;
    }
    case "file-csv": {
      loader = new FileCsvLoader(config.LOAD_TARGET);
      break;
    }
  }

  await performEtl(
    { maxServicesToScrape: config.MAX_SERVICES_TO_SCRAPE },
    { extractor, loader, openai, logger },
  );
}
