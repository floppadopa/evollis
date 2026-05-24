import { createEnv } from "@t3-oss/env-nextjs";
import { z } from "zod";

export const env = createEnv({
  /**
   * Specify your server-side environment variables schema here. This way you can ensure the app
   * isn't built with invalid env vars.
   */
  server: {
    DATABASE_URL: z.string().url(),
    NODE_ENV: z
      .enum(["development", "test", "production"])
      .default("development"),
    // OpenAI: powers reply generation always, and classification when
    // CLASSIFIER_PROVIDER=openai.
    OPENAI_API_KEY: z.string().min(1),
    OPENAI_MODEL: z.string().default("gpt-5.4-mini-2026-03-17"),

    // Which classifier assigns the conversation category:
    //   "openai"   — LLM call (default; works out of the box, costs money)
    //   "bertopic" — local semantic clustering service (free, scalable;
    //                requires the Python service in ml/bertopic to be running)
    CLASSIFIER_PROVIDER: z.enum(["openai", "bertopic"]).default("openai"),
    // Base URL of the BERTopic FastAPI service (used when provider=bertopic).
    BERTOPIC_SERVICE_URL: z.string().url().default("http://127.0.0.1:8000"),
  },

  /**
   * Specify your client-side environment variables schema here. This way you can ensure the app
   * isn't built with invalid env vars. To expose them to the client, prefix them with
   * `NEXT_PUBLIC_`.
   */
  client: {
    // NEXT_PUBLIC_CLIENTVAR: z.string(),
  },

  /**
   * You can't destruct `process.env` as a regular object in the Next.js edge runtimes (e.g.
   * middlewares) or client-side so we need to destruct manually.
   */
  runtimeEnv: {
    DATABASE_URL: process.env.DATABASE_URL,
    NODE_ENV: process.env.NODE_ENV,
    OPENAI_API_KEY: process.env.OPENAI_API_KEY,
    OPENAI_MODEL: process.env.OPENAI_MODEL,
    CLASSIFIER_PROVIDER: process.env.CLASSIFIER_PROVIDER,
    BERTOPIC_SERVICE_URL: process.env.BERTOPIC_SERVICE_URL,
    // NEXT_PUBLIC_CLIENTVAR: process.env.NEXT_PUBLIC_CLIENTVAR,
  },
  /**
   * Run `build` or `dev` with `SKIP_ENV_VALIDATION` to skip env validation. This is especially
   * useful for Docker builds.
   */
  skipValidation: !!process.env.SKIP_ENV_VALIDATION,
  /**
   * Makes it so that empty strings are treated as undefined. `SOME_VAR: z.string()` and
   * `SOME_VAR=''` will throw an error.
   */
  emptyStringAsUndefined: true,
});
