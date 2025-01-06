import * as fs from "node:fs/promises";

export const getTaaftTrendingPageMockContent = () => {
  return readFixture("./https:__theresanaiforthat.com_trending_.html");
};

export const getTaaftServicePageMockContent = async () => {
  return readFixture("./https:__theresanaiforthat.com_ai_magic-avatars_.html");
};

const readFixture = async (path: string): Promise<string> => {
  return await fs.readFile(new URL(path, import.meta.url).pathname, "utf8");
};
