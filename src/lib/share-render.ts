import { BODY_DECOR, SHAPES_BY_VIEW, type BodyView } from "@/components/body-map/body-shapes";
import type { IntensityLevel } from "@/lib/muscle-intensity";
import type { MuscleGroup } from "@/lib/muscles";
import type { ShareCard } from "@/lib/share";

export type ShareTemplate = "classic" | "bold" | "light";
export type ShareFormat = "story" | "square";

export const SHARE_TEMPLATES: { value: ShareTemplate; label: string }[] = [
  { value: "classic", label: "Classic" },
  { value: "bold", label: "Bold" },
  { value: "light", label: "Light" },
];

export const SHARE_FORMATS: { value: ShareFormat; label: string; hint: string }[] = [
  { value: "story", label: "Story", hint: "9:16" },
  { value: "square", label: "Square", hint: "1:1" },
];

/** Pixel size of each format. Story fits Instagram and TikTok stories, square fits a feed post. */
export const SHARE_SIZES: Record<ShareFormat, { width: number; height: number }> = {
  story: { width: 1080, height: 1920 },
  square: { width: 1080, height: 1080 },
};

export type ShareFonts = { sans: string; mono: string };

type Palette = {
  bg: [string, string];
  text: string;
  muted: string;
  accent: string;
  surface: string;
  line: string;
  /** Body picture: muscles not worked, and the color between muscles. */
  bodyNone: string;
  bodyGap: string;
  /** Text on top of the accent color. */
  onAccent: string;
  grid: boolean;
};

const PALETTES: Record<ShareTemplate, Palette> = {
  classic: {
    bg: ["#0a0b0d", "#0a0b0d"],
    text: "#e6e8eb",
    muted: "#8b919a",
    accent: "#22d3ee",
    surface: "#111317",
    line: "#23272e",
    bodyNone: "#1b1f26",
    bodyGap: "#0a0b0d",
    onAccent: "#0a0b0d",
    grid: true,
  },
  bold: {
    bg: ["#0e7490", "#0a0b0d"],
    text: "#ffffff",
    muted: "#a5d8e4",
    accent: "#a5f3fc",
    surface: "rgba(10, 11, 13, 0.35)",
    line: "rgba(255, 255, 255, 0.25)",
    bodyNone: "rgba(255, 255, 255, 0.16)",
    bodyGap: "rgba(10, 11, 13, 0.6)",
    onAccent: "#0a0b0d",
    grid: false,
  },
  light: {
    bg: ["#f4f5f7", "#f4f5f7"],
    text: "#0a0b0d",
    muted: "#5b626c",
    accent: "#0891b2",
    surface: "#ffffff",
    line: "#d9dde3",
    bodyNone: "#dfe3e8",
    bodyGap: "#f4f5f7",
    onAccent: "#ffffff",
    grid: false,
  },
};

const MARGIN = 80;

type TextOptions = {
  size: number;
  color: string;
  weight?: number;
  mono?: boolean;
  align?: CanvasTextAlign;
  /** Letter spacing in px, for the small uppercase labels. */
  spacing?: number;
  maxWidth?: number;
};

/** Draws one line of text and returns its baseline y, shortening it with an ellipsis if it is too wide. */
function text(ctx: CanvasRenderingContext2D, fonts: ShareFonts, value: string, x: number, y: number, o: TextOptions) {
  ctx.font = `${o.weight ?? 400} ${o.size}px ${o.mono ? fonts.mono : fonts.sans}`;
  ctx.fillStyle = o.color;
  ctx.textAlign = o.align ?? "left";
  ctx.textBaseline = "alphabetic";
  (ctx as CanvasRenderingContext2D & { letterSpacing?: string }).letterSpacing = `${o.spacing ?? 0}px`;

  let shown = value;
  if (o.maxWidth) {
    while (shown.length > 1 && ctx.measureText(shown).width > o.maxWidth) shown = shown.slice(0, -1);
    if (shown !== value) shown = `${shown.trimEnd()}...`;
  }
  ctx.fillText(shown, x, y);
  return y;
}

const label = (ctx: CanvasRenderingContext2D, f: ShareFonts, p: Palette, v: string, x: number, y: number) =>
  text(ctx, f, v.toUpperCase(), x, y, { size: 26, color: p.muted, mono: true, spacing: 4 });

