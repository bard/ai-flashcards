export interface BasicServiceInfo {
  name: string;
  url: string;
  descriptions: string[];
  tags: string[];
}

export interface ServiceFeatures {
  goals: string[];
  methods: string[];
  fields: string[];
}

export type FullServiceInfo = BasicServiceInfo & ServiceFeatures;

export interface Flashcard {
  question: string;
  answer: string;
}

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
