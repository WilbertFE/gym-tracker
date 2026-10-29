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

/** `display` is for the title and the big numbers. It falls back to the sans font when not given. */
export type ShareFonts = { sans: string; mono: string; display?: string };

/** The rank badge ready to draw: the image and its natural size, so it is never stretched. */
export type ShareBadge = { image: CanvasImageSource; width: number; height: number };

type Palette = {
  bg: [string, string];
  text: string;
  muted: string;
  accent: string;
  surface: string;
  line: string;
  /** Body picture: a muscle with no work this week, and the color between muscles. */
  bodyNone: string;
  bodyGap: string;
  /** Text on top of the accent color. */
  onAccent: string;
  grid: boolean;
  /** The System look: a soft blue bloom at the top and glowing accents. Off for the light card. */
  glowing: boolean;
  glow: string;
};

const PALETTES: Record<ShareTemplate, Palette> = {
  classic: {
    bg: ["#0a1426", "#05070d"],
    text: "#dbe6f7",
    muted: "#8593b0",
    accent: "#4aa8ff",
    surface: "#0a1222",
    line: "#1a2a46",
    bodyNone: "#1f2b42",
    bodyGap: "#05070d",
    onAccent: "#04101f",
    grid: true,
    glowing: true,
    glow: "rgba(74, 168, 255, 0.22)",
  },
  bold: {
    bg: ["#0b4a8f", "#05070d"],
    text: "#ffffff",
    muted: "#b3d3f5",
    accent: "#a8d4ff",
    surface: "rgba(5, 7, 13, 0.4)",
    line: "rgba(255, 255, 255, 0.25)",
    bodyNone: "rgba(255, 255, 255, 0.2)",
    bodyGap: "rgba(5, 7, 13, 0.6)",
    onAccent: "#05070d",
    grid: false,
    glowing: true,
    glow: "rgba(168, 212, 255, 0.16)",
  },
  light: {
    bg: ["#f3f6fb", "#f3f6fb"],
    text: "#07101f",
    muted: "#55627a",
    accent: "#1b6fd1",
    surface: "#ffffff",
    line: "#d5deec",
    bodyNone: "#c9d3e3",
    bodyGap: "#f3f6fb",
    onAccent: "#ffffff",
    grid: false,
    glowing: false,
    glow: "rgba(27, 111, 209, 0)",
  },
};

const MARGIN = 80;

type TextOptions = {
  size: number;
  color: string;
  weight?: number;
  mono?: boolean;
  /** The display face, for the title and the big numbers. */
  display?: boolean;
  /** A soft glow of this color behind the text. */
  glow?: string;
  align?: CanvasTextAlign;
  /** Letter spacing in px, for the small uppercase labels. */
  spacing?: number;
  maxWidth?: number;
};

/** Draws one line of text and returns its baseline y, shortening it with an ellipsis if it is too wide. */
function text(ctx: CanvasRenderingContext2D, fonts: ShareFonts, value: string, x: number, y: number, o: TextOptions) {
  const face = o.mono ? fonts.mono : o.display ? (fonts.display ?? fonts.sans) : fonts.sans;
  ctx.font = `${o.weight ?? 400} ${o.size}px ${face}`;
  ctx.fillStyle = o.color;
  ctx.textAlign = o.align ?? "left";
  ctx.textBaseline = "alphabetic";
  (ctx as CanvasRenderingContext2D & { letterSpacing?: string }).letterSpacing = `${o.spacing ?? 0}px`;

  let shown = value;
  if (o.maxWidth) {
    while (shown.length > 1 && ctx.measureText(shown).width > o.maxWidth) shown = shown.slice(0, -1);
    if (shown !== value) shown = `${shown.trimEnd()}...`;
  }
  if (o.glow) {
    ctx.shadowColor = o.glow;
    ctx.shadowBlur = 24;
  }
  ctx.fillText(shown, x, y);
  ctx.shadowBlur = 0;
  return y;
}

