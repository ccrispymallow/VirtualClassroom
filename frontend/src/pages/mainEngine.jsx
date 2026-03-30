import { Canvas } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import { Suspense } from "react";
import MeetingInterface from "../components/classInterface/meetingInterface";
import Avatar from "../components/classInterface/avatar";
import Classroom from "../components/classInterface/classroom";

export default function MainEngine() {
  return (
    <div style={{ width: "100vw", height: "100vh" }}>
      <Canvas camera={{ position: [0, 2, 5] }}>
        <ambientLight intensity={0.5} />
        <directionalLight position={[5, 5, 5]} />
        <Suspense fallback={null}>
          <Classroom />
          <Avatar />
        </Suspense>
        <OrbitControls />
      </Canvas>
      <MeetingInterface />
    </div>
  );
}
