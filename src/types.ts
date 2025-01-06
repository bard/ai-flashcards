export interface ServiceLink {
  name: string;
  href: string;
}

export interface ServiceDescription {
  descriptions: string[];
  tags: string[];
}

export interface ServiceFeatures {
  goals: string[];
  methods: string[];
  fields: string[];
}

export type Service = ServiceLink & ServiceDescription & ServiceFeatures;

export interface QuestionAnswerPair {
  question: string;
  answer: string;
}
