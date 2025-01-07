import type { Logger } from "pino";
import * as cheerio from "cheerio";
import type playwright from "playwright";
import type { ServiceBasicDescription } from "../types.js";

export const TAAFT_TRENDING_PAGE_URL =
  "https://theresanaiforthat.com/trending/";

export const fetchTaaftTrendingServicesUrls = async (
  params: { limit: number; urlsToSkip?: string[] },
  deps: { logger?: Logger; browser: playwright.Browser },
): Promise<string[]> => {
  deps.logger?.info("fetching trending services on theresanaiforthat.com");

  const taaftServicesHrefs = extractTaaftTrendingServicesHrefsFromHtml(
    await fetchPageContentWithPlaywright(TAAFT_TRENDING_PAGE_URL, {
      browser: deps.browser,
    }),
  );

  const taaftServicesUrls = taaftServicesHrefs.map(
    (href) => new URL(href, TAAFT_TRENDING_PAGE_URL).href,
  );

  return taaftServicesUrls
    .filter((url) =>
      params.urlsToSkip !== undefined ? !params.urlsToSkip.includes(url) : true,
    )
    .slice(0, params.limit);
};

export const fetchTaaftServiceInfo = async (
  params: { serviceUrl: string },
  deps: { browser: playwright.Browser; logger?: Logger },
): Promise<ServiceBasicDescription> => {
  deps.logger?.info(`fetching information for ${params.serviceUrl}`);
  return extractTaaftServiceBasicInfoFromHtml(
    await fetchPageContentWithPlaywright(params.serviceUrl, {
      browser: deps.browser,
    }),
  );
};

export const extractTaaftTrendingServicesHrefsFromHtml = (
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
  url: string,
  deps: {
    browser: playwright.Browser;
  },
): Promise<string> => {
  const page = await deps.browser.newPage();
  await page.setExtraHTTPHeaders({
    "User-Agent":
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/110.0.0.0 Safari/537.36",
    "Accept-Language": "en-US,en;q=0.9",
  });
  await page.goto(url, { waitUntil: "domcontentloaded" });
  const content = await page.content();
  return content;
};

export const extractTaaftServiceBasicInfoFromHtml = async (
  taaftServicePageContent: string,
): Promise<ServiceBasicDescription> => {
  const $ = cheerio.load(taaftServicePageContent);

  const name = $(".title_inner").text();
  if (name === undefined) throw new Error("Missing name");

  const description = $('meta[name="description"]').attr("content");
  if (description === undefined) throw new Error("Missing description");

  const url = $('link[rel="canonical"]').attr("href");
  if (url === undefined) throw new Error("Missing url");

  const tags: string[] = [];
  $(".tags .tag:not(.price)").each((_, el) => {
    const tag = $(el).text().trim();
    tags.push(tag);
  });

  return { name, url, tags, descriptions: [description] };
};
