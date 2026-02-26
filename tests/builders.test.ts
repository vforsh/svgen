import { describe, expect, test } from "bun:test";
import { buildGenerateRequest, buildVectorizeRequest } from "../src/lib/quiver/builders.ts";

describe("buildGenerateRequest", () => {
  test("builds valid payload", () => {
    const payload = buildGenerateRequest({
      model: "arrow-preview",
      prompt: "A rocket icon",
      referenceUrls: ["https://example.com/ref.png"],
      referenceBase64: [],
      stream: false,
    });

    expect(payload.model).toBe("arrow-preview");
    expect(payload.prompt).toBe("A rocket icon");
    expect(payload.references?.length).toBe(1);
  });

  test("rejects invalid prompt", () => {
    expect(() =>
      buildGenerateRequest({
        model: "arrow-preview",
        prompt: "",
        referenceUrls: [],
        referenceBase64: [],
      }),
    ).toThrow();
  });
});

describe("buildVectorizeRequest", () => {
  test("builds URL payload", () => {
    const payload = buildVectorizeRequest({
      model: "arrow-preview",
      imageUrl: "https://example.com/a.png",
    });

    expect(payload.model).toBe("arrow-preview");
    expect("url" in payload.image).toBeTrue();
  });

  test("requires one image source", () => {
    expect(() =>
      buildVectorizeRequest({
        model: "arrow-preview",
      }),
    ).toThrow();

    expect(() =>
      buildVectorizeRequest({
        model: "arrow-preview",
        imageUrl: "https://example.com/a.png",
        imageBase64: "abc",
      }),
    ).toThrow();
  });
});
