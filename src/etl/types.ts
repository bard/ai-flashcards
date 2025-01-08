import type { Flashcard, BasicServiceInfo } from "../types.js";

export interface Loader {
  setup(): Promise<void>;
  load(flashcards: Flashcard[]): Promise<void>;
}

export interface Extractor {
  fetchTaaftTrendingServicesUrls(params: { limit: number }): Promise<string[]>;
  fetchTaaftServiceInfo(params: {
    serviceUrl: string;
  }): Promise<BasicServiceInfo>;
}
