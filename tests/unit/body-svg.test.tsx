import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { BACK_SHAPES, FRONT_SHAPES } from "@/components/body-map/body-shapes";
import { BodySvg } from "@/components/body-map/body-svg";
import type { IntensityLevel } from "@/lib/muscle-intensity";
import { MUSCLE_GROUPS, type MuscleGroup } from "@/lib/muscles";

const levels = Object.fromEntries(MUSCLE_GROUPS.map((m) => [m, "none"])) as Record<MuscleGroup, IntensityLevel>;
const scores = Object.fromEntries(MUSCLE_GROUPS.map((m) => [m, 0])) as Record<MuscleGroup, number>;

describe("BodySvg display mode (no onSelect)", () => {
  const html = renderToStaticMarkup(
    <BodySvg view="front" levels={{ ...levels, chest: "high" }} scores={{ ...scores, chest: 14 }} className="h-64" />,
  );

  it("is an image, not a group of buttons", () => {
    expect(html).toContain('role="img"');
    expect(html).not.toContain('role="button"');
    expect(html).not.toContain("tabindex");
  });

  it("gives each muscle a tooltip title and colors it by level", () => {
    expect(html).toContain("<title>Chest, Heavy, 14 weighted sets</title>");
    expect(html).toContain("fill-intensity-high");
    expect(html).toContain("fill-intensity-none");
  });

  it("uses the size class it is given", () => {
    expect(html).toContain("h-64");
    expect(html).not.toContain("h-[26rem]");
  });
});

describe("BodySvg highlight", () => {
  const plain = renderToStaticMarkup(<BodySvg view="front" levels={levels} scores={scores} />);
  const outlined = renderToStaticMarkup(
    <BodySvg view="front" levels={levels} scores={scores} highlight={new Set<MuscleGroup>(["chest", "abs"])} />,
  );
  const count = (html: string) => (html.match(/stroke-primary/g) ?? []).length;

  it("outlines only the highlighted muscles, both halves of each", () => {
    expect(count(plain)).toBe(0);
    expect(count(outlined)).toBe(4); // chest and abs, left and right
  });

  it("does not change the fill colors or make the map interactive", () => {
    expect(outlined).not.toContain('role="button"');
    expect(outlined.match(/fill-intensity-none/g)?.length).toBe(plain.match(/fill-intensity-none/g)?.length);
  });

  it("ignores highlighted muscles that are not on this side", () => {
    const back = renderToStaticMarkup(
      <BodySvg view="front" levels={levels} scores={scores} highlight={new Set<MuscleGroup>(["lats"])} />,
    );
    expect(count(back)).toBe(0);
  });
});

describe("BodySvg interactive mode", () => {
  const html = renderToStaticMarkup(
    <BodySvg view="back" levels={levels} scores={scores} selected="lats" onSelect={vi.fn()} />,
  );

  it("makes every back view muscle a focusable button", () => {
    const buttons = html.match(/role="button"/g) ?? [];
    expect(buttons).toHaveLength(new Set(BACK_SHAPES.map((s) => s.muscle)).size);
    expect(html).toContain('tabindex="0"');
  });

  it("marks the selected muscle and keeps the large default size", () => {
    expect(html).toContain('aria-pressed="true"');
    expect(html).toContain("stroke-primary");
    expect(html).toContain("h-[26rem]");
  });
});

describe("body shapes", () => {
  it("front and back together cover all 16 muscle groups", () => {
    const covered = new Set([...FRONT_SHAPES, ...BACK_SHAPES].map((s) => s.muscle));
    expect([...covered].sort()).toEqual([...MUSCLE_GROUPS].sort());
  });
});
