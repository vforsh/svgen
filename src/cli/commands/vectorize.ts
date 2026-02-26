import { Command } from "commander";
import { createCommandContext } from "../context.ts";
import { writeOutput } from "../../lib/output.ts";
import { buildVectorizeRequest } from "../../lib/quiver/builders.ts";
import { QuiverClient } from "../../lib/quiver/client.ts";
import { parseSsePayload } from "../../lib/quiver/stream.ts";
import { readStdinText } from "../../lib/io.ts";
import { saveSvgResponse } from "../helpers.ts";

interface VectorizeOptions {
  model?: string;
  imageUrl?: string;
  imageBase64Stdin?: boolean;
  n?: number;
  topP?: number;
  maxOutputTokens?: number;
  temperature?: number;
  presencePenalty?: number;
  stream?: boolean;
  autoCrop?: boolean;
  targetSize?: number;
  saveDir?: string;
}

function numberParser(value: string): number {
  return Number(value);
}

export function registerVectorizeCommand(program: Command): void {
  program
    .command("vectorize")
    .description("Vectorize an image into SVG")
    .option("-m, --model <id>", "Model id")
    .option("--image-url <url>", "Image URL to vectorize")
    .option("--image-base64-stdin", "Read base64 image payload from stdin")
    .option("-n <count>", "Output count (1-16)", numberParser)
    .option("--top-p <value>", "Top-p", numberParser)
    .option("--max-output-tokens <value>", "Max output tokens", numberParser)
    .option("--temperature <value>", "Temperature", numberParser)
    .option("--presence-penalty <value>", "Presence penalty", numberParser)
    .option("--auto-crop", "Auto-crop image")
    .option("--target-size <pixels>", "Preprocess target size", numberParser)
    .option("--stream", "Use SSE streaming")
    .option("--save-dir <path>", "Directory to save SVG outputs")
    .action(async function action(this: Command, options: VectorizeOptions) {
      const ctx = await createCommandContext(this);
      const client = new QuiverClient({
        apiKey: ctx.config.apiKey!,
        endpoint: ctx.config.endpoint,
        timeout: ctx.config.timeout,
        retries: ctx.config.retries,
      });

      const imageBase64 = options.imageBase64Stdin ? await readStdinText() : undefined;
      const payload = buildVectorizeRequest({
        model: options.model ?? ctx.config.model,
        imageUrl: options.imageUrl,
        imageBase64,
        n: options.n,
        topP: options.topP,
        maxOutputTokens: options.maxOutputTokens,
        stream: Boolean(options.stream),
        temperature: options.temperature,
        presencePenalty: options.presencePenalty,
        autoCrop: Boolean(options.autoCrop),
        targetSize: options.targetSize,
      });

      if (payload.stream) {
        const raw = await client.vectorizeStream(payload);
        const events = parseSsePayload(raw);
        const plain = events.map((event) => `${event.event}\t${typeof event.data === "string" ? event.data : JSON.stringify(event.data)}`);
        writeOutput(ctx.outputMode, { stream: events }, plain);
        return;
      }

      const response = await client.vectorize(payload);
      const files = options.saveDir ? await saveSvgResponse(response, options.saveDir) : [];
      const plain = files.length > 0 ? files : [response.id];
      writeOutput(ctx.outputMode, { response, files }, plain);
    });
}
