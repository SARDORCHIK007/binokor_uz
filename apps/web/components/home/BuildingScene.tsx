"use client";

import { Canvas, useFrame } from "@react-three/fiber";
import { useRef } from "react";
import type { Group } from "three";

const FLOORS = [
  { y: 0, color: "#1c3a66", size: [1.7, 0.12, 1.05] as const },
  { y: 0.28, color: "#2563a8", size: [1.45, 0.32, 0.9] as const },
  { y: 0.68, color: "#3b7bc4", size: [1.25, 0.3, 0.78] as const },
  { y: 1.05, color: "#2f7d6d", size: [0.95, 0.26, 0.62] as const },
  { y: 1.36, color: "#c27a00", size: [0.12, 0.22, 0.12] as const },
];

function Assembly() {
  const group = useRef<Group>(null);
  useFrame(({ clock }) => {
    const root = group.current;
    if (!root) {
      return;
    }
    root.rotation.y = clock.elapsedTime * 0.25;
  });
  return (
    <group ref={group} position={[0, -0.55, 0]}>
      {FLOORS.map((floor) => (
        <mesh key={floor.color} position={[0, floor.y, 0]}>
          <boxGeometry args={floor.size} />
          <meshStandardMaterial color={floor.color} roughness={0.62} />
        </mesh>
      ))}
    </group>
  );
}

export function BuildingScene() {
  return (
    <Canvas camera={{ position: [2.4, 1.7, 2.8], fov: 32 }} dpr={[1, 1.5]}>
      <color attach="background" args={["#0c1b33"]} />
      <ambientLight intensity={0.85} />
      <directionalLight position={[3, 4, 2]} intensity={1.1} />
      <Assembly />
    </Canvas>
  );
}
