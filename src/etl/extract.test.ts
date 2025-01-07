import { expect } from "vitest";
import { test } from "./fixtures/index.js";
import {
  extractTaaftServiceBasicInfoFromHtml,
  extractTaaftTrendingServicesHrefsFromHtml,
} from "./extract.js";

test("extract list of trending services from content of taaft.com trending page", async ({
  taaftTrendingPageContent,
}) => {
  const services = extractTaaftTrendingServicesHrefsFromHtml(
    taaftTrendingPageContent,
  );

  expect(services.slice(0, 5)).toMatchInlineSnapshot(`
    [
      "/ai/magic-avatars/",
      "/ai/goenhance/",
      "/ai/twain/",
      "/ai/kaiber/",
      "/ai/learn-earth/",
    ]
  `);
});

test("extract semistructured service information from content of service page on taaft.com", async ({
  taaftServicePageContent,
}) => {
  const serviceInfo = await extractTaaftServiceBasicInfoFromHtml(
    taaftServicePageContent,
  );

  expect(serviceInfo).toMatchInlineSnapshot(`
    {
      "descriptions": [
        "Lensa is a mobile app that utilizes AI technology to create unique, customized avatars from selfies. This app is designed to be easy to use and provide a range of features to perfect images on the go. Lensa's Magic Avatars feature is one of the most advanced AI technologies available and generates avatars in various art styles from your selfies. All images are created by AI and the results have been seen to go viral on social media. Lensa provides a unique experience and is an example of how AI can be used to create stunning visuals. The app is available for download on both the App Store and Google Play, and all images created with the app are non-commercial and used solely as examples of what is possible with the technology.",
      ],
      "name": "Magic Avatars",
      "tags": [
        "Avatar Creation",
        "Selfie Based",
        "Image Processing",
        "Personalization",
        "Digital Identity",
        "Social Media Tool",
      ],
      "url": "https://theresanaiforthat.com/ai/magic-avatars/",
    }
  `);
});
