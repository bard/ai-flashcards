import { format } from "@fast-csv/format";
import type { Logger } from "pino";
import type { Flashcard } from "../types.js";
import type { Loader } from "./types.js";
import fs from "node:fs";

export class FileCsvLoader implements Loader {
  private filePath: string;
  private logger?: Logger;

  constructor(params: { filePath: string; logger?: Logger }) {
    this.filePath = params.filePath;
    this.logger = params.logger;
  }

  async setup() {
    // use async version ai!
    if (fs.existsSync(this.filePath)) {
      fs.truncateSync(this.filePath);
    }
  }

  load(flashcards: Flashcard[]): Promise<void> {
    this.logger?.info(
      `loading ${flashcards.length} flashcards into ${this.filePath}`,
    );

    const csvStream = format({ headers: ["question", "answer"] });
    return new Promise<void>((resolve, reject) => {
      const writeStream = fs.createWriteStream(this.filePath, { flags: "a" });

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
