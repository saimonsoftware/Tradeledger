import { describe, expect, it } from "vitest";

import { sniffImageType } from "@/lib/screenshots/sniff";

const bytes = (...b: number[]) => new Uint8Array([...b, ...new Array(16).fill(0)]);
const ascii = (s: string) => [...s].map((c) => c.charCodeAt(0));

describe("sniffImageType (checks the real file bytes, not the name)", () => {
  it("detects PNG, JPEG and WebP", () => {
    expect(sniffImageType(bytes(0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a))?.ext).toBe("png");
    expect(sniffImageType(bytes(0xff, 0xd8, 0xff, 0xe0))?.ext).toBe("jpg");
    expect(sniffImageType(bytes(...ascii("RIFF"), 0, 0, 0, 0, ...ascii("WEBP")))?.mime).toBe(
      "image/webp",
    );
  });

  it("rejects anything else", () => {
    expect(sniffImageType(bytes(...ascii("<svg xmlns")))).toBeNull(); // SVG can contain scripts
    expect(sniffImageType(bytes(...ascii("GIF89a")))).toBeNull();
    expect(sniffImageType(bytes(...ascii("RIFF"), 0, 0, 0, 0, ...ascii("WAVE")))).toBeNull();
    expect(sniffImageType(new Uint8Array())).toBeNull();
  });
});
