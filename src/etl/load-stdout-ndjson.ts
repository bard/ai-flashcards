import type { Flashcard } from "../types.js";
import type { Loader } from "./types.js";

export class StdoutNdjsonLoader implements Loader {
  async setup() {}

  async load(flashcards: Flashcard[]): Promise<void> {
    for (const flashcard of flashcards) {
      process.stdout.write(JSON.stringify(flashcard));
    }
  }
}
