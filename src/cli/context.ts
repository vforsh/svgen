import type { Command } from "commander";
import { resolveEffectiveConfig } from "../config/store.ts";
import type { EffectiveConfig, PersistedConfig } from "../config/schema.ts";
import { CliError } from "../lib/errors.ts";
import type { GlobalFlagValues, OutputMode } from "../types.ts";

export interface CommandContext {
  outputMode: OutputMode;
  quiet: boolean;
  verbose: boolean;
  configPath: string;
  cacheDir: string;
  persistedConfig: PersistedConfig;
  config: EffectiveConfig;
}

export function getGlobalFlags(command: Command): GlobalFlagValues {
  return command.optsWithGlobals() as GlobalFlagValues;
}

export async function createCommandContext(command: Command, options?: { allowMissingApiKey?: boolean }): Promise<CommandContext> {
  const flags = getGlobalFlags(command);

  if (flags.json && flags.plain) {
    throw new CliError("Use either --json or --plain, not both.", 2);
  }

  const outputMode: OutputMode = flags.json ? "json" : flags.plain ? "plain" : "human";
  const overrides = {
    endpoint: flags.endpoint,
    region: flags.region,
    timeout: flags.timeout,
    retries: flags.retries,
  } satisfies PersistedConfig;

  const safeOverrides = Object.fromEntries(
    Object.entries(overrides).filter(([, value]) => value !== undefined),
  ) as PersistedConfig;

  const { configPath, cacheDir, persisted, effective } = await resolveEffectiveConfig(safeOverrides);

  if (!options?.allowMissingApiKey && !effective.apiKey) {
    throw new CliError(
      "Missing API key. Set SVGEN_API_KEY (or QUIVERAI_API_KEY) or run: printf 'KEY' | svgen cfg set apiKey -",
      1,
    );
  }

  return {
    outputMode,
    quiet: Boolean(flags.quiet),
    verbose: Boolean(flags.verbose),
    configPath,
    cacheDir,
    persistedConfig: persisted,
    config: effective,
  };
}
