import { z } from "zod";
import type { Config } from "./types.js";

export const parseEnvConfig = (env: NodeJS.ProcessEnv): Config => {
  const envSchema = z.object({
    OPENAI_API_KEY: z.string(),
    MAX_SERVICES: z.number(),
    EXTRACTOR: z.union([z.literal("jina-openai"), z.literal("playwright")]),
    LOADER: z.union([z.literal("file-csv"), z.literal("api-csv")]),
    LOAD_TARGET: z.string(),
    API_SECRET: z.string().optional(),
  });

  const parsedEnv = envSchema.parse(env);

  return {
    openAiApiKey: parsedEnv.OPENAI_API_KEY,
    maxServicesToScrape: parsedEnv.MAX_SERVICES,
    extractor: parsedEnv.EXTRACTOR,
    loader: parsedEnv.LOADER,
    loadTarget: parsedEnv.LOAD_TARGET,
  };
};
