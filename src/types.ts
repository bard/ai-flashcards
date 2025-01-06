export interface ServiceDescription {
  name: string;
  descriptions: string[];
  tags: string[];
}

export interface ServiceFeatures {
  goals: string[];
  methods: string[];
  fields: string[];
}

export type Service = ServiceDescription & ServiceFeatures & { url: string };

export interface QuestionAnswerPair {
  question: string;
  answer: string;
}
