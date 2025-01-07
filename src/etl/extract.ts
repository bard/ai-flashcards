import * as cheerio from "cheerio";
import type playwright from "playwright";

export const extractTaaftTrendingServicesHrefs = (
  taaftTrendingPageContent: string,
): string[] => {
  const $ = cheerio.load(taaftTrendingPageContent);

  const hrefs: string[] = [];

  $("a.ai_link").each((_, element) => {
    const href = $(element).attr("href");
    if (href !== undefined) {
      hrefs.push(href);
    }
  });

  return hrefs;
};

export const fetchPageContentWithPlaywright = async (
  browser: playwright.Browser,
  url: string,
): Promise<string> => {
  const page = await browser.newPage();
  await page.setExtraHTTPHeaders({
    "User-Agent":
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/110.0.0.0 Safari/537.36",
    "Accept-Language": "en-US,en;q=0.9",
  });
  await page.goto(url, { waitUntil: "domcontentloaded" });
  const content = await page.content();
  return content;
};

export const extractTaaftServiceBasicInfo = async (
  taaftServicePageContent: string,
): Promise<ServiceDescription> => {
  const $ = cheerio.load(taaftServicePageContent);

  const name = $(".title_inner").text();

  const description = $(".description").first().find("p").text().trim();

  const tags: string[] = [];
  $(".tags .tag:not(.price)").each((_, el) => {
    const tag = $(el).text().trim();
    tags.push(tag);
  });

  return { name, tags, descriptions: [description] };
};
