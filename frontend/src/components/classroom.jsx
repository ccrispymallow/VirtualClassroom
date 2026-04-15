import { useGLTF } from "@react-three/drei";
import { useEffect, useMemo } from "react";
import * as THREE from "three";

const LEFT_COL_1_X = -2.7;
const LEFT_COL_2_X = -0.9;
const RIGHT_COL_1_X = 1.1;
const RIGHT_COL_2_X = 2.8;
const SEAT_Y = -0.23;
const ROW_Z_POSITIONS = [
  0.1, -2.2, -4.6, -6.9, -9.2, -11.5, -13.8, -16.2, -18.7, -20.9,
];

export const CHAIR_POSITIONS = [];
let chairId = 1;
for (const z of ROW_Z_POSITIONS) {
  for (const x of [LEFT_COL_1_X, LEFT_COL_2_X, RIGHT_COL_1_X, RIGHT_COL_2_X]) {
    CHAIR_POSITIONS.push({ id: `c${chairId++}`, position: [x, SEAT_Y, z] });
  }
}

export const CHAIR_SNAP_RADIUS = 1.5;

export const FURNITURE_BOXES = [
  { id: "teacher-desk-F", minX: -0.8, maxX: 0.8, minZ: 2.9, maxZ: 3.9 },
  { id: "teacher-desk-L", minX: 0.2, maxX: 1.9, minZ: -22.5, maxZ: -21.4 },
  { id: "teacher-desk-R", minX: -2.2, maxX: -0.5, minZ: -22.5, maxZ: -21.4 },
  { id: "wall-left", minX: -3.8, maxX: -4.0, minZ: -26, maxZ: 5.0 },
  { id: "wall-right", minX: 3.7, maxX: 4.8, minZ: -26, maxZ: 5.0 },
  { id: "wall-top", minX: -5.0, maxX: 3.9, minZ: 5.0, maxZ: 6.0 },
  { id: "wall-bottom", minX: -4.0, maxX: 3.9, minZ: -26, maxZ: -24 },
];

const AVATAR_RADIUS = 0.2;

const DEBUG_BOXES = false;

function DebugBoxes() {
  if (!DEBUG_BOXES) return null;

  const colorMap = {
    "teacher-desk-F": "#ff4444",
    "teacher-desk-L": "#ff4444",
    "teacher-desk-R": "#ff4444",
    "wall-left": "green",
    "wall-right": "#4488ff",
    "wall-top": "#4488ff",
    "wall-bottom": "#4488ff",
  };

  return (
    <>
      {FURNITURE_BOXES.map((box) => {
        const width = box.maxX - box.minX;
        const depth = box.maxZ - box.minZ;
        const height = 2.0;
        const cx = (box.minX + box.maxX) / 2;
        const cz = (box.minZ + box.maxZ) / 2;
        const color = colorMap[box.id] ?? "#ffaa00";

        return (
          <mesh key={box.id} position={[cx, height / 2, cz]}>
            <boxGeometry args={[width, height, depth]} />
            <meshBasicMaterial
              color={color}
              wireframe={true}
              transparent={true}
              opacity={0.8}
            />
          </mesh>
        );
      })}
    </>
  );
}

function createNormalMap(size = 64) {
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = size;
  const ctx = canvas.getContext("2d");
  const heightData = new Uint8Array(size * size);

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const noise =
        128 +
        Math.round(
          Math.sin(x * 0.3 + y * 0.2) * 8 +
            Math.cos(x * 0.2 - y * 0.2) * 4 +
            (Math.random() * 12 - 6),
        );
      heightData[y * size + x] = noise;
    }
  }

  const normalImage = ctx.createImageData(size, size);
  const sample = (x, y) => {
    const xi = Math.min(size - 1, Math.max(0, x));
    const yi = Math.min(size - 1, Math.max(0, y));
    return heightData[yi * size + xi] / 255;
  };

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const dx = sample(x + 1, y) - sample(x - 1, y);
      const dy = sample(x, y + 1) - sample(x, y - 1);
      const dz = 1.0;
      const len = 1.0 / Math.sqrt(dx * dx + dy * dy + dz * dz);
      const idx = (y * size + x) * 4;
      normalImage.data[idx] = Math.round((dx * len * 0.5 + 0.5) * 255);
      normalImage.data[idx + 1] = Math.round((dy * len * 0.5 + 0.5) * 255);
      normalImage.data[idx + 2] = Math.round((dz * len * 0.5 + 0.5) * 255);
      normalImage.data[idx + 3] = 255;
    }
  }

  ctx.putImageData(normalImage, 0, 0);
  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(2, 2);
  texture.needsUpdate = true;
  return texture;
}

export function collidesWithFurniture(nx, nz, radius = AVATAR_RADIUS) {
  for (const box of FURNITURE_BOXES) {
    if (
      nx + radius > box.minX &&
      nx - radius < box.maxX &&
      nz + radius > box.minZ &&
      nz - radius < box.maxZ
    ) {
      return true;
    }
  }
  return false;
}

export default function Classroom() {
  const { scene } = useGLTF("/ClassroomModel_max40.glb");
  const normalMap = useMemo(() => createNormalMap(64), []);

  useEffect(() => {
    scene.traverse((child) => {
      if (!child.isMesh) return;

      const applyMaterial = (material) => {
        if (!material || material.isShadowMaterial) return;

        const name = material.name?.toLowerCase() || "";
        const isGlass = name.includes("glass") || name.includes("window");
        const isFloor =
          name.includes("floor") ||
          name.includes("ground") ||
          name.includes("tile");
        const isWall =
          name.includes("wall") ||
          name.includes("ceiling") ||
          name.includes("board");

        if (isGlass) {
          material.transparent = true;
          material.opacity = 0.4;
          material.roughness = 0.08;
          material.metalness = 0.18;
          material.envMapIntensity = 1.3;
          material.color = material.color || new THREE.Color(0.9, 0.95, 1);
        } else if (isFloor) {
          material.roughness = 0.25;
          material.metalness = 0.12;
          material.envMapIntensity = 1.0;
          material.normalMap = normalMap;
          material.normalScale = new THREE.Vector2(0.12, 0.12);
        } else {
          material.roughness = Math.min(
            1,
            Math.max(0.22, material.roughness ?? 0.85),
          );
          material.metalness = Math.min(0.2, material.metalness ?? 0);
          material.envMapIntensity = 0.7;
          if (!isWall) {
            material.normalMap = normalMap;
            material.normalScale = new THREE.Vector2(0.08, 0.08);
          }
        }

        material.needsUpdate = true;
      };

      if (Array.isArray(child.material)) {
        child.material.forEach(applyMaterial);
      } else {
        applyMaterial(child.material);
      }
    });
  }, [scene, normalMap]);

  return (
    <>
      <primitive
        object={scene}
        position={[0, -0.18, 0]}
        scale={[0.95, 0.95, 0.95]}
      />
      <DebugBoxes />
    </>
  );
}

useGLTF.preload("/ClassroomModel_max40.glb");
