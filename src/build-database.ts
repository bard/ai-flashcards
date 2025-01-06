import { pino } from "pino";
import playwright from "playwright";
import sqlite from "better-sqlite3";
import { OpenAI } from "openai";
import { createOrUpdateDatabase } from "./etl.js";

const logger = pino();
const openai = new OpenAI();
const browser = await playwright.chromium.connect("ws://127.0.0.1:4000/");
const db = new sqlite("data.db");
await createOrUpdateDatabase(
  { maxServicesToScrape: 3 },
  { browser, db, openai, logger },
);
await browser.close();
