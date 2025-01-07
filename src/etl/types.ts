import type { Flashcard } from "../types.js";

export interface Loader {
  setup(): Promise<void>;
  load(flashcards: Flashcard[]): Promise<void>;
}