function background(ctx: CanvasRenderingContext2D, p: Palette, w: number, h: number) {
  const g = ctx.createLinearGradient(0, 0, w * 0.4, h);
  g.addColorStop(0, p.bg[0]);
  g.addColorStop(1, p.bg[1]);
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, w, h);

  if (p.grid) {
    ctx.strokeStyle = "rgba(255, 255, 255, 0.04)";
    ctx.lineWidth = 2;
    ctx.beginPath();
    for (let x = 0; x <= w; x += 60) {
      ctx.moveTo(x, 0);
      ctx.lineTo(x, h);
    }
    for (let y = 0; y <= h; y += 60) {
      ctx.moveTo(0, y);
      ctx.lineTo(w, y);
    }
    ctx.stroke();
  }
}

/** The three headline numbers, as tiles in a row. */
function statTiles(
  ctx: CanvasRenderingContext2D,
  f: ShareFonts,
  p: Palette,
  card: ShareCard,
  y: number,
  w: number,
  tileHeight: number,
) {
  const stats = [
    { name: "Time", value: card.duration ?? "n/a", unit: "" },
    { name: "Volume", value: card.volume, unit: card.unit },
    { name: "Sets", value: String(card.sets), unit: "" },
  ];
  const gap = 24;
  const tileW = (w - MARGIN * 2 - gap * 2) / 3;
  stats.forEach((s, i) => {
    const x = MARGIN + i * (tileW + gap);
    ctx.fillStyle = p.surface;
    ctx.fillRect(x, y, tileW, tileHeight);
    ctx.strokeStyle = p.line;
    ctx.lineWidth = 2;
    ctx.strokeRect(x, y, tileW, tileHeight);
    label(ctx, f, p, s.name, x + 28, y + 56);
    const size = s.value.length > 7 ? 54 : 68;
    text(ctx, f, s.value, x + 28, y + tileHeight - 40, { size, color: p.text, mono: true, weight: 500, maxWidth: tileW - 56 });
    if (s.unit) {
      ctx.font = `400 26px ${f.mono}`;
      const valueWidth = ctx.measureText(s.value).width;
      text(ctx, f, s.unit, x + 28 + Math.min(valueWidth, tileW - 56) + 10, y + tileHeight - 40, { size: 26, color: p.muted, mono: true });
    }
  });
}

/** How much of the accent color each level gets. */
const LEVEL_ALPHA: Record<IntensityLevel, number> = { none: 0, low: 0.4, mid: 0.7, high: 1 };

/** One body, front or back, with the worked muscles in the accent color. The box is 200 by 410. */
function drawBody(
  ctx: CanvasRenderingContext2D,
  p: Palette,
  levels: Record<MuscleGroup, IntensityLevel>,
  view: BodyView,
  x: number,
  y: number,
  scale: number,
) {
  if (typeof Path2D === "undefined") return;
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(scale, scale);

  const drawHalf = (path: Path2D, mirror: boolean, level: IntensityLevel) => {
    ctx.save();
    if (mirror) {
      ctx.translate(200, 0);
      ctx.scale(-1, 1);
    }
    ctx.fillStyle = p.bodyNone;
    ctx.fill(path);
    if (level !== "none") {
      ctx.globalAlpha = LEVEL_ALPHA[level];
      ctx.fillStyle = p.accent;
      ctx.fill(path);
      ctx.globalAlpha = 1;
    }
    ctx.strokeStyle = p.bodyGap;
    ctx.lineWidth = 1.5;
    ctx.stroke(path);
    ctx.restore();
  };

  const { head, neck, hands, feet } = BODY_DECOR;
  ctx.fillStyle = p.bodyNone;
  ctx.beginPath();
  ctx.arc(head.cx, head.cy, head.r, 0, Math.PI * 2);
  ctx.fill();
  for (const part of [neck, hands, feet]) {
    drawHalf(new Path2D(part), false, "none");
    if (part !== neck) drawHalf(new Path2D(part), true, "none");
  }
  for (const { muscle, d } of SHAPES_BY_VIEW[view]) {
    const path = new Path2D(d);
    drawHalf(path, false, levels[muscle]);
    drawHalf(path, true, levels[muscle]);
  }
  ctx.restore();
}

/** A small map pin: a ring with a dot. */
function pin(ctx: CanvasRenderingContext2D, x: number, y: number, color: string) {
  ctx.strokeStyle = color;
  ctx.fillStyle = color;
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.arc(x + 12, y - 14, 12, 0, Math.PI * 2);
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(x + 12, y - 14, 4, 0, Math.PI * 2);
  ctx.fill();
}

