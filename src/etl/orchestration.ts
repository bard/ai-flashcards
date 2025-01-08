import type { Logger } from "pino";
import type { OpenAI } from "openai";
import { generateFlashcards } from "./transform.js";
import type { Extractor, Loader } from "./types.js";

export const performEtl = async (
  params: {
    maxServicesToScrape: number;
  },
  deps: {
    logger: Logger;
    openai: OpenAI;
    extractor: Extractor;
    loader: Loader;
  },
): Promise<void> => {
  await deps.loader.setup();

  const taafTrendingServicesUrls =
    await deps.extractor.fetchTaaftTrendingServicesUrls({
      limit: params.maxServicesToScrape,
    });

  for (const serviceUrl of taafTrendingServicesUrls) {
    // extract
    const serviceInfo = await deps.extractor.fetchTaaftServiceInfo({
      serviceUrl,
    });

    // transform
    const flashcards = await generateFlashcards(
      { service: serviceInfo },
      { openai: deps.openai, logger: deps.logger },
    );

    // load
    await deps.loader.load(flashcards);
  }
};
