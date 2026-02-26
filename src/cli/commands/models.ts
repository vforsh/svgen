import { Command } from "commander";
import { createCommandContext } from "../context.ts";
import { QuiverClient } from "../../lib/quiver/client.ts";
import { writeOutput } from "../../lib/output.ts";

function buildClient(apiKey: string, endpoint: string, timeout: number, retries: number): QuiverClient {
  return new QuiverClient({ apiKey, endpoint, timeout, retries });
}

export function registerModelsCommand(program: Command): void {
  const models = program.command("models").description("List or inspect models");

  models
    .command("list")
    .alias("ls")
    .description("List available models")
    .action(async function action(this: Command) {
      const ctx = await createCommandContext(this);
      const client = buildClient(ctx.config.apiKey!, ctx.config.endpoint, ctx.config.timeout, ctx.config.retries);
      const payload = (await client.listModels()) as { data?: Array<{ id?: string }> };
      const plainLines = Array.isArray(payload.data) ? payload.data.map((item) => item.id ?? "") : [];
      writeOutput(ctx.outputMode, payload, plainLines);
    });

  models
    .command("get")
    .description("Get one model")
    .argument("<model>")
    .action(async function action(this: Command, model: string) {
      const ctx = await createCommandContext(this);
      const client = buildClient(ctx.config.apiKey!, ctx.config.endpoint, ctx.config.timeout, ctx.config.retries);
      const payload = await client.getModel(model);
      const plain = typeof payload === "object" && payload && "id" in payload ? [String((payload as { id: unknown }).id)] : undefined;
      writeOutput(ctx.outputMode, payload, plain);
    });

  models
    .action(async function action(this: Command) {
      const ctx = await createCommandContext(this);
      const client = buildClient(ctx.config.apiKey!, ctx.config.endpoint, ctx.config.timeout, ctx.config.retries);
      const payload = (await client.listModels()) as { data?: Array<{ id?: string }> };
      const plainLines = Array.isArray(payload.data) ? payload.data.map((item) => item.id ?? "") : [];
      writeOutput(ctx.outputMode, payload, plainLines);
    });
}
