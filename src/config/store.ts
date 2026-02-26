import { access, mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { CliError } from "../lib/errors.ts";
import { getCacheDir, getConfigPath } from "../lib/paths.ts";
import {
  DEFAULT_ENDPOINT,
  DEFAULT_MODEL,
  DEFAULT_POLL_INTERVAL_MS,
  DEFAULT_RETRIES,
  DEFAULT_TIMEOUT_MS,
  EffectiveConfigSchema,
  PersistedConfigSchema,
  type EffectiveConfig,
  type PersistedConfig,
} from "./schema.ts";

const numberEnv = (value: string | undefined): number | undefined => {
  if (!value) {
    return undefined;
  }
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
};

function withoutUndefined<T extends Record<string, unknown>>(obj: T): Partial<T> {
  return Object.fromEntries(Object.entries(obj).filter(([, value]) => value !== undefined)) as Partial<T>;
}

function parseEnvConfig(): PersistedConfig {
  const candidate = {
    endpoint: process.env.SVGEN_ENDPOINT,
    region: process.env.SVGEN_REGION,
    timeout: numberEnv(process.env.SVGEN_TIMEOUT),
    retries: numberEnv(process.env.SVGEN_RETRIES),
    pollInterval: numberEnv(process.env.SVGEN_POLL_INTERVAL),
    model: process.env.SVGEN_MODEL,
    apiKey: process.env.SVGEN_API_KEY ?? process.env.QUIVERAI_API_KEY,
  };

  return PersistedConfigSchema.parse(withoutUndefined(candidate));
}

export async function readPersistedConfig(): Promise<{ path: string; exists: boolean; config: PersistedConfig }> {
  const configPath = getConfigPath();

  try {
    const content = await readFile(configPath, "utf8");
    const parsed = JSON.parse(content);
    return {
      path: configPath,
      exists: true,
      config: PersistedConfigSchema.parse(parsed),
    };
  } catch (error) {
    const err = error as NodeJS.ErrnoException;
    if (err.code === "ENOENT") {
      return { path: configPath, exists: false, config: {} };
    }

    if (error instanceof SyntaxError) {
      throw new CliError(`Invalid JSON in config file: ${configPath}`, 1);
    }

    if (error instanceof Error && "issues" in error) {
      throw new CliError(`Invalid config schema in ${configPath}`, 1, error);
    }

    throw error;
  }
}

export async function writePersistedConfig(config: PersistedConfig): Promise<string> {
  const configPath = getConfigPath();
  await mkdir(path.dirname(configPath), { recursive: true });
  const normalized = PersistedConfigSchema.parse(config);
  await writeFile(configPath, `${JSON.stringify(normalized, null, 2)}\n`, "utf8");
  return configPath;
}

export async function resolveEffectiveConfig(overrides: PersistedConfig = {}): Promise<{
  configPath: string;
  cacheDir: string;
  persisted: PersistedConfig;
  effective: EffectiveConfig;
}> {
  const { path: configPath, config: persisted } = await readPersistedConfig();
  const env = parseEnvConfig();
  const safeOverrides = withoutUndefined(overrides);

  const merged = {
    endpoint: DEFAULT_ENDPOINT,
    timeout: DEFAULT_TIMEOUT_MS,
    retries: DEFAULT_RETRIES,
    pollInterval: DEFAULT_POLL_INTERVAL_MS,
    model: DEFAULT_MODEL,
    ...persisted,
    ...env,
    ...safeOverrides,
  };

  return {
    configPath,
    cacheDir: getCacheDir(),
    persisted,
    effective: EffectiveConfigSchema.parse(merged),
  };
}

export async function inspectConfigFile(): Promise<{
  path: string;
  exists: boolean;
  status: "ok" | "warn" | "fail";
  message: string;
}> {
  const configPath = getConfigPath();
  try {
    const content = await readFile(configPath, "utf8");
    const parsed = JSON.parse(content);
    PersistedConfigSchema.parse(parsed);
    return {
      path: configPath,
      exists: true,
      status: "ok",
      message: "Config file is valid.",
    };
  } catch (error) {
    const err = error as NodeJS.ErrnoException;
    if (err.code === "ENOENT") {
      return {
        path: configPath,
        exists: false,
        status: "warn",
        message: "Config file does not exist yet.",
      };
    }

    if (error instanceof SyntaxError) {
      return {
        path: configPath,
        exists: true,
        status: "fail",
        message: "Config file contains invalid JSON.",
      };
    }

    return {
      path: configPath,
      exists: true,
      status: "fail",
      message: "Config file does not match expected schema.",
    };
  }
}

export async function checkPathAccess(targetPath: string): Promise<{ readable: boolean; writable: boolean }> {
  try {
    await access(targetPath);
    return { readable: true, writable: true };
  } catch {
    return { readable: false, writable: false };
  }
}
