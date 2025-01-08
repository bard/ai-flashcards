import type { Flashcard } from "../types.js";
import type { Loader } from "./types.js";

import { format } from "@fast-csv/format";
// drop node-fetch import, we're using built-in fetch ai!
import fetch from "node-fetch";

export class ApiCsvLoader implements Loader {
  private apiEndpoint: string;

  constructor(apiEndpoint: string) {
    this.apiEndpoint = apiEndpoint;
  }

  async setup() {}

  async load(flashcards: Flashcard[]): Promise<void> {
    const csvString = await new Promise<string>((resolve, reject) => {
      const csvStream = format({ headers: ["question", "answer"] });
      const csvData: string[] = [];

      csvStream.on("data", (chunk) => csvData.push(chunk.toString()));
      csvStream.on("end", () => resolve(csvData.join("")));
      csvStream.on("error", (err) => reject(err));

      for (const flashcard of flashcards) {
        csvStream.write(flashcard);
      }
      csvStream.end();
    });

    await fetch(this.apiEndpoint, {
      method: "POST",
      headers: {
        "Content-Type": "text/csv",
      },
      body: csvString,
    });
  }
}
