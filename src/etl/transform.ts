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
  deps.logger?.info(`generating flashcards for ${params.service.url}`);
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
    "You are an assistant that, given information about an online service that use AI-based methods, extracts extracts the service's goals (up to 3), the fields it operates in (up to 3), and what AI-based methods (up to 3) it uses in pursuit of the goals .";
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

  const fieldList = `<ul>${fields.map((f) => "<li>" + f + "</li>").join("\n")}</ul>`;
  const goalList = `<ul>${goals.map((g) => "<li>" + g + "</li>").join("\n")}</ul>`;
  const methodList = `<ul>${methods.map((m) => "<li>" + m + "</li>").join("\n")}</ul>`;

  switch (featureToAskAbout) {
    case "methods": {
      question = `<p>A service operates in these fields:</p>
${fieldList}
<p>It pursues these goals:</p>
${goalList}
<p>What AI-based methods do you think it’s using?</p>`;
      answer = methodList;
      break;
    }
    case "fields": {
      question = `<p>A service pursues these goals:</p>
${goalList}
<p>It uses these AI-based methods:</p>
${methodList}
<p>What fields do you think it operates in?</p>`;
      answer = fieldList;
      break;
    }
    case "goals": {
      question = `<p>A service operates in these fields:</p>
${fieldList}
<p>It uses these AI-based methods:</p>
${methodList}
<p>What goals do you think it pursues?</p>`;
      answer = goalList;
      break;
    }
  }

  const note = `<hr/>
<h2><a href="${service.url}" target="_blank">${service.name}</a></h2>
<p>${service.descriptions.join(" ")}</p>`;
  return { question, answer: answer + "\n" + note };
};
