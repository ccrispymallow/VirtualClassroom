import { useRoom } from "../components/roomContext";
import { useFrame } from "@react-three/fiber";
import { useRef, useEffect, useMemo } from "react";
import { useParams } from "react-router-dom";
import { useGLTF, useAnimations, Html } from "@react-three/drei";
import { BsMicFill, BsMicMuteFill } from "react-icons/bs";
import { SkeletonUtils } from "three-stdlib";

const COLLISION_RADIUS = 0.8;
const EMIT_INTERVAL = 50;

const SPAWN_SLOTS = [
  [-3, 0, 4],
  [-2, 0, 4],
  [-4, 0, 4],
  [-3, 0, 5],
  [-2, 0, 5],
  [-4, 0, 5],
  [-1, 0, 4],
  [-1, 0, 5],
];

function AvatarModel({ position, yaw = 0, avatarType = "boy" }) {
  const modelUrl = avatarType === "boy" ? "/boy.glb" : "/girl.glb";
  const { scene, animations } = useGLTF(modelUrl);
  const clone = useMemo(() => SkeletonUtils.clone(scene), [scene]);
  const { actions, names } = useAnimations(animations, clone);

  useEffect(() => {
    if (names.length > 0) {
      actions[names[0]]?.reset().fadeIn(0.2).play();
    }
  }, [animations, actions, names]);

  return (
    <primitive
      object={clone}
      position={position}
      rotation={[0, yaw, 0]}
      scale={1}
    />
  );
}

useGLTF.preload("/boy.glb");
useGLTF.preload("/girl.glb");

export default function Avatar() {
  const { roomCode } = useParams();
  const {
    participants,
    peerPositions,
    socket,
    keysRef,
    yawRef,
    posRef,
    setAvatarPosition,
  } = useRoom();
  const user = JSON.parse(localStorage.getItem("userSession") || "{}");
  const lastEmitRef = useRef(0);
  const initializedRef = useRef(false);

  useEffect(() => {
    // Only initialize spawn position once, on first load
    if (initializedRef.current) return;
    if (participants.length === 0) return;
    
    const myIndex = participants.findIndex((p) => p.id === user.id);
    if (myIndex === -1) return;
    
    const slot = SPAWN_SLOTS[myIndex % SPAWN_SLOTS.length] ?? SPAWN_SLOTS[0];
    posRef.current = [...slot];
    setAvatarPosition([...slot]);
    yawRef.current = Math.PI / 2;
    initializedRef.current = true;

    if (socket && roomCode) {
      socket.emit("position-update", {
        roomCode,
        userId: user.id,
        position: posRef.current,
      });
    }
  }, [participants, socket, roomCode, user.id, posRef, setAvatarPosition, yawRef]);

  useFrame((_, delta) => {
    const speed = 5;
    const keys = keysRef.current;
    const [x, y, z] = posRef.current;
    const yaw = yawRef.current;

    // ── define sinY and cosY from yaw (this was missing before) ──
    const sinY = Math.sin(yaw);
    const cosY = Math.cos(yaw);

    let dx = 0;
    let dz = 0;

    if (keys["w"] || keys["arrowup"]) {
      dx += sinY * speed * delta;
      dz -= cosY * speed * delta;
    }
    if (keys["s"] || keys["arrowdown"]) {
      dx -= sinY * speed * delta;
      dz += cosY * speed * delta;
    }
    if (keys["a"] || keys["arrowleft"]) {
      dx -= cosY * speed * delta;
      dz -= sinY * speed * delta;
    }
    if (keys["d"] || keys["arrowright"]) {
      dx += cosY * speed * delta;
      dz += sinY * speed * delta;
    }

    if (dx !== 0 || dz !== 0) {
      const nx = x + dx;
      const nz = z + dz;

      const others = participants.filter((p) => p.id !== user.id);
      let blocked = false;
      for (const other of others) {
        if (!peerPositions[other.id]) continue;
        const [ox, , oz] = peerPositions[other.id];
        const cdx = nx - ox;
        const cdz = nz - oz;
        if (Math.sqrt(cdx * cdx + cdz * cdz) < COLLISION_RADIUS) {
          blocked = true;
          break;
        }
      }

      if (!blocked) {
        posRef.current = [nx, y, nz];
        setAvatarPosition([nx, y, nz]);
      }
    }

    const now = Date.now();
    if (socket && roomCode && now - lastEmitRef.current >= EMIT_INTERVAL) {
      lastEmitRef.current = now;
      socket.emit("position-update", {
        roomCode,
        userId: user.id,
        position: posRef.current,
      });
    }
  });

  return (
    <>
      {participants
        .filter((p) => p.id !== user.id)
        .map((p) => {
          if (!peerPositions[p.id]) return null;
          const [px, py, pz] = peerPositions[p.id];
          const name = p.username || "Guest";
          const micActive = !!p.mic;

          return (
            <group key={p.id}>
              <AvatarModel position={[px, py, pz]} avatarType={p.avatar || "boy"} />

              <Html
                transform
                occlude
                distanceFactor={8}
                position={[px, py + 2.4, pz]}
                center
              >
                <div
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "3px",
                    background: "rgba(17, 24, 39, 0.8)",
                    padding: "2px 5px",
                    borderRadius: "8px",
                    color: "#fff",
                    fontSize: "10px",
                    whiteSpace: "nowrap",
                    boxShadow: "0 1px 8px rgba(0,0,0,0.5)",
                    pointerEvents: "none",
                  }}
                >
                  <span>{name}</span>
                  {micActive ? (
                    <BsMicFill size={10} color="#22c55e" />
                  ) : (
                    <BsMicMuteFill size={10} color="#f87171" />
                  )}
                </div>
              </Html>
            </group>
          );
        })}
    </>
  );
}
