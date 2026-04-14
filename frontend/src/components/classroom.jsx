import { useGLTF } from "@react-three/drei";

// ─── Chair positions ──────────────────────────────────────────────────────────
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
  { id: "teacher-desk-L", minX: 0.2, maxX: 1.9, minZ: -23.5, maxZ: -22.4 },
  { id: "teacher-desk-R", minX: -2.2, maxX: -0.5, minZ: -23.5, maxZ: -22.4 },
  { id: "wall-left", minX: -5.0, maxX: -4.0, minZ: -26, maxZ: 5.0 },
  { id: "wall-right", minX: 3.9, maxX: 4.8, minZ: -26, maxZ: 5.0 },
  { id: "wall-top", minX: -5.0, maxX: 3.9, minZ: 5.0, maxZ: 6.0 },
  { id: "wall-bottom", minX: -4.0, maxX: 3.9, minZ: -26, maxZ: -25 },
];

const AVATAR_RADIUS = 0.2;

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
  return <primitive object={scene} position={[0, 0, 0]} />;
}

useGLTF.preload("/ClassroomModel_max40.glb");
