export interface ServiceBasicDescription {
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

export type ExtendedServiceDescription = ServiceBasicDescription &
  ServiceFeatures;

export interface QuestionAnswerPair {
  question: string;
  answer: string;
}

export interface Flashcard {
  question: string;
  answer: string;
  extra: any;
}
