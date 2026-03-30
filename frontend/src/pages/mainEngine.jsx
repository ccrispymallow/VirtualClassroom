import { Canvas } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import { Suspense } from "react";
import MeetingInterface from "../components/meetingInterface";
import Avatar from "../components/avatar";
import Classroom from "../components/classroom";
import { RoomProvider } from "../components/roomContext";

export default function MainEngine() {
  return (
    <RoomProvider>
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
    </RoomProvider>
  );
}
