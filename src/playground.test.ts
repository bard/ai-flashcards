import type { Logger } from "pino";
import { describe } from "vitest";
import { test } from "./playground.test.fixtures.js";
import { inferServiceFeaturesWithLlm } from "./etl/transform.js";
import { constructQuestionAnswerPair } from "./etl/transform.js";
import { perform } from "./etl/index.js";
import { DatabaseLoader } from "./etl/load-db.js";

describe("interactive development", () => {
  test.skip(
    "build database",
    { timeout: 20000 },
    async ({ db, browser, openai }) => {
      const loader = new DatabaseLoader(db);

      await perform(
        { maxServicesToScrape: 2, urlsToSkip: [] },
        { browser, loader, openai, logger: { info: console.info } as Logger },
      );

      const rows = await db.selectFrom("services").selectAll().execute();
      console.log(rows);
    },
  );

  test.skip(
    "extract application-specific service information (goals, fields, methods) from semistructured service information",
    { timeout: 10000 },
    async ({ openai }) => {
      const semistructuredServiceInfo = {
        name: "Sketch2Photo AI",
        url: "https://sketch2photo.ai",
        descriptions: [
          "Sketch2Photo AI is a cutting-edge online platform that transforms your hand-drawn sketches into stunning, photorealistic images using advanced artificial intelligence. Whether you’re a professional designer, an aspiring artist, or someone with a creative idea, Sketch2Photo AI brings your imagination to life with precision and realism. Simply upload your sketch, and our AI-powered service enhances it with realistic textures, colors, and details, turning your vision into reality in seconds.",
        ],
        tags: [
          "AI Image Creation",
          "Sketch to Image",
          "Photorealistic Rendering",
          "Concept Art Tool",
          "Digital Illustration",
        ],
      };

      const serviceInfo = await inferServiceFeaturesWithLlm(
        semistructuredServiceInfo,
        { openai },
      );

      console.log(serviceInfo);
    },
  );

  test.skip("generate question/answer pair from service description", async () => {
    const service = {
      name: "Sketch2Photo AI",
      url: "https://sketch2photo.ai",
      descriptions: [
        "Turn you pet photos into cool disney-pixar animation like art or choose from many other styles. Then easily turn these images into personalised gifts for you, your friends or loved ones!",
      ],
      tags: ["image", "pet", "avatar", "dog", "cats"],
      fields: ["Pet imagery", "Digital Art", "Personalized Gift Creation"],
      goals: [
        "Transform pet photos into artistic styles resembling disney-pixar animation",
        "Provide a variety of styles for personalizing pet images",
        "Facilitate the creation of personalized gifts from pet images",
      ],
      methods: [
        "Image style transfer using neural networks",
        "AI-based image processing for style conversion",
      ],
    };

    const qaPair = constructQuestionAnswerPair({
      service,
      featureToAskAbout: "goals",
    });

    console.log(qaPair);
  });
});
