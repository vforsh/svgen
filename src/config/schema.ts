import { z } from "zod";

export const DEFAULT_ENDPOINT = "https://api.quiver.ai";
export const DEFAULT_MODEL = "arrow-preview";
export const DEFAULT_TIMEOUT_MS = 60_000;
export const DEFAULT_RETRIES = 2;
export const DEFAULT_POLL_INTERVAL_MS = 2_000;

export const PersistedConfigSchema = z
  .object({
    endpoint: z.string().url().optional(),
    region: z.string().min(1).optional(),
    timeout: z.number().int().min(1).max(600_000).optional(),
    retries: z.number().int().min(0).max(10).optional(),
    pollInterval: z.number().int().min(250).max(60_000).optional(),
    model: z.string().min(1).optional(),
    apiKey: z.string().min(1).optional(),
  })
  .strict();

export const EffectiveConfigSchema = z
  .object({
    endpoint: z.string().url(),
    region: z.string().min(1).optional(),
    timeout: z.number().int().min(1).max(600_000),
    retries: z.number().int().min(0).max(10),
    pollInterval: z.number().int().min(250).max(60_000),
    model: z.string().min(1),
    apiKey: z.string().min(1).optional(),
  })
  .strict();

export type PersistedConfig = z.infer<typeof PersistedConfigSchema>;
export type EffectiveConfig = z.infer<typeof EffectiveConfigSchema>;

export const secretConfigKeys = new Set<string>(["apiKey"]);
