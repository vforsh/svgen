export interface ParsedSseEvent {
  event: string;
  id?: string;
  retry?: number;
  data: unknown;
}

export function parseSsePayload(input: string): ParsedSseEvent[] {
  const blocks = input
    .split(/\r?\n\r?\n/g)
    .map((block) => block.trim())
    .filter(Boolean);

  const events: ParsedSseEvent[] = [];

  for (const block of blocks) {
    const lines = block.split(/\r?\n/g);
    let event = "message";
    let id: string | undefined;
    let retry: number | undefined;
    const dataLines: string[] = [];

    for (const line of lines) {
      if (line.startsWith("event:")) {
        event = line.slice(6).trim();
      } else if (line.startsWith("id:")) {
        id = line.slice(3).trim();
      } else if (line.startsWith("retry:")) {
        const maybeRetry = Number(line.slice(6).trim());
        if (Number.isFinite(maybeRetry)) {
          retry = maybeRetry;
        }
      } else if (line.startsWith("data:")) {
        dataLines.push(line.slice(5).trim());
      }
    }

    const rawData = dataLines.join("\n");
    if (rawData === "[DONE]") {
      events.push({ event: "done", id, retry, data: "[DONE]" });
      continue;
    }

    let data: unknown = rawData;
    try {
      data = JSON.parse(rawData);
    } catch {
      // Keep as string.
    }

    events.push({ event, id, retry, data });
  }

  return events;
}
