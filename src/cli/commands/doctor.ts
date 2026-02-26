import { Command } from "commander";
import { constants } from "node:fs";
import { access } from "node:fs/promises";
import path from "node:path";
import { createCommandContext } from "../context.ts";
import { inspectConfigFile } from "../../config/store.ts";
import { writeOutput } from "../../lib/output.ts";
import { getCacheDir, getConfigPath } from "../../lib/paths.ts";

type DoctorStatus = "ok" | "warn" | "fail";

interface DoctorCheck {
  id: string;
  status: DoctorStatus;
  message: string;
  hint?: string;
}

function toOverallStatus(checks: DoctorCheck[]): DoctorStatus {
  if (checks.some((check) => check.status === "fail")) {
    return "fail";
  }
  if (checks.some((check) => check.status === "warn")) {
    return "warn";
  }
  return "ok";
}

async function checkRW(targetPath: string): Promise<{ readable: boolean; writable: boolean }> {
  let readable = false;
  let writable = false;

  try {
    await access(targetPath, constants.R_OK);
    readable = true;
  } catch {
    readable = false;
  }

  try {
    await access(targetPath, constants.W_OK);
    writable = true;
  } catch {
    writable = false;
  }

  return { readable, writable };
}

export function registerDoctorCommand(program: Command): void {
  program
    .command("doctor")
    .alias("check")
    .description("Run read-only diagnostics")
    .action(async function action(this: Command) {
      const ctx = await createCommandContext(this, { allowMissingApiKey: true });
      const checks: DoctorCheck[] = [];

      checks.push({
        id: "runtime",
        status: "ok",
        message: `Bun ${Bun.version}`,
      });

      const configInspection = await inspectConfigFile();
      checks.push({
        id: "config",
        status: configInspection.status,
        message: `${configInspection.message} (${configInspection.path})`,
      });

      checks.push({
        id: "auth",
        status: ctx.config.apiKey ? "ok" : "warn",
        message: ctx.config.apiKey ? "API key is configured." : "API key is missing.",
        hint: ctx.config.apiKey ? undefined : "Set SVGEN_API_KEY or run: printf 'KEY' | svgen cfg set apiKey -",
      });

      try {
        const response = await fetch(`${ctx.config.endpoint.replace(/\/$/, "")}/v1/models`, {
          method: "GET",
          headers: ctx.config.apiKey ? { Authorization: `Bearer ${ctx.config.apiKey}` } : undefined,
          signal: AbortSignal.timeout(Math.min(ctx.config.timeout, 5_000)),
        });

        if (response.status >= 500) {
          checks.push({
            id: "endpoint",
            status: "warn",
            message: `Endpoint reachable, but returned ${response.status}.`,
          });
        } else {
          checks.push({
            id: "endpoint",
            status: "ok",
            message: `Endpoint reachable (${response.status}).`,
          });
        }
      } catch (error) {
        checks.push({
          id: "endpoint",
          status: "fail",
          message: `Endpoint unreachable: ${(error as Error).message}`,
          hint: "Check network and --endpoint value.",
        });
      }

      const configDir = path.dirname(getConfigPath());
      const cacheDir = getCacheDir();
      const fsTargets = [
        { id: "config_dir", dir: configDir },
        { id: "cache_dir", dir: cacheDir },
      ];

      for (const target of fsTargets) {
        const existing = await checkRW(target.dir);
        if (existing.readable || existing.writable) {
          checks.push({
            id: target.id,
            status: existing.writable ? "ok" : "warn",
            message: `${target.dir} readable=${existing.readable} writable=${existing.writable}`,
          });
          continue;
        }

        const parent = path.dirname(target.dir);
        const parentRW = await checkRW(parent);
        checks.push({
          id: target.id,
          status: parentRW.writable ? "warn" : "fail",
          message: `${target.dir} does not exist yet; parent writable=${parentRW.writable}`,
          hint: parentRW.writable ? "Directory will be created on first write." : "Grant write access to parent directory.",
        });
      }

      const overall = toOverallStatus(checks);
      const plain = checks.map((check) => `${check.status}\t${check.id}\t${check.message}`);
      writeOutput(ctx.outputMode, { status: overall, checks }, plain);

      process.exitCode = overall === "fail" ? 1 : 0;
    });
}
