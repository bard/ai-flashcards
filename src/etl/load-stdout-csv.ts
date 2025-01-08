import { format } from "@fast-csv/format";
import type { Flashcard } from "../types.js";
import type { Loader } from "./types.js";
// use node: scheme when importing ai!
import fs from "node:fs";

export class FileCsvLoader implements Loader {
  private filePath: string;

  constructor(filePath: string) {
    this.filePath = filePath;
  }
  async setup() {}

  load(flashcards: Flashcard[]): Promise<void> {
    const csvStream = format({ headers: ["question", "answer"] });
    return new Promise<void>((resolve, reject) => {
      const writeStream = fs.createWriteStream(this.filePath);

      csvStream
        .pipe(writeStream)
        .on("finish", () => resolve())
        .on("error", (err) => reject(err));

      for (const flashcard of flashcards) {
        csvStream.write(flashcard);
      }

      csvStream.end();
    });
  }
}
