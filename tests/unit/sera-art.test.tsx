import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { POSES, SeraArt } from "@/components/mascot/sera-art";
import { MOODS } from "@/lib/mascot/types";

const VIEWS = ["bust", "half", "avatar"] as const;

describe("Sera's drawing", () => {
  it("renders every mood in every view and pose", () => {
    for (const mood of MOODS) {
      for (const view of VIEWS) {
        for (const pose of POSES) {
          const html = renderToStaticMarkup(<SeraArt mood={mood} view={view} pose={pose} size={200} />);
          expect(html, `${mood} ${view} ${pose}`).toContain("<svg");
          expect(html).toContain('aria-hidden="true"');
          expect(html).not.toContain("—");
        }
      }
    }
  });

  it("keeps the height in step with the width for each view", () => {
    expect(renderToStaticMarkup(<SeraArt view="half" size={240} />)).toContain('height="400"');
    expect(renderToStaticMarkup(<SeraArt view="bust" size={240} />)).toContain('height="300"');
    expect(renderToStaticMarkup(<SeraArt view="avatar" size={60} />)).toContain('height="60"');
  });

  it("shows her sparkle only when she cheers, and her moving mouth only while she talks", () => {
    expect(renderToStaticMarkup(<SeraArt mood="cheer" />)).toContain("sera-sparkle");
    expect(renderToStaticMarkup(<SeraArt mood="calm" />)).not.toContain("sera-sparkle");
    expect(renderToStaticMarkup(<SeraArt talking />)).toContain("sera-mouth-talk");
    expect(renderToStaticMarkup(<SeraArt />)).not.toContain("sera-mouth-talk");
  });

  it("gives each pose its own arms", () => {
    const html = Object.fromEntries(POSES.map((pose) => [pose, renderToStaticMarkup(<SeraArt view="half" pose={pose} />)]));
    expect(html.wave).toContain("sera-hand-wave");
    expect(html.point).toContain("sera-hand-bob");
    expect(html.cheer).toContain("sera-hand-bob");
    expect(html.idle).not.toContain("sera-hand-wave");
    expect(new Set(Object.values(html)).size).toBe(POSES.length);
  });

  it("only draws the arms in the half view", () => {
    const arms = (view: (typeof VIEWS)[number]) => renderToStaticMarkup(<SeraArt view={view} pose="wave" />);
    expect(arms("half")).toContain("sera-hand-wave");
    expect(arms("bust")).not.toContain("sera-hand-wave");
    expect(arms("avatar")).not.toContain("sera-hand-wave");
  });

  it("keeps the twin tails, the ahoge and the ribbons that make her her", () => {
    const html = renderToStaticMarkup(<SeraArt view="half" />);
    expect((html.match(/sera-tail/g) ?? []).length).toBeGreaterThanOrEqual(2);
    expect(html).toContain("sera-ahoge");
    expect(html).toContain("sera-ribbon");
  });

  it("gives every instance its own gradient ids, so two on one page never clash", () => {
    const html = renderToStaticMarkup(
      <>
        <SeraArt mood="happy" />
        <SeraArt mood="sleepy" view="avatar" />
      </>,
    );
    const ids = [...html.matchAll(/ id="([^"]+)"/g)].map((m) => m[1]);
    expect(ids.length).toBeGreaterThan(8);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("draws a supplied picture instead of the vector", () => {
    const html = renderToStaticMarkup(<SeraArt src="/sera.png" size={120} view="half" />);
    expect(html).toContain("<img");
    expect(html).toContain('src="/sera.png"');
    expect(html).not.toContain("<svg");
  });
});
