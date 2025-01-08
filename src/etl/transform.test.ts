import { expect, test, vi } from "vitest";
import {
  inferServiceFeaturesWithLlm,
  constructQuestionAnswerPair,
} from "./transform.js";
import type { ExtendedServiceDescription } from "../types.js";

test("construct question/answer pair from extended service description", async () => {
  const service: ExtendedServiceDescription = {
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

  const { question, answer } = constructQuestionAnswerPair({
    service,
    featureToAskAbout: "goals",
  });

  expect(question).toMatchInlineSnapshot(`"A service operates in the fields of Pet imagery, Digital Art, Personalized Gift Creation. It uses these AI-based methods: Image style transfer using neural networks, AI-based image processing for style conversion. What goals do you think it is pursuing?"`);
  expect(answer).toMatchInlineSnapshot(`
    "Transform pet photos into artistic styles resembling disney-pixar animation, Provide a variety of styles for personalizing pet images, Facilitate the creation of personalized gifts from pet images
    <a href="https://sketch2photo.ai" target="_blank">Sketch2Photo AI</a> Turn you pet photos into cool disney-pixar animation like art or choose from many other styles. Then easily turn these images into personalised gifts for you, your friends or loved ones!"
  `);
});

test("infer service features using llm", async () => {
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
    url: "mocked url",
    descriptions: ["Mocked description"],
    tags: ["Mocked tag"],
  };

  const serviceInfo = await inferServiceFeaturesWithLlm(
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
