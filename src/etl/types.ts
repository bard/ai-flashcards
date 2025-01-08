import type { Flashcard, ServiceBasicDescription } from "../types.js";

export interface Loader {
  setup(): Promise<void>;
  load(flashcards: Flashcard[]): Promise<void>;
}

export interface Extractor {
  fetchTaaftTrendingServicesUrls(params: {
    limit: number;
    urlsToSkip?: string[];
  }): Promise<string[]>;
  fetchTaaftServiceInfo(params: {
    serviceUrl: string;
  }): Promise<ServiceBasicDescription>;
}
