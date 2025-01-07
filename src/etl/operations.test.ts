import { test, expect, vi } from "vitest";
import {
  extractServiceFeaturesWithLlm,
  generateQuestionAnswerPair,
} from "./operations.js";
import type { Service } from "../types.js";
import { getTaaftServicePageMockContent } from "./operations.test.fixtures/index.js";

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

test("extract semistructured service information from content of service page on taaft.com", async () => {
  const content = await getTaaftServicePageMockContent();

  const serviceInfo = await extractTaaftServiceBasicInfo(content);

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
    }
  `);
});

test("extract extended service info with mocked openai", async () => {
  const mockOpenai = {
    beta: {
      chat: {
        completions: {
          parse: vi.fn().mockResolvedValue({
            id: "chatcmpl-AmNAa4ZDPd3gF2skKQHOEZCkHh88Z",
            object: "chat.completion",
            created: 1736092172,
            model: "gpt-4o-2024-08-06",
            choices: [
              {
                index: 0,
                message: {
                  role: "assistant",
                  content:
                    '{"methods":["Advanced image generation models for creating photorealistic textures, colors, and details","Neural networks for sketch interpretation and enhancement","Real-time AI-powered rendering for rapid image transformation"],"fields":["Digital Illustration","Concept Art","Photorealistic Rendering"],"goals":["Transform hand-drawn sketches into photorealistic images","Enhance user creativity by turning imaginative ideas into realistic visuals","Provide an efficient and precise tool for designers and artists to visualize concepts"]}',
                  refusal: null,
                  tool_calls: [],
                  parsed: {
                    methods: [
                      "Advanced image generation models for creating photorealistic textures, colors, and details",
                      "Neural networks for sketch interpretation and enhancement",
                      "Real-time AI-powered rendering for rapid image transformation",
                    ],
                    fields: [
                      "Digital Illustration",
                      "Concept Art",
                      "Photorealistic Rendering",
                    ],
                    goals: [
                      "Transform hand-drawn sketches into photorealistic images",
                      "Enhance user creativity by turning imaginative ideas into realistic visuals",
                      "Provide an efficient and precise tool for designers and artists to visualize concepts",
                    ],
                  },
                },
                logprobs: null,
                finish_reason: "stop",
              },
            ],
            usage: {
              prompt_tokens: 498,
              completion_tokens: 98,
              total_tokens: 596,
              prompt_tokens_details: { cached_tokens: 0, audio_tokens: 0 },
              completion_tokens_details: {
                reasoning_tokens: 0,
                audio_tokens: 0,
                accepted_prediction_tokens: 0,
                rejected_prediction_tokens: 0,
              },
            },
            system_fingerprint: "fp_d28bcae782",
          }),
        },
      },
    },
  };

  const semistructuredServiceInfo = {
    name: "Mocked name",
    descriptions: ["Mocked description"],
    tags: ["Mocked tag"],
  };

  const serviceInfo = await extractServiceFeaturesWithLlm(
    semistructuredServiceInfo,
    { openai: mockOpenai as any },
  );

  expect(serviceInfo).toEqual({
    methods: [
      "Advanced image generation models for creating photorealistic textures, colors, and details",
      "Neural networks for sketch interpretation and enhancement",
      "Real-time AI-powered rendering for rapid image transformation",
    ],
    fields: ["Digital Illustration", "Concept Art", "Photorealistic Rendering"],
    goals: [
      "Transform hand-drawn sketches into photorealistic images",
      "Enhance user creativity by turning imaginative ideas into realistic visuals",
      "Provide an efficient and precise tool for designers and artists to visualize concepts",
    ],
  });
});