const label = (ctx: CanvasRenderingContext2D, f: ShareFonts, p: Palette, v: string, x: number, y: number) =>
  text(ctx, f, `[ ${v.toUpperCase()} ]`, x, y, { size: 26, color: p.muted, mono: true, spacing: 4 });

function background(ctx: CanvasRenderingContext2D, p: Palette, w: number, h: number) {
  const g = ctx.createLinearGradient(0, 0, w * 0.4, h);
  g.addColorStop(0, p.bg[0]);
  g.addColorStop(1, p.bg[1]);
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, w, h);

  if (p.glowing) {
    const bloom = ctx.createLinearGradient(0, 0, 0, h * 0.4);
    bloom.addColorStop(0, p.glow);
    bloom.addColorStop(1, "rgba(0, 0, 0, 0)");
    ctx.fillStyle = bloom;
    ctx.fillRect(0, 0, w, h * 0.4);
  }

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

/** The System window's corner brackets: top left and bottom right. Filled, so they never count as an outline. */
function brackets(ctx: CanvasRenderingContext2D, p: Palette, x: number, y: number, w: number, h: number) {
  ctx.fillStyle = p.accent;
  ctx.fillRect(x - 3, y - 3, 34, 6);
  ctx.fillRect(x - 3, y - 3, 6, 34);
  ctx.fillRect(x + w - 31, y + h - 3, 34, 6);
  ctx.fillRect(x + w - 3, y + h - 31, 6, 34);
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
    brackets(ctx, p, x, y, tileW, tileHeight);
    label(ctx, f, p, s.name, x + 28, y + 56);
    // The unit sits after the number, so the number gets what is left of the tile. Shrink it until it fits.
    // Measuring must not inherit the letter spacing of the label drawn just before.
    (ctx as CanvasRenderingContext2D & { letterSpacing?: string }).letterSpacing = "0px";
    ctx.font = `400 26px ${f.mono}`;
    const unitWidth = s.unit ? ctx.measureText(s.unit).width + 12 : 0;
    const room = tileW - 56 - unitWidth;
    let size = 68;
    for (; size > 36; size -= 2) {
      ctx.font = `500 ${size}px ${f.mono}`;
      if (ctx.measureText(s.value).width <= room) break;
    }
    const baseline = y + tileHeight - 40;
    text(ctx, f, s.value, x + 28, baseline, { size, color: p.text, mono: true, weight: 500, maxWidth: room, glow: p.glowing ? p.accent : undefined });
    if (s.unit) {
      ctx.font = `500 ${size}px ${f.mono}`;
      const valueWidth = Math.min(ctx.measureText(s.value).width, room);
      text(ctx, f, s.unit, x + 28 + valueWidth + 12, baseline, { size: 26, color: p.muted, mono: true });
    }
  });
}

/**
 * The same colors as the muscle map in the app (see --intensity-* in globals.css), so a share image
 * and the workout page tell the same story: green light, yellow moderate, red heavy.
 */
const INTENSITY_COLORS = { low: "#22c55e", mid: "#eab308", high: "#ef4444" } as const;

const LEVEL_NAMES: [IntensityLevel & keyof typeof INTENSITY_COLORS, string][] = [
  ["low", "Light"],
  ["mid", "Moderate"],
  ["high", "Heavy"],
];

/**
 * One body, front or back, drawn like the workout page: each muscle in its weekly color, with the
 * muscles this workout worked outlined in the accent color. The box is 200 by 410.
 */
