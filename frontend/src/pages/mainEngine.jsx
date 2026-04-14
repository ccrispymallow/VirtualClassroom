import * as THREE from "three";
import { Canvas } from "@react-three/fiber";
import { Suspense, lazy, useMemo } from "react";
import { Environment, Sky } from "@react-three/drei";
import { RoomProvider, useRoom } from "../components/roomContext";
import "../App.css"; // Ensures your global styles are loaded

const MeetingInterface = lazy(() => import("../components/meetingInterface"));
const Avatar = lazy(() => import("../components/avatar"));
const Classroom = lazy(() => import("../components/classroom"));
const BoardMesh = lazy(() => import("../components/boardMesh"));
const ScreenMesh = lazy(() => import("../components/screenMesh"));
const FollowCamera = lazy(() => import("../components/followCamera"));

function SitPrompt() {
  const { isSitting, nearChair } = useRoom();
  const visible = isSitting || nearChair;

  return (
    <div className={`sit-prompt ${visible ? "visible" : "hidden"}`}>
      <div className="sit-prompt-icon">
        {/* Minimalist SVG Chair Icon */}
        <svg
          width="18"
          height="18"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M5 3v18"></path>
          <path d="M5 13h14"></path>
          <path d="M19 13v8"></path>
        </svg>
      </div>

      <kbd className="sit-prompt-key">SPACE</kbd>

      <span className="sit-prompt-text">
        {isSitting ? "Stand up" : "Sit down"}
      </span>
    </div>
  );
}

export default function MainEngine() {
  const cameraConfig = useMemo(() => ({ position: [0, 1.6, 7] }), []);

  return (
    <RoomProvider>
      <div style={{ width: "100vw", height: "100vh" }}>
        <Canvas
          camera={cameraConfig}
          dpr={1}
          gl={{ antialias: false, shadowMap: { type: THREE.PCFShadowMap } }}
          performance={{ min: 0.4, max: 0.8, debounce: 100 }}
          shadows={false}
          flat
          tabIndex={0}
          style={{ outline: "none" }}
        >
          <color attach="background" args={["#c7d8ef"]} />
          <hemisphereLight skyColor="#ffffff" groundColor="#a3b9d3" intensity={0.3} />
          <ambientLight intensity={0.5} />
          <directionalLight position={[6, 12, 6]} intensity={0.95} />
          <directionalLight position={[-4, 5, -3]} intensity={0.35} />

          <Sky
            distance={450000}
            sunPosition={[5, 10, 5]}
            inclination={0.52}
            azimuth={0.15}
            turbidity={8}
            rayleigh={1.8}
            mieCoefficient={0.005}
            mieDirectionalG={0.7}
          />
          <Environment preset="sunset" background={false} />

          <Suspense fallback={null}>
            <Classroom />
            <Avatar />
            <BoardMesh position={[-4, 2, -2.25]} />
            <ScreenMesh position={[0, 2, 4.5]} />
            <FollowCamera />
          </Suspense>
        </Canvas>

        <SitPrompt />

        <Suspense fallback={null}>
          <MeetingInterface />
        </Suspense>
      </div>
    </RoomProvider>
  );
}
