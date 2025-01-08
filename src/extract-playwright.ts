import type { Logger } from "pino";
import * as cheerio from "cheerio";
import type playwright from "playwright";
import type { BasicServiceInfo } from "./types.js";
import type { Extractor } from "./types.js";

export const TAAFT_TRENDING_PAGE_URL =
  "https://theresanaiforthat.com/trending/";

export class PlaywrightExtractor implements Extractor {
  private logger?: Logger;
  private browser: playwright.Browser;

  constructor(params: { logger?: Logger; browser: playwright.Browser }) {
    this.logger = params.logger;
    this.browser = params.browser;
  }

  async fetchTaaftTrendingServicesUrls(params: {
    limit: number;
  }): Promise<string[]> {
    this.logger?.info(
      "fetching trending services on theresanaiforthat.com using playwright",
    );

    const taaftServicesHrefs = extractTaaftTrendingServicesHrefsFromHtml(
      await fetchPageContentWithPlaywright(TAAFT_TRENDING_PAGE_URL, {
        browser: this.browser,
      }),
    );

    const taaftServicesUrls = taaftServicesHrefs.map(
      (href) => new URL(href, TAAFT_TRENDING_PAGE_URL).href,
    );

    return taaftServicesUrls.slice(0, params.limit);
  }

  async fetchTaaftServiceInfo(params: {
    serviceUrl: string;
  }): Promise<BasicServiceInfo> {
    this.logger?.info(`fetching information for ${params.serviceUrl}`);
    return extractTaaftServiceBasicInfoFromHtml(
      await fetchPageContentWithPlaywright(params.serviceUrl, {
        browser: this.browser,
      }),
    );
  }
}

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
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/117.0.5938.132 Safari/537.36",
    "Accept-Language": "en-US,en;q=0.9",
  });
  await page.goto(url, { waitUntil: "networkidle" });

  if ((await page.title()) === "Just a moment...") {
    throw new Error("Got cloudflare screen instead of trending page");
  }

  return page.content();
};

export const extractTaaftServiceBasicInfoFromHtml = async (
  taaftServicePageContent: string,
): Promise<BasicServiceInfo> => {
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
