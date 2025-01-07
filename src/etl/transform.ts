import { z } from "zod";
import type { OpenAI } from "openai";
import { zodResponseFormat } from "openai/helpers/zod";
import type {
  Flashcard,
  ExtendedServiceDescription,
  ServiceBasicDescription,
  ServiceFeatures,
} from "../types.js";
import type { Logger } from "pino";

export const generateFlashcards = async (
  params: { service: ServiceBasicDescription },
  deps: { openai: OpenAI; logger?: Logger },
): Promise<Flashcard[]> => {
  const { service } = params;

  deps.logger?.info(`inferring features for ${params.service.url}`);
  const { goals, methods, fields } = await inferServiceFeaturesWithLlm(
    service,
    { openai: deps.openai },
  );

  return (["goals", "fields", "methods"] as const).map((feature) =>
    constructQuestionAnswerPair({
      service: { ...service, fields, goals, methods },
      featureToAskAbout: feature,
    }),
  );
};

export const inferServiceFeaturesWithLlm = async (
  serviceDescription: ServiceBasicDescription,
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
  const PROMPT = JSON.stringify(serviceDescription);

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
      "service_features",
    ),
  });

  const response = llmResponse.choices[0].message.parsed;
  if (response === null) {
    throw new Error("no llm response returned");
  } else {
    return response;
  }
};

export const constructQuestionAnswerPair = ({
  service,
  featureToAskAbout,
}: {
  service: ExtendedServiceDescription;
  featureToAskAbout: "goals" | "methods" | "fields";
}): { question: string; answer: string } => {
  const { fields, methods, goals } = service;
  let question: string;
  let answer: string;

  switch (featureToAskAbout) {
    case "methods": {
      question = `A service operates in the fields of ${fields.join(", ")}. It pursues these goals: ${goals.join(" ")}. What AI-based methods do you think it's using?`;
      answer = methods.join(", ");
      break;
    }
    case "fields": {
      question = `A service pursue the following goals: ${goals.join(", ")}. It uses these AI-based methods: ${methods.join(", ")}. What fields do you think it operates in?`;
      answer = fields.join(", ");
      break;
    }
    case "goals": {
      question = `A service operates in the fields of ${fields.join(", ")}. It uses these AI-based methods: ${methods.join(", ")}. What goals do you think it is pursuing?`;
      answer = goals.join(", ");
      break;
    }
  }

  const note = `<a href="${service.url}" target="_blank">${service.name}</a> ${service.descriptions.join(" ")}`;
  return { question, answer: answer + "\n" + note };
};
