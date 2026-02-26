import { describe, expect, test } from "bun:test";
import { resolveOutputDir, resolveSvgOutputPath } from "../src/lib/paths.ts";

describe("paths", () => {
  test("resolveOutputDir returns cwd when empty", () => {
    expect(resolveOutputDir()).toBe(process.cwd());
  });

  test("resolveSvgOutputPath builds stable filename", () => {
    const output = resolveSvgOutputPath("/tmp/out", "resp_01:abc", 1);
    expect(output).toBe("/tmp/out/resp_01_abc-2.svg");
  });
});
