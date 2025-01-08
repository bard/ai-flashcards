import type { Flashcard } from "../types.js";
import type { Loader } from "./types.js";

import { format } from "@fast-csv/format";
import fetch from "node-fetch";

export class ApiCsvLoader implements Loader {
  private apiEndpoint: string;

  constructor(apiEndpoint: string) {
    this.apiEndpoint = apiEndpoint;
  }

  async setup() {}

  async load(flashcards: Flashcard[]): Promise<void> {
    const csvStream = format({ headers: ["question", "answer"] });
    const csvData: string[] = [];

    csvStream.on("data", (chunk) => csvData.push(chunk.toString()));
    csvStream.on("end", async () => {
      const csvString = csvData.join("");
      await fetch(this.apiEndpoint, {
        method: "POST",
        headers: {
          "Content-Type": "text/csv",
        },
        body: csvString,
      });
    });

    for (const flashcard of flashcards) {
      csvStream.write(flashcard);
    }
    csvStream.end();
  }
}
