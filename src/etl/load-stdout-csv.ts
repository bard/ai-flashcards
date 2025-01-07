import type { Flashcard } from "../types.js";
import type { Loader } from "./types.js";

export class StdoutCSVLoader implements Loader {
  async setup() {}

  async load(flashcards: Flashcard[]): Promise<void> {
    const header = "question,answer\n";
    process.stdout.write(header);

    for (const flashcard of flashcards) {
      const csvLine = `"${flashcard.question.replace(/"/g, '""')}","${flashcard.answer.replace(/"/g, '""')}"\n`;
      process.stdout.write(csvLine);
    }
  }
}
