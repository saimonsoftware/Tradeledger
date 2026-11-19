import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { ChatText } from "@/components/coach/chat-text";

describe("ChatText (safe formatting of AI replies)", () => {
  it("renders **bold** and bullet lists", () => {
    const html = renderToStaticMarkup(<ChatText text={"**Focus** on mornings.\n- one\n- two"} />);
    expect(html).toContain("<strong");
    expect(html).toContain("Focus</strong>");
    expect(html).toContain("<li>one</li>");
  });

  it("never turns model text into real HTML (escapes tags and scripts)", () => {
    const html = renderToStaticMarkup(
      <ChatText text={'<img src=x onerror="alert(1)"> **<script>x</script>**'} />,
    );
    expect(html).not.toContain("<img");
    expect(html).not.toContain("<script>");
    expect(html).toContain("&lt;img");
  });
});