function drawBody(
  ctx: CanvasRenderingContext2D,
  p: Palette,
  levels: Record<MuscleGroup, IntensityLevel>,
  worked: ReadonlySet<MuscleGroup>,
  view: BodyView,
  x: number,
  y: number,
  scale: number,
) {
  if (typeof Path2D === "undefined") return;
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(scale, scale);

  const drawHalf = (path: Path2D, mirror: boolean, fill: string, outline: boolean) => {
    ctx.save();
    if (mirror) {
      ctx.translate(200, 0);
      ctx.scale(-1, 1);
    }
    ctx.fillStyle = fill;
    ctx.fill(path);
    ctx.strokeStyle = outline ? p.accent : p.bodyGap;
    ctx.lineWidth = outline ? 2.5 : 1.5;
    ctx.stroke(path);
    ctx.restore();
  };

  const { head, neck, hands, feet } = BODY_DECOR;
  ctx.fillStyle = p.bodyNone;
  ctx.beginPath();
  ctx.arc(head.cx, head.cy, head.r, 0, Math.PI * 2);
  ctx.fill();
  for (const part of [neck, hands, feet]) {
    drawHalf(new Path2D(part), false, p.bodyNone, false);
    if (part !== neck) drawHalf(new Path2D(part), true, p.bodyNone, false);
  }
  // Outlined muscles last, so a neighbor never paints over their outline.
  const shapes = [...SHAPES_BY_VIEW[view]].sort((a, b) => Number(worked.has(a.muscle)) - Number(worked.has(b.muscle)));
  for (const { muscle, d } of shapes) {
    const level = levels[muscle];
    const fill = level === "none" ? p.bodyNone : INTENSITY_COLORS[level];
    const path = new Path2D(d);
    drawHalf(path, false, fill, worked.has(muscle));
    drawHalf(path, true, fill, worked.has(muscle));
  }
  ctx.restore();
}

