import { useGLTF } from "@react-three/drei";

export default function Classroom() {
  const { scene } = useGLTF("/ClassroomModel.glb");

  return (
    <>
      {/* Your existing floor plane */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]}>
        <planeGeometry args={[20, 20]} />
        <meshStandardMaterial color="#1a2235" />
      </mesh>

      {/* The GLB model */}
      <primitive object={scene} position={[0, 0, 0]} />
    </>
  );
}

// Preload for better performance
useGLTF.preload("/ClassroomModel.glb");
