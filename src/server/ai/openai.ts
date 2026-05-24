import "server-only";

import OpenAI from "openai";

import { env } from "~/env";

/**
 * Shared OpenAI client for the chat pipeline (classification + reply
 * generation). Server-only — the key must never reach the browser.
 */
export const openai = new OpenAI({ apiKey: env.OPENAI_API_KEY });

/** Default model for both classification and generation (configurable via env). */
export const OPENAI_MODEL = env.OPENAI_MODEL;
