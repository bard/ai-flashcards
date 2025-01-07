import { format } from "@fast-csv/format";
import type { Flashcard } from "../types.js";
import type { Loader } from "./types.js";

export class StdoutCSVLoader implements Loader {
  async setup() {}

  async load(flashcards: Flashcard[]): Promise<void> {
    const csvStream = format({ headers: ["question", "answer"] });
    csvStream.pipe(process.stdout).on("end", () => process.exit());

    for (const flashcard of flashcards) {
      csvStream.write({ question: flashcard.question, answer: flashcard.answer });
      process.stdout.write(csvLine);
    }
    csvStream.end();
  }
}
