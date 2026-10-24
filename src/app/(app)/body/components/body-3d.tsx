"use client";

import { OrbitControls } from "@react-three/drei";
import { Canvas } from "@react-three/fiber";
import type { IntensityLevel } from "@/lib/muscle-intensity";
import type { MuscleGroup } from "@/lib/muscles";
import { BODY_3D_CORE, BODY_3D_PARTS } from "./body-3d-parts";

/** Mirrors the --intensity-* tokens in globals.css (three.js cannot read CSS variables). */
const LEVEL_HEX: Record<IntensityLevel, string> = {
  none: "#2a2e36",
  low: "#22c55e",
  mid: "#eab308",
  high: "#ef4444",
};

const ACCENT_HEX = "#22d3ee";
const CORE_HEX = "#2a2e36";

type Body3DProps = {
  levels: Record<MuscleGroup, IntensityLevel>;
  selected: MuscleGroup | null;
  onSelect: (muscle: MuscleGroup) => void;
};

/** Drag to rotate, pinch or scroll to zoom, tap a muscle to select it. */
export default function Body3D({ levels, selected, onSelect }: Body3DProps) {
  return (
    <div
      className="h-[26rem] w-full touch-none"
      role="img"
      aria-label="3D body model. Drag to rotate. Use the muscle list for an accessible alternative."
    >
      <Canvas camera={{ position: [0, 1.05, 2.7], fov: 35 }} dpr={[1, 2]}>
        <ambientLight intensity={0.9} />
        <directionalLight position={[2, 3, 4]} intensity={1.8} />
        <directionalLight position={[-3, 2, -3]} intensity={1} />

        {BODY_3D_CORE.map((c, i) => (
          <mesh key={i} position={c.position} scale={c.radii}>
            <sphereGeometry args={[1, 24, 16]} />
            <meshStandardMaterial color={CORE_HEX} roughness={0.9} />
          </mesh>
        ))}

        {BODY_3D_PARTS.flatMap((part) =>
          ([1, -1] as const).map((side) => {
            const isSelected = selected === part.muscle;
            return (
              <mesh
                key={`${part.muscle}-${side}`}
                position={[part.position[0] * side, part.position[1], part.position[2]]}
                scale={part.radii}
                onClick={(e) => {
                  e.stopPropagation();
                  onSelect(part.muscle);
                }}
                onPointerOver={(e) => {
                  e.stopPropagation();
                  document.body.style.cursor = "pointer";
                }}
                onPointerOut={() => {
                  document.body.style.cursor = "";
                }}
              >
                <sphereGeometry args={[1, 24, 16]} />
                <meshStandardMaterial
                  color={LEVEL_HEX[levels[part.muscle]]}
                  roughness={0.65}
                  emissive={isSelected ? ACCENT_HEX : "#000000"}
                  emissiveIntensity={isSelected ? 0.3 : 0}
                />
              </mesh>
            );
          }),
        )}

        <OrbitControls
          target={[0, 1, 0]}
          enablePan={false}
          minDistance={1.5}
          maxDistance={4.5}
          minPolarAngle={Math.PI / 4}
          maxPolarAngle={(Math.PI * 3) / 4}
        />
      </Canvas>
    </div>
  );
}