function muscleBars(
  ctx: CanvasRenderingContext2D,
  f: ShareFonts,
  p: Palette,
  card: ShareCard,
  x: number,
  y: number,
  width: number,
  rowHeight: number,
  limit: number,
) {
  label(ctx, f, p, "Muscles worked", x, y);
  card.muscles.slice(0, limit).forEach((m, i) => {
    const top = y + 40 + i * rowHeight;
    text(ctx, f, m.label, x, top + 30, { size: 32, color: p.text, maxWidth: width - 120 });
    text(ctx, f, `${m.sets} sets`, x + width, top + 30, { size: 26, color: p.muted, mono: true, align: "right" });
    ctx.fillStyle = p.line;
    ctx.fillRect(x, top + 46, width, 10);
    ctx.fillStyle = p.accent;
    ctx.fillRect(x, top + 46, Math.max(10, width * m.ratio), 10);
  });
}

function liftList(
  ctx: CanvasRenderingContext2D,
  f: ShareFonts,
  p: Palette,
  card: ShareCard,
  x: number,
  y: number,
  width: number,
  rowHeight: number,
  limit: number,
) {
  label(ctx, f, p, "Top lifts", x, y);
  card.topLifts.slice(0, limit).forEach((lift, i) => {
    const top = y + 40 + i * rowHeight;
    ctx.fillStyle = p.line;
    ctx.fillRect(x, top, width, 2);
    text(ctx, f, lift.name, x, top + 44, { size: 32, color: p.text, maxWidth: width });
    text(ctx, f, lift.best, x, top + 84, { size: 26, color: p.accent, mono: true, maxWidth: width });
  });
}

/**
 * Paints a share card. The canvas must already have the size of the chosen format (see SHARE_SIZES).
 * Nothing here is personal beyond what is in the card: no name, no location, no body weight.
 */
export function drawShareCard(
  ctx: CanvasRenderingContext2D,
  card: ShareCard,
  template: ShareTemplate,
  format: ShareFormat,
  fonts: ShareFonts,
) {
  const p = PALETTES[template];
  const { width: w, height: h } = SHARE_SIZES[format];
  const story = format === "story";
  const inner = w - MARGIN * 2;

  background(ctx, p, w, h);

  // Header: brand and date.
  text(ctx, fonts, "GYMTRACK", MARGIN, 120, { size: 30, color: p.accent, mono: true, weight: 700, spacing: 6 });
  text(ctx, fonts, card.dateLabel, w - MARGIN, 120, { size: 28, color: p.muted, mono: true, align: "right" });

  // Title.
  const titleY = story ? 360 : 260;
  text(ctx, fonts, card.title, MARGIN, titleY, { size: story ? 150 : 116, color: p.text, weight: 700, maxWidth: inner });
  ctx.fillStyle = p.accent;
  ctx.fillRect(MARGIN, titleY + 36, 140, 10);

  // Where it happened.
  if (card.location) {
    const y = titleY + (story ? 108 : 96);
    pin(ctx, MARGIN, y, p.accent);
    text(ctx, fonts, card.location, MARGIN + 40, y, { size: 32, color: p.muted, maxWidth: inner - 40 });
  }

  // Headline numbers.
  const tilesY = titleY + (story ? (card.location ? 180 : 130) : card.location ? 140 : 90);
  const tileHeight = story ? 190 : 160;
  statTiles(ctx, fonts, p, card, tilesY, w, tileHeight);

  const sectionY = tilesY + tileHeight + (story ? 110 : 70);
  // The body, front and back, next to the muscles it is made of. Square keeps the picture and the bars,
  // story has room for the top lifts as well.
  const bodyScale = story ? 1.2 : 0.82;
  const figure = 200 * bodyScale;
  drawBody(ctx, p, card.bodyLevels, "front", MARGIN, sectionY, bodyScale);
  drawBody(ctx, p, card.bodyLevels, "back", MARGIN + figure, sectionY, bodyScale);
  const barsX = MARGIN + figure * 2 + 48;
  const barsW = w - MARGIN - barsX;
  if (story) {
    muscleBars(ctx, fonts, p, card, barsX, sectionY, barsW, 92, 5);
    liftList(ctx, fonts, p, card, MARGIN, sectionY + 410 * bodyScale + 70, inner, 118, 3);
  } else {
    muscleBars(ctx, fonts, p, card, barsX, sectionY, barsW, 74, 4);
  }

  // Footer.
  text(ctx, fonts, "Tracked with GymTrack", w / 2, h - 70, { size: 26, color: p.muted, mono: true, align: "center", spacing: 2 });
}

/** The exact file name used for downloads, for example "gymtrack-push-day-2026-10-28-story.png". */
export function shareFileName(card: ShareCard, isoDate: string, format: ShareFormat): string {
  const slug = card.title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
  return `gymtrack-${slug}-${isoDate}-${format}.png`;
}
