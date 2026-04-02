import { Canvas } from "@react-three/fiber";
import { Suspense } from "react";
import MeetingInterface from "../components/meetingInterface";
import Avatar from "../components/avatar";
import Classroom from "../components/classroom";
import BoardMesh from "../components/boardMesh";
import ScreenMesh from "../components/screenMesh";
import FollowCamera from "../components/followCamera";
import { RoomProvider } from "../components/roomContext";

export default function MainEngine() {
  return (
    <RoomProvider>
      <div style={{ width: "100vw", height: "100vh" }}>
        {/*
          tabIndex={0} makes the Canvas focusable so keyboard events fire.
          outline: "none" removes the focus ring.
          The canvas must be clicked once to enable pointer lock + keyboard.
        */}
        <Canvas
          camera={{ position: [0, 1.6, 0] }}
          tabIndex={0}
          style={{ outline: "none" }}
        >
          <ambientLight intensity={0.4} />
          <directionalLight position={[5, 8, 5]} intensity={1} castShadow />
          <directionalLight position={[-5, 5, -5]} intensity={0.5} />
          <pointLight position={[0, 3, 0]} intensity={0.8} distance={10} />
          <Suspense fallback={null}>
            <Classroom />
            <Avatar />
            <BoardMesh position={[-3, 2, -8]} />
            <ScreenMesh position={[3, 2, -8]} />
          </Suspense>
          <FollowCamera />
        </Canvas>
        <MeetingInterface />
      </div>
    </RoomProvider>
  );
}
