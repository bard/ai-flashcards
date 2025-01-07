import * as cheerio from "cheerio";

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
