import type { Flashcard } from "../types.js";
import type { Loader } from "./types.js";

export class ApiCsvLoader implements Loader {
  async setup() {}

  load(flashcards: Flashcard[]): Promise<void> {
    // format flashcards as csv and post them to an api endpoint configured via a constructor argument ai!
  }
}
