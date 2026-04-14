import { useEffect, useRef } from "react";
import {
  useGLTF,
  AccumulativeShadows,
  RandomizedLight,
} from "@react-three/drei";
import { useThree, useFrame } from "@react-three/fiber";
import { WebGLPathTracer } from "three-gpu-pathtracer";
import * as THREE from "three";
import { EffectComposer, GodRays, Vignette } from "@react-three/postprocessing";
import { BlendFunction, KernelSize } from "postprocessing";

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
    )
      return true;
  }
  return false;
}

export function WindowLightSources({ refs }) {
  return (
    <>
      <mesh
        ref={refs[0]}
        position={[-4.75, 2.2, -3]}
        rotation={[0, Math.PI / 2, 0]}
      >
        <planeGeometry args={[2.0, 2.2]} />
        <meshBasicMaterial
          color="#1a2530"
          toneMapped={false}
          side={THREE.FrontSide}
        />
      </mesh>
      <mesh
        ref={refs[1]}
        position={[-4.75, 2.2, -7]}
        rotation={[0, Math.PI / 2, 0]}
      >
        <planeGeometry args={[2.0, 2.2]} />
        <meshBasicMaterial
          color="#1a2530"
          toneMapped={false}
          side={THREE.FrontSide}
        />
      </mesh>
      <mesh
        ref={refs[2]}
        position={[-4.75, 2.2, -11]}
        rotation={[0, Math.PI / 2, 0]}
      >
        <planeGeometry args={[2.0, 2.2]} />
        <meshBasicMaterial
          color="#1a2530"
          toneMapped={false}
          side={THREE.FrontSide}
        />
      </mesh>
    </>
  );
}

function ClassroomLights() {
  return (
    <>
      <ambientLight intensity={0.35} color="#d8cbb8" />

      <directionalLight
        position={[-8, 4, -8]}
        intensity={0.55}
        color="#e8d8c0"
        castShadow
        shadow-mapSize={[2048, 2048]}
        shadow-camera-near={0.5}
        shadow-camera-far={65}
        shadow-camera-left={-16}
        shadow-camera-right={10}
        shadow-camera-top={10}
        shadow-camera-bottom={-10}
        shadow-bias={-0.0004}
      />

      <directionalLight
        position={[4, 3, -12]}
        intensity={0.15}
        color="#c8d8e0"
      />

      <directionalLight position={[0, 2, 4]} intensity={0.08} color="#d0c8b8" />
    </>
  );
}

function ClassroomShadows() {
  return (
    <AccumulativeShadows
      temporal
      frames={120}
      alphaTest={0.8}
      scale={22}
      position={[0, -0.23, -10]}
      color="#2a1f10"
      colorBlend={0.6}
      opacity={0.7}
    >
      <RandomizedLight
        amount={4}
        radius={1.5}
        ambient={0.3}
        position={[-7, 4, -8]}
        bias={-0.001}
        size={16}
        near={0.5}
        far={55}
        mapSize={1024}
      />
    </AccumulativeShadows>
  );
}

export function applyRaytraceMaterials(scene) {
  scene.traverse((child) => {
    if (!child.isMesh) return;
    const name = child.name.toLowerCase();

    if (
      name.includes("window") ||
      name.includes("glass") ||
      name.includes("curtain") ||
      name.includes("drape") ||
      name.includes("blind")
    ) {
      child.castShadow = false;
      child.receiveShadow = false;
      return;
    }

    child.castShadow = true;
    child.receiveShadow = true;

    if (
      name.includes("desk") ||
      name.includes("table") ||
      name.includes("chair")
    ) {
      child.material = new THREE.MeshStandardMaterial({
        color: new THREE.Color("#9B6B3A"),
        roughness: 0.6,
        metalness: 0.0,
        envMapIntensity: 0.3,
      });
    }
    if (
      name.includes("leg") ||
      name.includes("metal") ||
      name.includes("frame")
    ) {
      child.material = new THREE.MeshStandardMaterial({
        color: new THREE.Color("#222222"),
        roughness: 0.45,
        metalness: 0.8,
      });
    }
    if (
      name.includes("board") ||
      name.includes("screen") ||
      name.includes("blackboard")
    ) {
      child.material = new THREE.MeshStandardMaterial({
        color: new THREE.Color("#101010"),
        roughness: 0.95,
        metalness: 0.0,
      });
      child.castShadow = false;
    }
    if (name.includes("wall")) {
      child.material = new THREE.MeshStandardMaterial({
        color: new THREE.Color("#8fbfb0"),
        roughness: 0.92,
        metalness: 0.0,
        envMapIntensity: 0.15,
      });
      child.castShadow = false;
    }
    if (name.includes("floor") || name.includes("ground")) {
      child.material = new THREE.MeshStandardMaterial({
        color: new THREE.Color("#7a5230"),
        roughness: 0.3,
        metalness: 0.0,
        envMapIntensity: 0.5,
      });
      child.castShadow = false;
    }
    if (name.includes("ceiling") || name.includes("roof")) {
      child.material = new THREE.MeshStandardMaterial({
        color: new THREE.Color("#1a1e20"),
        roughness: 1.0,
        metalness: 0.0,
      });
      child.castShadow = false;
      child.receiveShadow = false;
    }
    if (name.includes("radiator") || name.includes("heater")) {
      child.material = new THREE.MeshStandardMaterial({
        color: new THREE.Color("#c8c0b0"),
        roughness: 0.35,
        metalness: 0.5,
      });
    }
  });
}

function usePathTracer(enabled = false) {
  const { gl, scene, camera } = useThree();
  const ptRef = useRef(null);
  useEffect(() => {
    if (!enabled) return;
    ptRef.current = new WebGLPathTracer(gl);
    ptRef.current.setScene(scene, camera);
    ptRef.current.renderScale = 0.75;
    ptRef.current.samples = 0;
    return () => {
      ptRef.current = null;
    };
  }, [enabled, gl, scene, camera]);
  useFrame(() => {
    if (enabled && ptRef.current) ptRef.current.renderSample();
  });
  return ptRef;
}

function ClassroomPostFX({ windowRefs }) {
  const primaryWindow = windowRefs[1];
  return (
    <EffectComposer multisampling={0}>
      {primaryWindow?.current && (
        <GodRays
          sun={primaryWindow.current}
          blendFunction={BlendFunction.SCREEN}
          samples={80}
          density={0.94}
          decay={0.88}
          weight={0.15} // subtle rays — just a hint, not dramatic
          exposure={0.25}
          clampMax={1}
          kernelSize={KernelSize.SMALL}
          blur={true}
        />
      )}
      <Vignette
        offset={0.4}
        darkness={0.55}
        blendFunction={BlendFunction.NORMAL}
      />
    </EffectComposer>
  );
}

export default function Classroom({ enablePathTracing = false }) {
  const { scene } = useGLTF("/ClassroomModel_max40.glb");

  const windowRef0 = useRef();
  const windowRef1 = useRef();
  const windowRef2 = useRef();
  const windowRefs = [windowRef0, windowRef1, windowRef2];

  useEffect(() => {
    if (scene) applyRaytraceMaterials(scene);
  }, [scene]);
  usePathTracer(enablePathTracing);

  return (
    <>
      <ClassroomLights />
      <ClassroomShadows />
      <WindowLightSources refs={windowRefs} />
      <ClassroomPostFX windowRefs={windowRefs} />
      <primitive object={scene} position={[0, 0, 0]} />
    </>
  );
}

useGLTF.preload("/ClassroomModel_max40.glb");
