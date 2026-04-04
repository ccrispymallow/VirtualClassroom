import { Canvas } from "@react-three/fiber";
import { Suspense } from "react";
import MeetingInterface from "../components/meetingInterface";
import Avatar from "../components/avatar";
import Classroom from "../components/classroom";
import BoardMesh from "../components/boardMesh";
import ScreenMesh from "../components/screenMesh";
import FollowCamera from "../components/followCamera";
import { RoomProvider } from "../components/roomContext";
import { useRoom } from "../components/roomContext";

function SitPrompt() {
  const { isSitting, nearChair } = useRoom();
  const visible = isSitting || nearChair;
  return (
    <div
      style={{
        position: "fixed",
        bottom: "100px",
        left: "50%",
        transform: `translateX(-50%) translateY(${visible ? "0px" : "12px"})`,
        opacity: visible ? 1 : 0,
        pointerEvents: "none",
        transition: "opacity 0.2s ease, transform 0.2s ease",
        display: "flex",
        alignItems: "center",
        gap: "10px",
        background: "rgba(0,0,0,0.72)",
        backdropFilter: "blur(10px)",
        border: "1px solid rgba(255,255,255,0.13)",
        borderRadius: "14px",
        padding: "10px 20px",
        color: "#fff",
        fontSize: "13px",
        fontFamily: "sans-serif",
        whiteSpace: "nowrap",
        boxShadow: "0 4px 24px rgba(0,0,0,0.45)",
        zIndex: 9999,
      }}
    >
      <span style={{ fontSize: "16px" }}>🪑</span>
      <kbd
        style={{
          background: "rgba(255,255,255,0.14)",
          border: "1px solid rgba(255,255,255,0.28)",
          borderRadius: "6px",
          padding: "2px 10px",
          fontSize: "12px",
          fontWeight: "bold",
          color: "#fff",
        }}
      >
        SPACE
      </kbd>
      <span style={{ color: "rgba(255,255,255,0.85)" }}>
        {isSitting ? "Stand up" : "Sit down"}
      </span>
    </div>
  );
}

export default function MainEngine() {
  return (
    <RoomProvider>
      <div style={{ width: "100vw", height: "100vh" }}>
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
            <BoardMesh position={[-4, 2, -2.25]} />
            <ScreenMesh position={[0, 2, 4.5]} />
          </Suspense>
          <FollowCamera />
        </Canvas>
        <SitPrompt />
        <MeetingInterface />
      </div>
    </RoomProvider>
  );
}
