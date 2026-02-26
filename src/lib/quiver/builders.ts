import { CliError } from "../errors.ts";
import { GenerateRequestSchema, VectorizeRequestSchema, type GenerateRequest, type VectorizeRequest } from "./schemas.ts";

interface SharedInput {
  model: string;
  n?: number;
  topP?: number;
  maxOutputTokens?: number;
  stream?: boolean;
  temperature?: number;
  presencePenalty?: number;
}

export interface BuildGenerateInput extends SharedInput {
  prompt: string;
  instructions?: string;
  referenceUrls: string[];
  referenceBase64: string[];
}

export interface BuildVectorizeInput extends SharedInput {
  imageUrl?: string;
  imageBase64?: string;
  autoCrop?: boolean;
  targetSize?: number;
}

export function buildGenerateRequest(input: BuildGenerateInput): GenerateRequest {
  const references = [
    ...input.referenceUrls.map((url) => ({ url })),
    ...input.referenceBase64.map((base64) => ({ base64 })),
  ];

  const payload = {
    model: input.model,
    prompt: input.prompt,
    instructions: input.instructions,
    n: input.n,
    top_p: input.topP,
    max_output_tokens: input.maxOutputTokens,
    stream: input.stream,
    temperature: input.temperature,
    presence_penalty: input.presencePenalty,
    references: references.length > 0 ? references : undefined,
  };

  const parsed = GenerateRequestSchema.safeParse(payload);
  if (!parsed.success) {
    throw new CliError(`Invalid generation payload: ${parsed.error.issues[0]?.message ?? "unknown error"}`, 2, parsed.error.issues);
  }

  return parsed.data;
}

export function buildVectorizeRequest(input: BuildVectorizeInput): VectorizeRequest {
  const hasUrl = Boolean(input.imageUrl);
  const hasBase64 = Boolean(input.imageBase64);

  if (hasUrl === hasBase64) {
    throw new CliError("Provide exactly one of --image-url or --image-base64-stdin.", 2);
  }

  const payload = {
    model: input.model,
    image: input.imageUrl ? { url: input.imageUrl } : { base64: input.imageBase64 },
    n: input.n,
    top_p: input.topP,
    max_output_tokens: input.maxOutputTokens,
    stream: input.stream,
    temperature: input.temperature,
    presence_penalty: input.presencePenalty,
    auto_crop: input.autoCrop,
    target_size: input.targetSize,
  };

  const parsed = VectorizeRequestSchema.safeParse(payload);
  if (!parsed.success) {
    throw new CliError(`Invalid vectorization payload: ${parsed.error.issues[0]?.message ?? "unknown error"}`, 2, parsed.error.issues);
  }

  return parsed.data;
}
