import { format } from "@fast-csv/format";
import type { Flashcard } from "../types.js";
import type { Loader } from "./types.js";

export class StdoutCsvLoader implements Loader {
  async setup() {}

  load(flashcards: Flashcard[]): Promise<void> {
    const csvStream = format({ headers: ["question", "answer"] });
    return new Promise((resolve, reject) => {
      csvStream
        .pipe(process.stdout)
        .on("finish", () => resolve())
        .on("error", (err) => reject(err));

      for (const flashcard of flashcards) {
        csvStream.write(flashcard);
      }

      csvStream.end();
    });
  }
}
