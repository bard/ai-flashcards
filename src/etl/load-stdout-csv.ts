import type { Flashcard } from "../types.js";
import type { Loader } from "./types.js";

export class StdoutCSVLoader implements Loader {
  async setup() {}

  async load(flashcards: Flashcard[]): Promise<void> {
    // implement ai!
  }
}
