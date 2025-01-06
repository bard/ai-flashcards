import playwright from "playwright";
import sqlite from "better-sqlite3";
import { createOrUpdateDatabase } from "./etl.js";

import { OpenAI } from "openai";

const openai = new OpenAI();
const browser = await playwright.chromium.connect("ws://127.0.0.1:4000/");
const db = new sqlite("data.db");
await createOrUpdateDatabase(
  {
    maxServices: 3,
    onProgress(message) {
      console.log(message);
    },
  },
  { browser, db, openai },
);
await browser.close();
