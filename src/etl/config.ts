import { z } from "zod";

const ENV_SCHEMA = z
  .object({
    OPENAI_API_KEY: z.string(),
    MAX_SERVICES_TO_SCRAPE: z.coerce.number(),
    EXTRACTOR: z.union([z.literal("jina-openai"), z.literal("playwright")]),
  })
  .and(
    z
      .object({
        LOADER: z.literal("api-csv"),
        API_SECRET: z.string(),
        LOAD_TARGET: z.string().url(),
      })
      .or(
        z.object({
          LOADER: z.literal("file-csv"),
          LOAD_TARGET: z.string(),
        }),
      ),
  );

export type Config = z.TypeOf<typeof ENV_SCHEMA>;

export const parseEnvConfig = (env: NodeJS.ProcessEnv): Config => {
  return ENV_SCHEMA.parse(env);
};
