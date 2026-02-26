export type OutputMode = "human" | "json" | "plain";

export interface GlobalFlagValues {
  json?: boolean;
  plain?: boolean;
  quiet?: boolean;
  verbose?: boolean;
  timeout?: number;
  retries?: number;
  endpoint?: string;
  region?: string;
}
