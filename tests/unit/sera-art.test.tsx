import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { SeraArt } from "@/components/mascot/sera-art";
import { spriteFor, spriteSrc } from "@/lib/mascot/sprites";
import { MOODS, POSES, QUIRKS } from "@/lib/mascot/types";

const VIEWS = ["bust", "half", "avatar"] as const;

describe("Sera's picture", () => {
  it("renders every mood, pose, view and quirk as a picture of a sprite that exists", () => {
    for (const mood of MOODS) {
      for (const view of VIEWS) {
        for (const pose of POSES) {
          const html = renderToStaticMarkup(<SeraArt mood={mood} view={view} pose={pose} size={200} />);
          expect(html, `${mood} ${view} ${pose}`).toContain("<img");
          expect(html).toContain(spriteSrc(spriteFor(mood, pose)));
          expect(html).toContain('aria-hidden="true"');
          expect(html).not.toContain("—");
        }
      }
      for (const quirk of QUIRKS) expect(renderToStaticMarkup(<SeraArt mood={mood} view="half" quirk={quirk} />)).toContain(spriteSrc(spriteFor(mood, "idle", quirk)));
    }
  });

  it("keeps her proportions: 2 by 3 for the whole illustration, square for the avatar", () => {
    expect(renderToStaticMarkup(<SeraArt view="half" size={240} />)).toContain("aspect-ratio:0.6666666666666666");
    expect(renderToStaticMarkup(<SeraArt view="bust" size={240} />)).toContain("width:240px");
    expect(renderToStaticMarkup(<SeraArt view="avatar" size={56} />)).toContain("aspect-ratio:1");
  });

  it("lets CSS size her when asked, and crops the avatar to her face", () => {
    expect(renderToStaticMarkup(<SeraArt view="half" size={240} fluid />)).not.toContain("width:240px");
    const avatar = renderToStaticMarkup(<SeraArt view="avatar" size={56} />);
    expect(avatar).toContain("overflow-hidden");
    // The picture is scaled up so the face crop fills the circle, which means more than 100 percent wide.
    expect(avatar).toMatch(/width:2\d\d\.\d+%/);
  });

  it("moves her a little while she talks, and not otherwise", () => {
    expect(renderToStaticMarkup(<SeraArt talking />)).toContain("sera-talking");
    expect(renderToStaticMarkup(<SeraArt />)).not.toContain("sera-talking");
  });

  it("draws a supplied picture instead of the sprites", () => {
    const html = renderToStaticMarkup(<SeraArt src="/mine.png" size={120} view="half" />);
    expect(html).toContain('src="/mine.png"');
    expect(html).toContain('height="180"');
    expect(html).not.toContain("/sera/sprites/");
  });
});
