export interface ServicesTable {
  id: string;
  url: string;
  data: string;
}

export interface FlashcardsTable {
  id: string;
  question: string;
  answer: string;
}

export interface Database {
  services: ServicesTable;
  flashcards: FlashcardsTable;
}
