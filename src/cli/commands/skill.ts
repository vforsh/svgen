import { Command } from "commander";
import { createCommandContext } from "../context.ts";
import { writeOutput } from "../../lib/output.ts";

const SKILL_URL = "https://github.com/vforsh/svgen/tree/main/skill/svgen";

export function registerSkillCommand(program: Command): void {
  program
    .command("skill")
    .description("Print skill install URL")
    .action(async function action(this: Command) {
      const ctx = await createCommandContext(this, { allowMissingApiKey: true });
      if (ctx.outputMode === "json") {
        writeOutput(ctx.outputMode, { skill_url: SKILL_URL });
        return;
      }

      writeOutput(ctx.outputMode, SKILL_URL, [SKILL_URL]);
    });
}
