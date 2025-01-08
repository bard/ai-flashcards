import type { Flashcard, ServiceBasicDescription } from "../types.js";

export interface Loader {
  setup(): Promise<void>;
  load(flashcards: Flashcard[]): Promise<void>;
}

export interface Extractor {
  fetchTaaftTrendingServicesUrls(params: {
    limit: number;
    // drop paramater ai!
    urlsToSkip?: string[];
  }): Promise<string[]>;
  fetchTaaftServiceInfo(params: {
    serviceUrl: string;
  }): Promise<ServiceBasicDescription>;
}

export interface Config {
  openAiApiKey: string;
  maxServicesToScrape: number;
  extractor: "jina-openai" | "playwright";
  loader: "file-csv" | "api-csv";
  loadTarget: string;
}
