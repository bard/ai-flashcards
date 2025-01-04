import { test, expect, vi } from "vitest";
import {
  extractExtendedServiceInfoWithLlm,
  extractTaaftServiceInformation,
  extractTaaftTrendingServices,
} from "./etl.js";
import {
  getTaaftTrendingPageMockContent,
  getTaaftServicePageMockContent,
} from "./etl.test.fixtures/index.js";

test("extract semistructured service information from content of service page on taaft.com", async () => {
  const content = await getTaaftServicePageMockContent();

  const serviceInfo = await extractTaaftServiceInformation(content);

  expect(serviceInfo).toMatchInlineSnapshot(`
    {
      "descriptions": [
        "Lensa is a mobile app that utilizes AI technology to create unique, customized avatars from selfies. This app is designed to be easy to use and provide a range of features to perfect images on the go. Lensa's Magic Avatars feature is one of the most advanced AI technologies available and generates avatars in various art styles from your selfies. All images are created by AI and the results have been seen to go viral on social media. Lensa provides a unique experience and is an example of how AI can be used to create stunning visuals. The app is available for download on both the App Store and Google Play, and all images created with the app are non-commercial and used solely as examples of what is possible with the technology.",
      ],
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

test("extract list of trending services from content of taaft.com trending page", async () => {
  const content = await getTaaftTrendingPageMockContent();

  const services = extractTaaftTrendingServices(content);

  expect(services.slice(0, 5)).toMatchInlineSnapshot(`
    [
      {
        "name": "Magic Avatars",
        "url": "https://theresanaiforthat.com/ai/magic-avatars/",
      },
      {
        "name": "GoEnhance",
        "url": "https://theresanaiforthat.com/ai/goenhance/",
      },
      {
        "name": "Twain",
        "url": "https://theresanaiforthat.com/ai/twain/",
      },
      {
        "name": "Kaiber",
        "url": "https://theresanaiforthat.com/ai/kaiber/",
      },
      {
        "name": "Learn Earth",
        "url": "https://theresanaiforthat.com/ai/learn-earth/",
      },
    ]
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
    descriptions: ["Mocked description"],
    tags: ["Mocked tag"],
  };

  const serviceInfo = await extractExtendedServiceInfoWithLlm(
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
