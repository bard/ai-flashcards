import { test, expect } from "vitest";
import { generateQuestionAnswerPair } from "./query.js";
import type { Service } from "./types.js";

test("generate question/answer pair from service description", async () => {
  const service: Service = {
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

  const qaPair = await generateQuestionAnswerPair({
    service,
    featureToAskAbout: "goals",
  });

  expect(qaPair).toEqual({
    question:
      "A service operating in the fields of Pet imagery, Digital Art, Personalized Gift Creation is using these AI-based methods: Image style transfer using neural networks, AI-based image processing for style conversion. What goals do you think it is trying to accomplish?",
    answer:
      "Transform pet photos into artistic styles resembling disney-pixar animation, Provide a variety of styles for personalizing pet images, Facilitate the creation of personalized gifts from pet images",
  });
});
