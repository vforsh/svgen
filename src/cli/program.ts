import { Command } from "commander";
import { CliError } from "../lib/errors.ts";
import { VERSION } from "../version.ts";
import { registerConfigCommand } from "./commands/config.ts";
import { registerDoctorCommand } from "./commands/doctor.ts";
import { registerGenCommand } from "./commands/gen.ts";
import { registerModelsCommand } from "./commands/models.ts";
import { registerResultCommand } from "./commands/result.ts";
import { registerSkillCommand } from "./commands/skill.ts";
import { registerVectorizeCommand } from "./commands/vectorize.ts";
import { registerWaitCommand } from "./commands/wait.ts";

function numberParser(value: string): number {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) {
    throw new CliError(`Invalid number: ${value}`, 2);
  }
  return parsed;
}

export function buildProgram(): Command {
  const program = new Command();

  program
    .name("svgen")
    .description("Generate and vectorize SVGs via QuiverAI API")
    .version(VERSION)
    .showHelpAfterError()
    .option("--json", "Output a single JSON object")
    .option("--plain", "Output stable plain-text lines")
    .option("-q, --quiet", "Suppress non-essential stderr logs")
    .option("-v, --verbose", "Verbose logs")
    .option("--timeout <ms>", "Request timeout in milliseconds", numberParser)
    .option("--retries <n>", "Retry count for retryable requests", numberParser)
    .option("--endpoint <url>", "API endpoint base URL")
    .option("--region <name>", "Optional region label for config")
    .exitOverride((error) => {
      throw new CliError(error.message, error.code === "commander.helpDisplayed" ? 0 : 2);
    });

  registerGenCommand(program);
  registerVectorizeCommand(program);
  registerResultCommand(program);
  registerWaitCommand(program);
  registerModelsCommand(program);
  registerConfigCommand(program);
  registerDoctorCommand(program);
  registerSkillCommand(program);

  return program;
}
