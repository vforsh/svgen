import { homedir } from "node:os";
import path from "node:path";

export const APP_NAME = "svgen";

export function getConfigPath(): string {
  const base = process.env.XDG_CONFIG_HOME ?? path.join(homedir(), ".config");
  return path.join(base, APP_NAME, "config.json");
}

export function getCacheDir(): string {
  const base = process.env.XDG_CACHE_HOME ?? path.join(homedir(), ".cache");
  return path.join(base, APP_NAME);
}

export function resolveOutputDir(outputDir?: string): string {
  if (!outputDir || outputDir.trim().length === 0) {
    return process.cwd();
  }
  return path.resolve(outputDir);
}

export function resolveSvgOutputPath(baseDir: string, responseId: string, index: number): string {
  const safeId = responseId.replace(/[^a-zA-Z0-9._-]/g, "_");
  return path.join(baseDir, `${safeId}-${index + 1}.svg`);
}
