import { pino } from "pino";
import { OpenAI } from "openai";
import { fileURLToPath } from "node:url";
import { FileCsvLoader } from "./load-stdout-csv.js";
import { JinaOpenaiExtractor } from "./extract-jina-openai.js";
import { performEtl } from "./orchestration.js";

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const logger = pino();
  const openai = new OpenAI();

  const extractor = new JinaOpenaiExtractor({ logger, openai, fetch });
  const loader = new FileCsvLoader("/tmp/flashcards.csv");

  await performEtl(
    { maxServicesToScrape: 2, urlsToSkip: [] },
    { extractor, loader, openai, logger },
  );
}
