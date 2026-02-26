import { Command } from "commander";
import { createCommandContext } from "../context.ts";
import { writeOutput } from "../../lib/output.ts";
import { QuiverClient } from "../../lib/quiver/client.ts";
import { SvgResponseSchema } from "../../lib/quiver/schemas.ts";
import { saveSvgResponse } from "../helpers.ts";

interface ResultOptions {
  saveDir?: string;
}

export function registerResultCommand(program: Command): void {
  program
    .command("result")
    .description("Fetch generation result by id")
    .argument("<id>", "Generation id")
    .option("--save-dir <path>", "Directory to save SVG outputs")
    .action(async function action(this: Command, id: string, options: ResultOptions) {
      const ctx = await createCommandContext(this);
      const client = new QuiverClient({
        apiKey: ctx.config.apiKey!,
        endpoint: ctx.config.endpoint,
        timeout: ctx.config.timeout,
        retries: ctx.config.retries,
      });

      const payload = await client.getGeneration(id);
      const parsed = SvgResponseSchema.safeParse(payload);
      const files = parsed.success && options.saveDir ? await saveSvgResponse(parsed.data, options.saveDir) : [];

      const plain =
        files.length > 0
          ? files
          : typeof payload === "object" && payload && "id" in payload
            ? [String((payload as { id: unknown }).id)]
            : [JSON.stringify(payload)];

      writeOutput(ctx.outputMode, payload, plain);
    });
}
