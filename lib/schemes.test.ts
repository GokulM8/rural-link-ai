import { describe, expect, it } from "vitest";
import { stripMarkdown } from "./schemes";

describe("stripMarkdown", () => {
  it("strips raw HTML tags embedded in MyScheme's markdown (regression: literal <br> was rendering on cards)", () => {
    expect(stripMarkdown("Anyone is eligible to apply under the scheme. <br>")).toBe(
      "Anyone is eligible to apply under the scheme."
    );
  });

  it("strips blockquote markers and markdown emphasis characters", () => {
    expect(stripMarkdown("> A quoted line\n**bold** and _italic_")).toBe("A quoted line bold and italic");
  });

  it("collapses repeated whitespace", () => {
    expect(stripMarkdown("a   b\n\nc")).toBe("a b c");
  });

  it("truncates with an ellipsis past maxLength", () => {
    const long = "a".repeat(200);
    const result = stripMarkdown(long, 50);
    expect(result.length).toBe(50);
    expect(result.endsWith("…")).toBe(true);
  });

  it("leaves short text under maxLength untouched", () => {
    expect(stripMarkdown("short text", 180)).toBe("short text");
  });
});
