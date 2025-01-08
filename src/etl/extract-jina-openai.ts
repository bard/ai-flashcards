import { z } from "zod";
import type { OpenAI } from "openai";
import { zodResponseFormat } from "openai/helpers/zod";
import type { Logger } from "pino";
import getUrls from "get-urls";
import type { ServiceBasicDescription } from "../types.js";
import type { Extractor } from "./types.js";

export const TAAFT_TRENDING_PAGE_URL =
  "https://theresanaiforthat.com/trending/";

export class JinaOpenaiExtractor implements Extractor {
  private logger?: Logger;
  private openai: OpenAI;
  private fetch: typeof fetch;

  constructor(params: {
    logger?: Logger;
    openai: OpenAI;
    fetch?: typeof fetch;
  }) {
    this.logger = params.logger;
    this.openai = params.openai;
    this.fetch = params.fetch ?? global.fetch;
  }

  async fetchTaaftTrendingServicesUrls(params: {
    limit: number;
  }): Promise<string[]> {
    this.logger?.info(
      "fetching trending services on theresanaiforthat.com using reader.jina.ai",
    );

    const res = await this.fetch(
      "https://r.jina.ai/" + TAAFT_TRENDING_PAGE_URL,
    );
    const text = await res.text();
    return Array.from(getUrls(text))
      .filter((url) => new URL(url).pathname.startsWith("/ai/"))
      .slice(0, params.limit);
  }

  async fetchTaaftServiceInfo(params: {
    serviceUrl: string;
  }): Promise<ServiceBasicDescription> {
    this.logger?.info(`fetching information for ${params.serviceUrl}`);

    const res = await this.fetch("https://r.jina.ai/" + params.serviceUrl);
    const text = await res.text();

    const SYSTEM_PROMPT =
      "You are an assistant that, given a markdown about a service operating in the AI space, extracts the name, description, and tags, and returns them as a json object";
    const PROMPT = text;

    const llmResponse = await this.openai.beta.chat.completions.parse({
      model: "gpt-4o-mini-2024-07-18",
      //      model: "gpt-4o-2024-08-06",
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: PROMPT },
      ],
      response_format: zodResponseFormat(
        z.object({
          name: z.string(),
          description: z.string(),
          tags: z.array(z.string()),
        }),
        "service_info",
      ),
    });

    const response = llmResponse.choices[0].message.parsed;
    if (response === null) {
      throw new Error("no llm response returned");
    } else {
      return {
        name: response.name,
        url: params.serviceUrl,
        descriptions: [response.description],
        tags: response.tags,
      };
    }
  }
}
