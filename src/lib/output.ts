import pc from "picocolors";
import type { OutputMode } from "../types.ts";

export function writeOutput(mode: OutputMode, value: unknown, plainLines?: string[]): void {
  if (mode === "json") {
    console.log(JSON.stringify(value, null, 2));
    return;
  }

  if (mode === "plain") {
    if (plainLines && plainLines.length > 0) {
      console.log(plainLines.join("\n"));
      return;
    }
    if (typeof value === "string") {
      console.log(value);
      return;
    }
    console.log(JSON.stringify(value));
    return;
  }

  if (typeof value === "string") {
    console.log(value);
    return;
  }

  console.log(JSON.stringify(value, null, 2));
}

export function logInfo(enabled: boolean, message: string): void {
  if (!enabled) {
    return;
  }
  console.error(pc.dim(message));
}
