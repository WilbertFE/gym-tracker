import type { MuscleGroup } from "@/lib/muscles";

/**
 * Procedural stand-in for a GLB body model (README section 7.3): one ellipsoid
 * per muscle, in meters with the feet at y = 0 and the front facing +z.
 * Every part is mirrored across x = 0. When a licensed GLB with one mesh per
 * muscle group is added, replace body-3d.tsx and delete this file; the data
 * layer and the scoring stay the same.
 */
export type Body3DPart = {
  muscle: MuscleGroup;
  /** Right side position. The left side is mirrored. */
  position: [x: number, y: number, z: number];
  /** Ellipsoid radii. */
  radii: [rx: number, ry: number, rz: number];
};

export const BODY_3D_PARTS: Body3DPart[] = [
  { muscle: "traps", position: [0.07, 1.5, -0.04], radii: [0.09, 0.06, 0.05] },
  { muscle: "chest", position: [0.09, 1.38, 0.07], radii: [0.1, 0.08, 0.05] },
  { muscle: "front_delts", position: [0.2, 1.43, 0.05], radii: [0.05, 0.06, 0.05] },
  { muscle: "side_delts", position: [0.235, 1.43, 0], radii: [0.045, 0.06, 0.055] },
  { muscle: "rear_delts", position: [0.2, 1.43, -0.05], radii: [0.05, 0.06, 0.045] },
  { muscle: "biceps", position: [0.265, 1.25, 0.03], radii: [0.04, 0.11, 0.04] },
  { muscle: "triceps", position: [0.265, 1.25, -0.03], radii: [0.04, 0.11, 0.04] },
  { muscle: "forearms", position: [0.29, 1.03, 0], radii: [0.038, 0.12, 0.04] },
  { muscle: "abs", position: [0.04, 1.17, 0.075], radii: [0.045, 0.12, 0.035] },
  { muscle: "obliques", position: [0.12, 1.16, 0.035], radii: [0.04, 0.11, 0.065] },
  { muscle: "lats", position: [0.13, 1.3, -0.06], radii: [0.09, 0.12, 0.04] },
  { muscle: "lower_back", position: [0.04, 1.08, -0.075], radii: [0.05, 0.07, 0.035] },
  { muscle: "glutes", position: [0.08, 0.95, -0.07], radii: [0.09, 0.08, 0.07] },
  { muscle: "quads", position: [0.1, 0.7, 0.035], radii: [0.07, 0.2, 0.07] },
  { muscle: "hamstrings", position: [0.1, 0.7, -0.045], radii: [0.07, 0.19, 0.06] },
  { muscle: "calves", position: [0.1, 0.3, -0.015], radii: [0.05, 0.17, 0.055] },
];

/** Non-interactive filler so gaps between muscles do not show through. */
export const BODY_3D_CORE: { position: [number, number, number]; radii: [number, number, number] }[] = [
  { position: [0, 1.28, 0], radii: [0.16, 0.26, 0.07] },
  { position: [0, 1.0, 0], radii: [0.15, 0.1, 0.08] },
  { position: [0, 1.58, 0], radii: [0.05, 0.08, 0.05] },
  { position: [0, 1.72, 0.01], radii: [0.095, 0.115, 0.1] },
  { position: [0.1, 0.6, 0], radii: [0.05, 0.3, 0.05] },
  { position: [-0.1, 0.6, 0], radii: [0.05, 0.3, 0.05] },
  { position: [0.27, 1.15, 0], radii: [0.03, 0.2, 0.03] },
  { position: [-0.27, 1.15, 0], radii: [0.03, 0.2, 0.03] },
];
