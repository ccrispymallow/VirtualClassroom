import { useRoom } from "../components/roomContext";
import { useFrame } from "@react-three/fiber";
import { useRef, useEffect, useMemo } from "react";
import { useParams } from "react-router-dom";
import { useGLTF, useAnimations, Html, Billboard } from "@react-three/drei";
import { BsMicFill, BsMicMuteFill } from "react-icons/bs";
import { SkeletonUtils } from "three-stdlib";

const COLLISION_RADIUS = 0.8;
const EMIT_INTERVAL = 50;
const MOVE_KEYS = [
  "w",
  "a",
  "s",
  "d",
  "arrowup",
  "arrowdown",
  "arrowleft",
  "arrowright",
];

const SPAWN_SLOTS = [
  [-3, 0, 4],
  [-2, 0, 4],
  [-4, 0, 4],
  [-3, 0, 6],
  [-2, 0, 6],
  [-4, 0, 6],
  [-1, 0, 6],
  [-1, 0, 8],
];

function AvatarModel({
  position,
  yaw = 0,
  avatarType = "boy",
  isMoving = false,
  emote = null,
}) {
  const modelUrl = avatarType === "boy" ? "/boy.glb" : "/girl.glb";
  const { scene, animations } = useGLTF(modelUrl);
  const clone = useMemo(() => SkeletonUtils.clone(scene), [scene]);
  const { actions, names } = useAnimations(animations, clone);
  const currentActionRef = useRef(null);

  const hasInitialized = useRef(false);

  useEffect(() => {
    if (names.length === 0) return;
    if (Object.keys(actions).length === 0) return;

    const next = actions["Standing"];
    if (!next) return;

    if (!hasInitialized.current) {
      hasInitialized.current = true;
      // Force stop everything immediately, no fade
      Object.values(actions).forEach((a) => a.stop());
      next.reset().play();
      currentActionRef.current = "Standing";
      return;
    }

    let targetAnim = "Standing";
    if (emote === "raise") targetAnim = "Raising Hand";
    else if (emote === "speaking") targetAnim = "Speaking";
    else if (isMoving) targetAnim = "Walking";

    if (!names.includes(targetAnim)) return;
    if (currentActionRef.current === targetAnim) return;

    const prev = actions[currentActionRef.current];
    const target = actions[targetAnim];
    if (!target) return;

    if (prev) {
      target.reset().fadeIn(0.2).play();
      prev.fadeOut(0.2);
    } else {
      target.reset().fadeIn(0.2).play();
    }
    currentActionRef.current = targetAnim;
  }, [isMoving, emote, actions, names]);

  return (
    <primitive
      object={clone}
      position={position}
      rotation={[0, -yaw + Math.PI, 0]}
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
    peerMoving,
    peerYaws,
    socket,
    keysRef,
    yawRef,
    posRef,
    setAvatarPosition,
    myEmote,
    peerEmotes,
  } = useRoom();

  const user = JSON.parse(localStorage.getItem("userSession") || "{}");
  const lastEmitRef = useRef(0);
  const initializedRef = useRef(false);
  const isMovingRef = useRef(false);

  useEffect(() => {
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
        yaw: yawRef.current,
      });
    }
  }, [
    participants,
    socket,
    roomCode,
    user.id,
    posRef,
    setAvatarPosition,
    yawRef,
  ]);

  useFrame((_, delta) => {
    const speed = 5;
    const keys = keysRef.current;
    const [x, y, z] = posRef.current;
    const yaw = yawRef.current;
    const sinY = Math.sin(yaw);
    const cosY = Math.cos(yaw);

    let dx = 0,
      dz = 0;
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

    const anyMoveKeyHeld = MOVE_KEYS.some((k) => keys[k]);
    if (anyMoveKeyHeld !== isMovingRef.current) {
      isMovingRef.current = anyMoveKeyHeld;
      if (socket && roomCode) {
        socket.emit("moving-update", {
          roomCode,
          userId: user.id,
          isMoving: anyMoveKeyHeld,
        });
      }
    }

    const moving = dx !== 0 || dz !== 0;
    if (moving) {
      const nx = x + dx;
      const nz = z + dz;
      const others = participants.filter((p) => p.id !== user.id);
      let blocked = false;
      for (const other of others) {
        if (!peerPositions[other.id]) continue;
        const [ox, , oz] = peerPositions[other.id];
        const cdx = nx - ox,
          cdz = nz - oz;
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
        yaw: yawRef.current,
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
              <AvatarModel
                key={`${p.id}-${p.avatar || "boy"}`}
                position={[px, py, pz]}
                avatarType={p.avatar || "boy"}
                isMoving={peerMoving?.[p.id] || false}
                emote={peerEmotes?.[p.id] || null}
                yaw={peerYaws?.[p.id] ?? 0}
              />
              <Billboard position={[px, py + 2.4, pz]}>
                <Html
                  transform
                  occlude
                  distanceFactor={8}
                  center
                  zIndexRange={[10, 10]}
                >
                  <div
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: "3px",
                      background: "rgba(17,24,39,0.8)",
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
              </Billboard>
            </group>
          );
        })}
    </>
  );
}
