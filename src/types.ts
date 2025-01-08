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
