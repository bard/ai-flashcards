import * as fs from "node:fs/promises";
import { test as baseTest } from "vitest";

export const test = baseTest.extend<{
  taaftTrendingPageContent: string;
  taaftServicePageContent: string;
}>({
  taaftTrendingPageContent: async ({ task: _task }, use) => {
    await use(
      await readFixture("./https:__theresanaiforthat.com_trending_.html"),
    );
  },
  taaftServicePageContent: async ({ task: _task }, use) => {
    await use(
      await readFixture(
        "./https:__theresanaiforthat.com_ai_magic-avatars_.html",
      ),
    );
  },
});

const readFixture = async (path: string): Promise<string> => {
  return await fs.readFile(new URL(path, import.meta.url).pathname, "utf8");
};
