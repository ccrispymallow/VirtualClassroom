import { useGLTF, Html } from "@react-three/drei";

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

const DEBUG = true;

const DEBUG_COLORS = {
  "teacher-desk-L": "#10b981",
  "teacher-desk-R": "#f59e0b",
  "wall-top": "#10b981",
  "lockers-L": "#3b82f6",
  "lockers-R": "#6366f1",
  "wall-left": "#ef4444",
  "wall-right": "#ef4444",
};

function FurnitureDebug() {
  if (!DEBUG) return null;
  return (
    <>
      {FURNITURE_BOXES.map((box) => {
        const cx = (box.minX + box.maxX) / 2;
        const cz = (box.minZ + box.maxZ) / 2;
        const sx = box.maxX - box.minX;
        const sz = box.maxZ - box.minZ;
        const color = DEBUG_COLORS[box.id] ?? "#ffffff";
        return (
          <group key={box.id}>
            <mesh position={[cx, 0.75, cz]}>
              <boxGeometry args={[sx, 1.5, sz]} />
              <meshStandardMaterial color={color} transparent opacity={0.25} />
            </mesh>
            <mesh position={[cx, 0.75, cz]}>
              <boxGeometry args={[sx, 1.5, sz]} />
              <meshStandardMaterial color={color} wireframe />
            </mesh>
            <Html position={[cx, 2.2, cz]} center>
              <div
                style={{
                  background: color,
                  color: "#000",
                  fontSize: "11px",
                  fontWeight: "bold",
                  padding: "2px 6px",
                  borderRadius: "4px",
                  whiteSpace: "nowrap",
                  pointerEvents: "none",
                  userSelect: "none",
                }}
              >
                {box.id}
              </div>
            </Html>
          </group>
        );
      })}
    </>
  );
}

// ─── Chair snap debug ─────────────────────────────────────────────────────────
function ChairDebug() {
  if (!DEBUG) return null;
  return (
    <>
      {CHAIR_POSITIONS.map((chair) => (
        <mesh key={chair.id} position={chair.position}>
          <sphereGeometry args={[0.2, 8, 8]} />
          <meshStandardMaterial color="red" transparent opacity={0.5} />
        </mesh>
      ))}
    </>
  );
}

// ─── Classroom component ──────────────────────────────────────────────────────
export default function Classroom() {
  const { scene } = useGLTF("/ClassroomModel_max40.glb");

  return (
    <>
      <primitive object={scene} position={[0, 0, 0]} />
      <FurnitureDebug />
      <ChairDebug />
    </>
  );
}

useGLTF.preload("/ClassroomModel_max40.glb");
