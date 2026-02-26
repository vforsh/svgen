import { CliError } from "./errors.ts";

export async function readStdinText(): Promise<string> {
  if (process.stdin.isTTY) {
    throw new CliError("Expected piped stdin but stdin is interactive.", 2);
  }

  const chunks: Buffer[] = [];
  for await (const chunk of process.stdin) {
    chunks.push(Buffer.from(chunk));
  }

  return Buffer.concat(chunks).toString("utf8").trim();
}
