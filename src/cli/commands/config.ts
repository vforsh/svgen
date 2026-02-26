import { Command } from "commander";
import { createCommandContext, getGlobalFlags } from "../context.ts";
import { PersistedConfigSchema, secretConfigKeys, type PersistedConfig } from "../../config/schema.ts";
import { readPersistedConfig, resolveEffectiveConfig, writePersistedConfig } from "../../config/store.ts";
import { CliError } from "../../lib/errors.ts";
import { readStdinText } from "../../lib/io.ts";
import { writeOutput } from "../../lib/output.ts";

const knownKeys = new Set<keyof PersistedConfig>([
  "apiKey",
  "endpoint",
  "region",
  "timeout",
  "retries",
  "pollInterval",
  "model",
]);

function assertKnownKey(key: string): asserts key is keyof PersistedConfig {
  if (!knownKeys.has(key as keyof PersistedConfig)) {
    throw new CliError(`Unknown config key: ${key}`, 2);
  }
}

function coerceConfigValue(key: keyof PersistedConfig, value: string): string | number {
  if (["timeout", "retries", "pollInterval"].includes(key)) {
    const parsed = Number(value);
    if (!Number.isFinite(parsed)) {
      throw new CliError(`Expected numeric value for ${key}`, 2);
    }
    return parsed;
  }

  return value;
}

function parseSetTokens(tokens: string[]): Array<{ key: keyof PersistedConfig; value: string }> {
  if (tokens.length === 2 && !tokens[0]?.includes("=")) {
    const key = tokens[0] ?? "";
    assertKnownKey(key);
    return [{ key, value: tokens[1] ?? "" }];
  }

  const updates: Array<{ key: keyof PersistedConfig; value: string }> = [];
  for (const token of tokens) {
    const eq = token.indexOf("=");
    if (eq <= 0) {
      throw new CliError(`Invalid set token: ${token}. Use key=value or key value.`, 2);
    }
    const key = token.slice(0, eq);
    const value = token.slice(eq + 1);
    assertKnownKey(key);
    updates.push({ key, value });
  }

  return updates;
}

export function registerConfigCommand(program: Command): void {
  const config = program.command("config").alias("cfg").description("Manage svgen config");

  config
    .command("list")
    .alias("ls")
    .description("List effective config")
    .action(async function action(this: Command) {
      const ctx = await createCommandContext(this, { allowMissingApiKey: true });
      const entries = Object.entries(ctx.config)
        .filter(([, value]) => value !== undefined)
        .sort(([a], [b]) => a.localeCompare(b));
      writeOutput(
        ctx.outputMode,
        { configPath: ctx.configPath, config: ctx.config },
        entries.map(([key, value]) => `${key}=${String(value)}`),
      );
    });

  config
    .command("path")
    .description("Print config path")
    .action(async function action(this: Command) {
      const ctx = await createCommandContext(this, { allowMissingApiKey: true });
      writeOutput(ctx.outputMode, { path: ctx.configPath }, [ctx.configPath]);
    });

  config
    .command("get")
    .description("Get one or more config values")
    .argument("<keys...>")
    .action(async function action(this: Command, keys: string[]) {
      if (keys.length === 0) {
        throw new CliError("Provide at least one key.", 2);
      }

      const ctx = await createCommandContext(this, { allowMissingApiKey: true });
      const result: Record<string, unknown> = {};

      for (const key of keys) {
        assertKnownKey(key);
        result[key] = ctx.config[key];
      }

      writeOutput(
        ctx.outputMode,
        { values: result },
        keys.map((key) => `${key}=${String(result[key])}`),
      );
    });

  config
    .command("set")
    .description("Set config values (key=value or key value)")
    .argument("<items...>")
    .action(async function action(this: Command, items: string[]) {
      if (items.length === 0) {
        throw new CliError("Provide key/value pairs.", 2);
      }

      const updates = parseSetTokens(items);
      const { config: persisted } = await readPersistedConfig();
      const next: PersistedConfig = { ...persisted };

      for (const update of updates) {
        const isSecret = secretConfigKeys.has(update.key);

        if (isSecret && update.value !== "-") {
          throw new CliError(`Refusing to set secret key '${update.key}' via argv. Use stdin: printf '...' | svgen cfg set ${update.key} -`, 2);
        }

        const value = update.value === "-" ? await readStdinText() : update.value;
        if (!value) {
          throw new CliError(`Value for ${update.key} cannot be empty.`, 2);
        }

        next[update.key] = coerceConfigValue(update.key, value) as never;
      }

      const parsed = PersistedConfigSchema.parse(next);
      const configPath = await writePersistedConfig(parsed);
      const ctx = await createCommandContext(this, { allowMissingApiKey: true });

      writeOutput(
        ctx.outputMode,
        { updated: updates.map((entry) => entry.key), path: configPath },
        updates.map((entry) => entry.key),
      );
    });

  config
    .command("unset")
    .description("Unset one or more keys")
    .argument("<keys...>")
    .action(async function action(this: Command, keys: string[]) {
      if (keys.length === 0) {
        throw new CliError("Provide at least one key.", 2);
      }

      const { config: persisted } = await readPersistedConfig();
      const next: PersistedConfig = { ...persisted };

      for (const key of keys) {
        assertKnownKey(key);
        delete next[key];
      }

      const configPath = await writePersistedConfig(next);
      const ctx = await createCommandContext(this, { allowMissingApiKey: true });
      writeOutput(ctx.outputMode, { unset: keys, path: configPath }, keys);
    });

  config
    .command("import")
    .description("Import config JSON from stdin")
    .option("--json", "Read JSON payload from stdin")
    .action(async function action(this: Command, options: { json?: boolean }) {
      if (!options.json) {
        throw new CliError("Use --json for config import.", 2);
      }

      const payload = await readStdinText();
      if (!payload) {
        throw new CliError("No JSON payload found on stdin.", 2);
      }

      const parsed = PersistedConfigSchema.parse(JSON.parse(payload));
      const configPath = await writePersistedConfig(parsed);
      const ctx = await createCommandContext(this, { allowMissingApiKey: true });
      writeOutput(ctx.outputMode, { imported: true, path: configPath }, [configPath]);
    });

  config
    .command("export")
    .description("Export effective config")
    .option("--json", "Export as JSON")
    .action(async function action(this: Command, options: { json?: boolean }) {
      const flags = getGlobalFlags(this);
      if (!options.json && !flags.json) {
        throw new CliError("Use --json to export machine-readable config.", 2);
      }

      const ctx = await createCommandContext(this, { allowMissingApiKey: true });
      const { effective } = await resolveEffectiveConfig({
        endpoint: ctx.config.endpoint,
        region: ctx.config.region,
        timeout: ctx.config.timeout,
        retries: ctx.config.retries,
      });

      writeOutput("json", { config: effective });
    });
}
