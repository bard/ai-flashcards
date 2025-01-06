import { z } from "zod";
import type { OpenAI } from "openai";
import { zodResponseFormat } from "openai/helpers/zod";
import * as cheerio from "cheerio";
import type {
  ServiceLink,
  ServiceDescription,
  ServiceFeatures,
} from "../types.js";

export const extractTaaftServiceBasicInfo = async (
  taaftServicePageContent: string,
): Promise<ServiceDescription> => {
  const $ = cheerio.load(taaftServicePageContent);

  const description = $(".description").first().find("p").text().trim();

  const tags: string[] = [];
  $(".tags .tag:not(.price)").each((_, el) => {
    const tag = $(el).text().trim();
    tags.push(tag);
  });

  return { tags, descriptions: [description] };
};

export const extractTaaftTrendingServices = (
  taaftTrendingPageContent: string,
): ServiceLink[] => {
  const $ = cheerio.load(taaftTrendingPageContent);

  const services: ServiceLink[] = [];

  $("a.ai_link").each((_, element) => {
    const name = $(element).text();
    const href = $(element).attr("href");
    if (name !== undefined && href !== undefined) {
      services.push({ name, href });
    }
  });

  return services;
};

export const extractServiceFeaturesWithLlm = async (
  unstructuredServiceInfo: ServiceDescription,
  deps: { openai: OpenAI },
): Promise<ServiceFeatures> => {
  const SYSTEM_PROMPT =
    "You are an assistant that, given information about online services that use AI-based methods, extracts information such as the service's goals, what fields it operates in, and what AI-based methods it uses in pursuit of the goals.";
  const ONE_SHOT_EXAMPLE_PROMPT = `{
  "description": "Sketch2Photo AI is a cutting-edge online platform that transforms your hand-drawn sketches into stunning, photorealistic images using advanced artificial intelligence. Whether you’re a professional designer, an aspiring artist, or someone with a creative idea, Sketch2Photo AI brings your imagination to life with precision and realism. Simply upload your sketch, and our AI-powered service enhances it with realistic textures, colors, and details, turning your vision into reality in seconds.",
  "tags": [
    "AI Image Creation",
    "Sketch to Image",
    "Photorealistic Rendering",
    "Concept Art Tool",
    "Digital Illustration"
  ]
}`;
  const ONE_SHOT_EXAMPLE_RESPONSE = `{
  "fields": [
    "Digital Illustration",
    "Concept Art",
    "Photorealistic Rendering"
  ],
  "goals": [
    "Transform hand-drawn sketches into photorealistic images",
    "Enhance user creativity by turning imaginative ideas into realistic visuals",
    "Provide an efficient and precise tool for designers and artists to visualize concepts"
  ],
  "methods": [
    "Advanced image generation models for creating photorealistic textures, colors, and details",
    "Neural networks for sketch interpretation and enhancement",
    "Real-time AI-powered rendering for rapid image transformation"
  ]
}`;
  const PROMPT = JSON.stringify(unstructuredServiceInfo);

  const llmResponse = await deps.openai.beta.chat.completions.parse({
    model: "gpt-4o-2024-08-06",
    messages: [
      { role: "system", content: SYSTEM_PROMPT },
      { role: "user", content: ONE_SHOT_EXAMPLE_PROMPT },
      { role: "assistant", content: ONE_SHOT_EXAMPLE_RESPONSE },
      { role: "user", content: PROMPT },
    ],
    response_format: zodResponseFormat(
      z.object({
        methods: z.array(z.string()),
        fields: z.array(z.string()),
        goals: z.array(z.string()),
      }),
      "extended_service_info",
    ),
  });

  const response = llmResponse.choices[0].message.parsed;
  if (response === null) {
    throw new Error("nothing");
  } else {
    const { methods, goals, fields } = response;
    return { methods, goals, fields };
  }
};
