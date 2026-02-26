import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { resolveOutputDir, resolveSvgOutputPath } from "../lib/paths.ts";
import type { SvgResponse } from "../lib/quiver/schemas.ts";

export async function saveSvgResponse(response: SvgResponse, outputDir?: string): Promise<string[]> {
  const dir = resolveOutputDir(outputDir);
  await mkdir(dir, { recursive: true });

  const paths: string[] = [];
  for (let index = 0; index < response.data.length; index += 1) {
    const item = response.data[index];
    if (!item) {
      continue;
    }

    const filePath = resolveSvgOutputPath(dir, response.id, index);
    await writeFile(filePath, item.svg, "utf8");
    paths.push(path.resolve(filePath));
  }

  return paths;
}

const doneStatuses = new Set(["done", "completed", "complete", "succeeded", "success"]);
const pendingStatuses = new Set(["queued", "pending", "processing", "running", "in_progress"]);
const failStatuses = new Set(["failed", "error", "cancelled", "canceled"]);

export function inferGenerationState(payload: unknown): { state: "done" | "pending" | "failed"; reason?: string } {
  if (payload && typeof payload === "object") {
    const data = payload as Record<string, unknown>;

    if (Array.isArray(data.data) && data.data.length > 0) {
      return { state: "done" };
    }

    if (typeof data.status === "number" && data.status >= 400) {
      return {
        state: "failed",
        reason: typeof data.message === "string" ? data.message : `HTTP ${data.status}`,
      };
    }

    if (typeof data.status === "string") {
      const status = data.status.toLowerCase();
      if (doneStatuses.has(status)) {
        return { state: "done" };
      }
      if (pendingStatuses.has(status)) {
        return { state: "pending" };
      }
      if (failStatuses.has(status)) {
        return {
          state: "failed",
          reason: typeof data.message === "string" ? data.message : `status=${status}`,
        };
      }
    }

    if (typeof data.id === "string") {
      return { state: "pending" };
    }
  }

  return { state: "pending" };
}
