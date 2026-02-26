import { Command } from "commander";
import { createCommandContext } from "../context.ts";
import { CliError } from "../../lib/errors.ts";
import { writeOutput } from "../../lib/output.ts";
import { buildGenerateRequest } from "../../lib/quiver/builders.ts";
import { QuiverClient } from "../../lib/quiver/client.ts";
import { parseSsePayload } from "../../lib/quiver/stream.ts";
import { saveSvgResponse } from "../helpers.ts";

interface GenOptions {
  prompt?: string;
  model?: string;
  instructions?: string;
  n?: number;
  topP?: number;
  maxOutputTokens?: number;
  temperature?: number;
  presencePenalty?: number;
  stream?: boolean;
  referenceUrl?: string[];
  referenceBase64?: string[];
  saveDir?: string;
}

function numberParser(value: string): number {
  return Number(value);
}

export function registerGenCommand(program: Command): void {
  program
    .command("gen")
    .aliases(["run", "do"])
    .description("Generate SVGs from a text prompt")
    .requiredOption("-p, --prompt <text>", "Prompt")
    .option("-m, --model <id>", "Model id")
    .option("--instructions <text>", "Additional style instructions")
    .option("-n <count>", "Output count (1-16)", numberParser)
    .option("--top-p <value>", "Top-p", numberParser)
    .option("--max-output-tokens <value>", "Max output tokens", numberParser)
    .option("--temperature <value>", "Temperature", numberParser)
    .option("--presence-penalty <value>", "Presence penalty", numberParser)
    .option("--stream", "Use SSE streaming")
    .option("--reference-url <url...>", "Reference image URL(s)")
    .option("--reference-base64 <value...>", "Reference image(s) as base64")
    .option("--save-dir <path>", "Directory to save SVG outputs")
    .action(async function action(this: Command, options: GenOptions) {
      const ctx = await createCommandContext(this);
      const client = new QuiverClient({
        apiKey: ctx.config.apiKey!,
        endpoint: ctx.config.endpoint,
        timeout: ctx.config.timeout,
        retries: ctx.config.retries,
      });

      if (!options.prompt) {
        throw new CliError("Missing --prompt", 2);
      }

      const payload = buildGenerateRequest({
        model: options.model ?? ctx.config.model,
        prompt: options.prompt,
        instructions: options.instructions,
        n: options.n,
        topP: options.topP,
        maxOutputTokens: options.maxOutputTokens,
        stream: Boolean(options.stream),
        temperature: options.temperature,
        presencePenalty: options.presencePenalty,
        referenceUrls: options.referenceUrl ?? [],
        referenceBase64: options.referenceBase64 ?? [],
      });

      if (payload.stream) {
        const raw = await client.generateStream(payload);
        const events = parseSsePayload(raw);
        const plain = events.map((event) => `${event.event}\t${typeof event.data === "string" ? event.data : JSON.stringify(event.data)}`);
        writeOutput(ctx.outputMode, { stream: events }, plain);
        return;
      }

      const response = await client.generate(payload);
      const files = options.saveDir ? await saveSvgResponse(response, options.saveDir) : [];
      const plain = files.length > 0 ? files : [response.id];
      writeOutput(ctx.outputMode, { response, files }, plain);
    });
}
