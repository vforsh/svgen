import { z } from "zod";

export const ImageReferenceSchema = z.union([
  z.object({ url: z.string().url() }).strict(),
  z.object({ base64: z.string().min(1).max(16_777_216) }).strict(),
]);

export const GenerateRequestSchema = z
  .object({
    model: z.string().min(1),
    prompt: z.string().min(1),
    instructions: z.string().min(1).optional(),
    n: z.number().int().min(1).max(16).optional(),
    top_p: z.number().min(0).max(1).optional(),
    max_output_tokens: z.number().int().min(1).max(131_072).optional(),
    stream: z.boolean().optional(),
    temperature: z.number().min(0).max(2).optional(),
    presence_penalty: z.number().min(-2).max(2).optional(),
    references: z.array(ImageReferenceSchema).max(4).optional(),
  })
  .strict();

export const VectorizeRequestSchema = z
  .object({
    model: z.string().min(1),
    image: ImageReferenceSchema,
    n: z.number().int().min(1).max(16).optional(),
    top_p: z.number().min(0).max(1).optional(),
    max_output_tokens: z.number().int().min(1).max(131_072).optional(),
    stream: z.boolean().optional(),
    temperature: z.number().min(0).max(2).optional(),
    presence_penalty: z.number().min(-2).max(2).optional(),
    auto_crop: z.boolean().optional(),
    target_size: z.number().int().min(128).max(4096).optional(),
  })
  .strict();

export const SvgDocumentSchema = z
  .object({
    svg: z.string().min(1),
    mime_type: z.literal("image/svg+xml"),
  })
  .strict();

export const SvgResponseSchema = z
  .object({
    id: z.string().min(1),
    created: z.number().int().min(0),
    data: z.array(SvgDocumentSchema).min(1),
    usage: z
      .object({
        total_tokens: z.number().int().min(0),
        input_tokens: z.number().int().min(0),
        output_tokens: z.number().int().min(0),
      })
      .optional(),
  })
  .passthrough();

export const ErrorEnvelopeSchema = z
  .object({
    status: z.number().int(),
    code: z.string(),
    message: z.string().min(1),
    request_id: z.string().min(1).optional(),
  })
  .passthrough();

export type GenerateRequest = z.infer<typeof GenerateRequestSchema>;
export type VectorizeRequest = z.infer<typeof VectorizeRequestSchema>;
export type SvgResponse = z.infer<typeof SvgResponseSchema>;
