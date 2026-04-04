import { useGLTF } from "@react-three/drei";

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

export const CHAIR_SNAP_RADIUS = 1.2;

export default function Classroom() {
  const { scene } = useGLTF("/ClassroomModel_max40.glb");
  return (
    <>
      <primitive object={scene} position={[0, 0, 0]} />
      {CHAIR_POSITIONS.map((chair) => (
        <mesh key={chair.id} position={chair.position}>
          <sphereGeometry args={[0.2, 8, 8]} />
          <meshStandardMaterial color="red" transparent opacity={0.5} />
        </mesh>
      ))}
    </>
  );
}

useGLTF.preload("/ClassroomModel_max40.glb");
