import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { POSES, SeraArt } from "@/components/mascot/sera-art";
import { MOODS, QUIRKS } from "@/lib/mascot/types";

const VIEWS = ["bust", "half", "full", "avatar"] as const;

describe("Sera's drawing", () => {
  it("renders every mood in every view, pose and quirk", () => {
    for (const mood of MOODS) {
      for (const view of VIEWS) {
        for (const pose of POSES) {
          const html = renderToStaticMarkup(<SeraArt mood={mood} view={view} pose={pose} size={200} />);
          expect(html, `${mood} ${view} ${pose}`).toContain("<svg");
          expect(html).toContain('aria-hidden="true"');
          expect(html).not.toContain("—");
        }
      }
      for (const quirk of QUIRKS) expect(renderToStaticMarkup(<SeraArt mood={mood} quirk={quirk} />)).toContain(`sera-q-${quirk}`);
    }
  }, 20_000);

  it("keeps the height in step with the width for each view, or leaves it to CSS with fluid", () => {
    expect(renderToStaticMarkup(<SeraArt view="half" size={240} />)).toContain('height="400"');
    expect(renderToStaticMarkup(<SeraArt view="bust" size={240} />)).toContain('height="300"');
    expect(renderToStaticMarkup(<SeraArt view="avatar" size={152} />)).toContain('height="170"');
    expect(renderToStaticMarkup(<SeraArt view="full" size={240} />)).toContain('height="800"');
    const fluid = renderToStaticMarkup(<SeraArt view="half" fluid />);
    const tag = fluid.match(/^<svg[^>]*>/)?.[0] ?? "";
    expect(tag).not.toMatch(/ width="/);
    expect(tag).toContain("viewBox");
  });

  it("shows her sparkle only when she cheers, and her moving mouth only while she talks", () => {
    expect(renderToStaticMarkup(<SeraArt mood="cheer" />)).toContain("sera-sparkle");
    expect(renderToStaticMarkup(<SeraArt mood="calm" />)).not.toContain("sera-sparkle");
    expect(renderToStaticMarkup(<SeraArt talking />)).toContain("sera-mouth-talk");
    expect(renderToStaticMarkup(<SeraArt />)).not.toContain("sera-mouth-talk");
  });

  it("gives each arm drawing its own look, and maps the other poses onto them", () => {
    const html = Object.fromEntries(POSES.map((pose) => [pose, renderToStaticMarkup(<SeraArt view="half" pose={pose} />)]));
    expect(html.wave).toContain("sera-hand-wave");
    expect(html.point).toContain("sera-hand-bob");
    expect(html.cheer).toContain("sera-hand-bob");
    expect(html.idle).not.toContain("sera-hand-wave");
    expect(html.hairflip).toBe(html.wave);
    expect(new Set([html.idle, html.wave, html.point, html.cheer]).size).toBe(4);
  });

  it("only draws the legs in the full view", () => {
    const legs = (view: (typeof VIEWS)[number]) => renderToStaticMarkup(<SeraArt view={view} />);
    expect(legs("full").length).toBeGreaterThan(legs("half").length);
    expect(legs("full")).toContain("ellipse");
    expect(legs("half")).not.toContain('rx="74"');
    expect(legs("full")).toContain('rx="74"');
  });

  it("draws the arms in the half and full views only", () => {
    const arms = (view: (typeof VIEWS)[number]) => renderToStaticMarkup(<SeraArt view={view} pose="wave" />);
    expect(arms("half")).toContain("sera-hand-wave");
    expect(arms("full")).toContain("sera-hand-wave");
    expect(arms("bust")).not.toContain("sera-hand-wave");
    expect(arms("avatar")).not.toContain("sera-hand-wave");
  });

  it("shows her tongue for the tongue quirk and the taunt, and the sweat drop for a flustered face", () => {
    const plain = renderToStaticMarkup(<SeraArt mood="smug" />);
    expect(renderToStaticMarkup(<SeraArt mood="smug" quirk="tongue" />).length).toBeGreaterThan(plain.length);
    expect(renderToStaticMarkup(<SeraArt mood="smug" view="half" pose="taunt" />)).toContain("M116 155");
    expect(renderToStaticMarkup(<SeraArt mood="flustered" />).length).toBeGreaterThan(renderToStaticMarkup(<SeraArt mood="calm" />).length);
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
