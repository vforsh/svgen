import { ApiError, CliError } from "../errors.ts";
import { ErrorEnvelopeSchema, type GenerateRequest, type SvgResponse, SvgResponseSchema, type VectorizeRequest } from "./schemas.ts";

interface ClientOptions {
  endpoint: string;
  apiKey: string;
  timeout: number;
  retries: number;
}

interface RequestOptions {
  method?: "GET" | "POST";
  path: string;
  body?: unknown;
  stream?: boolean;
}

export class QuiverClient {
  private readonly endpoint: string;
  private readonly apiKey: string;
  private readonly timeout: number;
  private readonly retries: number;

  constructor(options: ClientOptions) {
    this.endpoint = options.endpoint.replace(/\/$/, "");
    this.apiKey = options.apiKey;
    this.timeout = options.timeout;
    this.retries = options.retries;
  }

  async listModels(): Promise<unknown> {
    return this.requestJson({ path: "/v1/models" });
  }

  async getModel(model: string): Promise<unknown> {
    return this.requestJson({ path: `/v1/models/${encodeURIComponent(model)}` });
  }

  async generate(payload: GenerateRequest): Promise<SvgResponse> {
    const response = await this.requestJson({
      method: "POST",
      path: "/v1/svgs/generations",
      body: payload,
    });
    return SvgResponseSchema.parse(response);
  }

  async generateStream(payload: GenerateRequest): Promise<string> {
    return this.requestText({
      method: "POST",
      path: "/v1/svgs/generations",
      body: payload,
      stream: true,
    });
  }

  async vectorize(payload: VectorizeRequest): Promise<SvgResponse> {
    const response = await this.requestJson({
      method: "POST",
      path: "/v1/svgs/vectorizations",
      body: payload,
    });
    return SvgResponseSchema.parse(response);
  }

  async vectorizeStream(payload: VectorizeRequest): Promise<string> {
    return this.requestText({
      method: "POST",
      path: "/v1/svgs/vectorizations",
      body: payload,
      stream: true,
    });
  }

  async getGeneration(id: string): Promise<unknown> {
    return this.requestJson({ path: `/v1/svgs/generations/${encodeURIComponent(id)}` });
  }

  private async requestJson(options: RequestOptions): Promise<unknown> {
    const response = await this.request(options);
    const text = await response.text();

    if (!text.trim()) {
      return {};
    }

    let payload: unknown;
    try {
      payload = JSON.parse(text);
    } catch {
      if (!response.ok) {
        throw new ApiError({
          message: `HTTP ${response.status}: ${response.statusText}`,
          status: response.status,
          details: text,
        });
      }
      throw new CliError("Expected JSON response from API.", 1);
    }

    if (!response.ok) {
      const parsedError = ErrorEnvelopeSchema.safeParse(payload);
      if (parsedError.success) {
        throw new ApiError({
          message: `HTTP ${parsedError.data.status} ${parsedError.data.code}: ${parsedError.data.message}`,
          status: parsedError.data.status,
          code: parsedError.data.code,
          requestId: parsedError.data.request_id,
          details: parsedError.data,
        });
      }
      throw new ApiError({
        message: `HTTP ${response.status}: ${response.statusText}`,
        status: response.status,
        details: payload,
      });
    }

    return payload;
  }

  private async requestText(options: RequestOptions): Promise<string> {
    const response = await this.request(options);
    const body = await response.text();

    if (!response.ok) {
      let payload: unknown = body;
      try {
        payload = JSON.parse(body);
      } catch {
        // Keep plain text.
      }

      const parsedError = ErrorEnvelopeSchema.safeParse(payload);
      if (parsedError.success) {
        throw new ApiError({
          message: `HTTP ${parsedError.data.status} ${parsedError.data.code}: ${parsedError.data.message}`,
          status: parsedError.data.status,
          code: parsedError.data.code,
          requestId: parsedError.data.request_id,
          details: parsedError.data,
        });
      }

      throw new ApiError({
        message: `HTTP ${response.status}: ${response.statusText}`,
        status: response.status,
        details: payload,
      });
    }

    return body;
  }

  private async request(options: RequestOptions): Promise<Response> {
    const method = options.method ?? "GET";
    const url = `${this.endpoint}${options.path}`;
    const headers: Record<string, string> = {
      Authorization: `Bearer ${this.apiKey}`,
      Accept: options.stream ? "text/event-stream" : "application/json",
    };

    if (options.body !== undefined) {
      headers["Content-Type"] = "application/json";
    }

    let lastError: unknown;

    for (let attempt = 0; attempt <= this.retries; attempt += 1) {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), this.timeout);

      try {
        const response = await fetch(url, {
          method,
          headers,
          body: options.body !== undefined ? JSON.stringify(options.body) : undefined,
          signal: controller.signal,
        });

        clearTimeout(timeoutId);

        if ((response.status === 429 || response.status >= 500) && attempt < this.retries) {
          await Bun.sleep(Math.min(250 * 2 ** attempt, 3_000));
          continue;
        }

        return response;
      } catch (error) {
        clearTimeout(timeoutId);
        lastError = error;

        if (attempt >= this.retries) {
          break;
        }

        await Bun.sleep(Math.min(250 * 2 ** attempt, 3_000));
      }
    }

    throw new CliError(`Request failed after ${this.retries + 1} attempts.`, 1, lastError);
  }
}
