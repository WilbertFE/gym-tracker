import type { MuscleGroup } from "@/lib/muscles";

export type BodyView = "front" | "back";

/**
 * Stylised muscle shapes in a 200 by 410 box, centred on x = 100.
 * Each path is drawn for the right half of the image and mirrored to the
 * left by the renderer, so a muscle group is one tappable unit.
 */
export type MuscleShape = { muscle: MuscleGroup; d: string };

// Parts shared by both views (same position front and back).
const DELT_FRONT_REAR =
  "M139 74 Q150 70 156 80 Q158 92 152 100 Q143 98 139 90 Q137 80 139 74 Z";
const DELT_SIDE =
  "M156 80 Q163 84 163 96 Q161 106 154 106 Q152 104 152 100 Q158 92 156 80 Z";
const UPPER_ARM =
  "M149 110 Q158 110 164 114 L165 138 Q157 143 150 139 Q147 124 149 110 Z";
const FOREARM =
  "M150 144 Q158 147 166 143 L170 188 Q161 192 152 188 Q149 166 150 144 Z";
const CALF =
  "M106 298 L130 298 Q135 332 128 372 L112 374 Q104 340 106 298 Z";

export const FRONT_SHAPES: MuscleShape[] = [
  { muscle: "traps", d: "M106 52 L132 62 Q126 68 116 69 L106 60 Z" },
  { muscle: "chest", d: "M103 72 L117 70 Q132 70 138 76 Q141 92 132 101 Q118 108 103 103 Z" },
  { muscle: "front_delts", d: DELT_FRONT_REAR },
  { muscle: "side_delts", d: DELT_SIDE },
  { muscle: "biceps", d: UPPER_ARM },
  { muscle: "forearms", d: FOREARM },
  {
    muscle: "abs",
    d:
      "M102 108 L118 108 L118 124 L102 124 Z M102 126 L118 126 L118 142 L102 142 Z " +
      "M102 144 L117 144 L117 160 L102 160 Z M102 162 L115 162 L113 176 L102 176 Z",
  },
  { muscle: "obliques", d: "M120 108 L134 104 Q139 124 134 150 L128 172 L120 176 Q124 140 120 108 Z" },
  { muscle: "quads", d: "M102 182 L132 180 Q142 200 138 250 Q134 280 122 292 L104 292 Q100 250 102 182 Z" },
  { muscle: "calves", d: CALF },
];

export const BACK_SHAPES: MuscleShape[] = [
  { muscle: "traps", d: "M101 50 L132 62 Q126 76 118 86 Q108 92 101 112 Z" },
  { muscle: "rear_delts", d: DELT_FRONT_REAR },
  { muscle: "side_delts", d: DELT_SIDE },
  { muscle: "triceps", d: UPPER_ARM },
  { muscle: "forearms", d: FOREARM },
  { muscle: "lats", d: "M120 92 L140 90 Q142 110 134 130 L122 142 L112 130 Q114 108 120 92 Z" },
  { muscle: "lower_back", d: "M101 116 L112 120 L116 164 L101 168 Z" },
  { muscle: "glutes", d: "M101 170 L132 168 Q142 184 138 204 Q122 214 101 208 Z" },
  { muscle: "hamstrings", d: "M102 212 L136 208 Q140 240 134 278 L104 284 Q100 250 102 212 Z" },
  { muscle: "calves", d: CALF },
];

export const SHAPES_BY_VIEW: Record<BodyView, MuscleShape[]> = {
  front: FRONT_SHAPES,
  back: BACK_SHAPES,
};

/** Non-interactive parts that make the figure read as a body. */
export const BODY_DECOR = {
  head: { cx: 100, cy: 28, r: 16 },
  neck: "M93 42 L107 42 L107 56 L93 56 Z",
  /** Mirrored. */
  hands: "M158 194 Q166 190 172 196 Q172 208 165 212 Q157 208 158 194 Z",
  /** Mirrored. */
  feet: "M106 378 L130 378 Q136 392 134 400 L108 400 Q104 392 106 378 Z",
};

/** Which view shows each muscle, used to switch views when a muscle is picked from the list. */
export function viewFor(muscle: MuscleGroup): BodyView {
  return FRONT_SHAPES.some((s) => s.muscle === muscle) ? "front" : "back";
}