/** "Light, Moderate, Heavy" with a colored dot each, so the colors can be read. */
function legend(ctx: CanvasRenderingContext2D, f: ShareFonts, p: Palette, x: number, y: number) {
  let cursor = x;
  for (const [level, name] of LEVEL_NAMES) {
    ctx.fillStyle = INTENSITY_COLORS[level];
    ctx.beginPath();
    ctx.arc(cursor + 10, y - 8, 10, 0, Math.PI * 2);
    ctx.fill();
    text(ctx, f, name, cursor + 30, y, { size: 24, color: p.muted, mono: true });
    ctx.font = `400 24px ${f.mono}`;
    cursor += 30 + ctx.measureText(name).width + 36;
  }
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
    const bar = Math.max(10, width * m.ratio);
    ctx.fillRect(x, top + 46, bar, 10);
    // A bright leading edge, like the bars in the app.
    ctx.fillStyle = p.text;
    ctx.fillRect(x + bar - 4, top + 46, 4, 10);
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
  /** The rank badge as an image with its natural size, drawn top right. Left out when not given. */
  badge: ShareBadge | null = null,
) {
  const p = PALETTES[template];
  const { width: w, height: h } = SHARE_SIZES[format];
  const story = format === "story";
  const inner = w - MARGIN * 2;

  background(ctx, p, w, h);

  // Header: brand and date.
  text(ctx, fonts, "MUSCLES LEVELING", MARGIN, 120, { size: 30, color: p.accent, mono: true, weight: 700, spacing: 6, glow: p.glowing ? p.accent : undefined });
  text(ctx, fonts, card.dateLabel, w - MARGIN, 120, { size: 28, color: p.muted, mono: true, align: "right" });
  // A thin rule under the header with a short bright segment, like the top edge of a System window.
  ctx.fillStyle = p.line;
  ctx.fillRect(MARGIN, 148, inner, 2);
  ctx.fillStyle = p.accent;
  ctx.fillRect(MARGIN, 147, 140, 4);

  // Title.
  const titleY = story ? 360 : 260;
  const badgeSize = story ? 190 : 150;
  const showBadge = badge !== null && card.progress !== null;
  text(ctx, fonts, card.title, MARGIN, titleY, {
    size: showBadge ? (story ? 128 : 100) : story ? 150 : 116,
    color: p.text,
    weight: 700,
    display: true,
    maxWidth: showBadge ? inner - badgeSize - 24 : inner,
  });
  if (showBadge && card.progress) {
    const bx = w - MARGIN - badgeSize;
    const by = titleY - (story ? 150 : 118);
    const badgeHeight = (badgeSize * badge.height) / badge.width;
    ctx.drawImage(badge.image, bx, by, badgeSize, badgeHeight);
    text(ctx, fonts, `LV ${card.progress.level}`, bx + badgeSize / 2, by + badgeHeight + 34, {
      size: 28,
      color: p.accent,
      mono: true,
      weight: 700,
      align: "center",
      spacing: 3,
      glow: p.glowing ? p.accent : undefined,
    });
    text(ctx, fonts, card.progress.rank.name.toUpperCase(), bx + badgeSize / 2, by + badgeHeight + 66, {
      size: 20,
      color: p.muted,
      mono: true,
      align: "center",
      spacing: 2,
      maxWidth: badgeSize + 40,
    });
  }
  ctx.fillStyle = p.accent;
  if (p.glowing) {
    ctx.shadowColor = p.accent;
    ctx.shadowBlur = 22;
  }
  ctx.fillRect(MARGIN, titleY + 36, 140, 10);
  ctx.shadowBlur = 0;

  // Where it happened.
  if (card.location) {
    const y = titleY + (story ? 108 : 96);
    pin(ctx, MARGIN, y, p.accent);
    // Leave the badge's column free.
    const room = showBadge ? inner - 40 - badgeSize - 24 : inner - 40;
    text(ctx, fonts, card.location, MARGIN + 40, y, { size: 32, color: p.muted, maxWidth: room });
  }

  // Headline numbers.
  const tilesY = titleY + (story ? (card.location ? 180 : 130) : card.location ? 140 : 90);
  const tileHeight = story ? 190 : 160;
  statTiles(ctx, fonts, p, card, tilesY, w, tileHeight);

  const sectionY = tilesY + tileHeight + (story ? 110 : 70);
  // The body, front and back, next to the muscles it is made of. Square keeps the picture and the bars,
  // story has room for the legend and the top lifts as well.
  const bodyScale = story ? 1.2 : 0.74;
  const figure = 200 * bodyScale;
  const worked = new Set(card.workedMuscles);
  drawBody(ctx, p, card.bodyLevels, worked, "front", MARGIN, sectionY, bodyScale);
  drawBody(ctx, p, card.bodyLevels, worked, "back", MARGIN + figure, sectionY, bodyScale);
  const captionY = sectionY + 410 * bodyScale + 32;
  text(ctx, fonts, "FRONT", MARGIN + figure / 2, captionY, { size: 22, color: p.muted, mono: true, align: "center", spacing: 4 });
  text(ctx, fonts, "BACK", MARGIN + figure * 1.5, captionY, { size: 22, color: p.muted, mono: true, align: "center", spacing: 4 });

  const barsX = MARGIN + figure * 2 + 48;
  const barsW = w - MARGIN - barsX;
  if (story) {
    muscleBars(ctx, fonts, p, card, barsX, sectionY, barsW, 92, 5);
    legend(ctx, fonts, p, MARGIN, captionY + 52);
    liftList(ctx, fonts, p, card, MARGIN, captionY + 112, inner, 108, 3);
  } else {
    muscleBars(ctx, fonts, p, card, barsX, sectionY, barsW, 74, 4);
  }

  // Footer.
  text(ctx, fonts, "Tracked with Muscles Leveling", w / 2, h - 70, { size: 26, color: p.muted, mono: true, align: "center", spacing: 2 });
}

/** The exact file name used for downloads, for example "muscles-leveling-push-day-2026-10-28-story.png". */
export function shareFileName(card: ShareCard, isoDate: string, format: ShareFormat): string {
  const slug = card.title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
  return `muscles-leveling-${slug}-${isoDate}-${format}.png`;
}
