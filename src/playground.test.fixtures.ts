import { OpenAI } from "openai";
import { test as baseTest } from "vitest";
import playwright from "playwright";

export const test = baseTest.extend<{
  browser: playwright.Browser;
  openai: OpenAI;
}>({
  browser: async ({ task: _task }, use) => {
    const browser = await playwright.chromium.connect("ws://127.0.0.1:4000/");
    //const browser = await playwright.chromium.launch();

    await use(browser);
  },
  openai: async ({ task: _task }, use) => {
    const openai = new OpenAI();
    await use(openai);
  },
});
