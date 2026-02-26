import { Command } from "commander";
import { createCommandContext } from "../context.ts";
import { CliError } from "../../lib/errors.ts";
import { logInfo, writeOutput } from "../../lib/output.ts";
import { QuiverClient } from "../../lib/quiver/client.ts";
import { SvgResponseSchema } from "../../lib/quiver/schemas.ts";
import { inferGenerationState, saveSvgResponse } from "../helpers.ts";

interface WaitOptions {
  interval?: number;
  maxWait?: number;
  saveDir?: string;
}

function numberParser(value: string): number {
  return Number(value);
}

export function registerWaitCommand(program: Command): void {
  program
    .command("wait")
    .description("Poll generation endpoint until result is ready")
    .argument("<id>", "Generation id")
    .option("--interval <ms>", "Polling interval in ms", numberParser)
    .option("--max-wait <ms>", "Maximum wait duration in ms", numberParser)
    .option("--save-dir <path>", "Directory to save SVG outputs")
    .action(async function action(this: Command, id: string, options: WaitOptions) {
      const ctx = await createCommandContext(this);
      const client = new QuiverClient({
        apiKey: ctx.config.apiKey!,
        endpoint: ctx.config.endpoint,
        timeout: ctx.config.timeout,
        retries: ctx.config.retries,
      });

      const interval = options.interval ?? ctx.config.pollInterval;
      const maxWait = options.maxWait ?? 300_000;
      const started = Date.now();

      // Poll status endpoint until the payload looks complete or failed.
      while (Date.now() - started <= maxWait) {
        const payload = await client.getGeneration(id);
        const state = inferGenerationState(payload);

        if (state.state === "failed") {
          throw new CliError(`Generation failed: ${state.reason ?? "unknown error"}`, 1, payload);
        }

        if (state.state === "done") {
          const parsed = SvgResponseSchema.safeParse(payload);
          const files = parsed.success && options.saveDir ? await saveSvgResponse(parsed.data, options.saveDir) : [];
          const plain =
            files.length > 0
              ? files
              : typeof payload === "object" && payload && "id" in payload
                ? [String((payload as { id: unknown }).id)]
                : [JSON.stringify(payload)];
          writeOutput(ctx.outputMode, payload, plain);
          return;
        }

        logInfo(!ctx.quiet, `waiting for ${id}...`);
        await Bun.sleep(interval);
      }

      throw new CliError(`Timed out waiting for generation ${id} after ${maxWait}ms.`, 1);
    });
}
