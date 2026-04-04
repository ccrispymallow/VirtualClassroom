import { useRoom } from "../components/roomContext";
import { useFrame } from "@react-three/fiber";
import { useRef, useEffect, useMemo } from "react";
import { useParams } from "react-router-dom";
import { useGLTF, useAnimations, Html, Billboard } from "@react-three/drei";
import { BsMicFill, BsMicMuteFill } from "react-icons/bs";
import { SkeletonUtils } from "three-stdlib";
import {
  CHAIR_POSITIONS,
  CHAIR_SNAP_RADIUS,
  collidesWithFurniture,
} from "./Classroom";

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

// ─── AvatarModel ─────────────────────────────────────────────────────────────
function AvatarModel({
  position,
  yaw = 0,
  avatarType = "boy",
  isMoving = false,
  emote = null,
  isSitting = false,
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

    if (!hasInitialized.current) {
      hasInitialized.current = true;
      Object.values(actions).forEach((a) => a.stop());
      const standing = actions["Standing"];
      if (standing) standing.reset().play();
      currentActionRef.current = "Standing";
      return;
    }

    let targetAnim = null;
    if (isSitting)
      targetAnim =
        names.find((n) => n.toLowerCase().includes("sit")) ?? "Sitting";
    else if (emote === "raise") targetAnim = "Raising Hand";
    else if (emote === "speaking") targetAnim = "Speaking";
    else if (isMoving) targetAnim = "Walking";
    else targetAnim = "Standing";

    if (!names.includes(targetAnim)) {
      console.warn("Animation not found:", targetAnim, "| available:", names);
      return;
    }
    if (currentActionRef.current === targetAnim) return;

    Object.values(actions).forEach((a) => a.fadeOut(0.2));
    const next = actions[targetAnim];
    if (!next) return;
    next.reset().fadeIn(0.2).play();
    currentActionRef.current = targetAnim;
  }, [isMoving, emote, isSitting, actions, names]);

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

// ─── Avatar ───────────────────────────────────────────────────────────────────
export default function Avatar() {
  const { roomCode } = useParams();
  const {
    participants,
    peerPositions,
    peerMoving,
    peerSitting,
    peerYaws,
    socket,
    keysRef,
    yawRef,
    posRef,
    setAvatarPosition,
    myEmote,
    peerEmotes,
    isSitting,
    setIsSitting,
    setNearChair,
  } = useRoom();

  const user = JSON.parse(localStorage.getItem("userSession") || "{}");
  const lastEmitRef = useRef(0);
  const initializedRef = useRef(false);
  const isMovingRef = useRef(false);
  const sittingChairRef = useRef(null);

  // ── Spawn ──────────────────────────────────────────────────────────────────
  useEffect(() => {
    if (initializedRef.current || participants.length === 0) return;
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

  // ── Spacebar ───────────────────────────────────────────────────────────────
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.code !== "Space") return;
      e.preventDefault();

      // Stand up
      if (sittingChairRef.current) {
        sittingChairRef.current = null;
        setIsSitting(false);
        setNearChair(false);
        isMovingRef.current = false;

        posRef.current = [posRef.current[0], 0, posRef.current[2]];
        setAvatarPosition([posRef.current[0], 0, posRef.current[2]]);

        socket?.emit("sit-update", {
          roomCode,
          userId: user.id,
          isSitting: false,
          position: posRef.current,
        });
        return;
      }

      // Find nearest chair
      const [px, , pz] = posRef.current;
      let nearest = null;
      let nearestDist = Infinity;
      for (const chair of CHAIR_POSITIONS) {
        const [cx, , cz] = chair.position;
        const dist = Math.sqrt((px - cx) ** 2 + (pz - cz) ** 2);
        if (dist < CHAIR_SNAP_RADIUS && dist < nearestDist) {
          nearest = chair;
          nearestDist = dist;
        }
      }

      if (nearest) {
        const [cx, cy, cz] = nearest.position;
        posRef.current = [cx, cy, cz];
        setAvatarPosition([cx, cy, cz]);
        sittingChairRef.current = nearest.id;
        setIsSitting(true);
        socket?.emit("sit-update", {
          roomCode,
          userId: user.id,
          isSitting: true,
          position: [cx, cy, cz],
        });
      }
    };

    window.addEventListener("keydown", handleKeyDown, { capture: true });
    return () =>
      window.removeEventListener("keydown", handleKeyDown, { capture: true });
  }, [
    socket,
    roomCode,
    user.id,
    posRef,
    setAvatarPosition,
    setIsSitting,
    setNearChair,
  ]);

  // ── Frame loop ─────────────────────────────────────────────────────────────
  useFrame((_, delta) => {
    if (!sittingChairRef.current) {
      const [px, , pz] = posRef.current;
      const close = CHAIR_POSITIONS.some(
        ({ position: [cx, , cz] }) =>
          Math.sqrt((px - cx) ** 2 + (pz - cz) ** 2) < CHAIR_SNAP_RADIUS,
      );
      setNearChair((prev) => (prev !== close ? close : prev));
    }

    if (sittingChairRef.current) return;

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

    if (dx !== 0 || dz !== 0) {
      const nx = x + dx;
      const nz = z + dz;
      let blocked = false;

      // ── Peer collision ─────────────────────────────────────────────────────
      for (const other of participants.filter((p) => p.id !== user.id)) {
        if (!peerPositions[other.id]) continue;
        const [ox, , oz] = peerPositions[other.id];
        if (Math.sqrt((nx - ox) ** 2 + (nz - oz) ** 2) < COLLISION_RADIUS) {
          blocked = true;
          break;
        }
      }

      // ── Furniture collision ────────────────────────────────────────────────
      // Try full move first; if blocked, try sliding along each axis separately.
      if (!blocked) {
        if (collidesWithFurniture(nx, nz)) {
          // Try sliding on X axis only
          const slideX = !collidesWithFurniture(nx, z);
          // Try sliding on Z axis only
          const slideZ = !collidesWithFurniture(x, nz);

          if (slideX) {
            // Move only along X
            posRef.current = [nx, y, z];
            setAvatarPosition([nx, y, z]);
          } else if (slideZ) {
            // Move only along Z
            posRef.current = [x, y, nz];
            setAvatarPosition([x, y, nz]);
          }
          // If both axes blocked, don't move at all
        } else {
          // No furniture collision — move freely
          posRef.current = [nx, y, nz];
          setAvatarPosition([nx, y, nz]);
        }
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

  // ── Render — peers only ───────────────────────────────────────────────────
  return (
    <>
      {participants
        .filter((p) => p.id !== user.id)
        .map((p) => {
          if (!peerPositions[p.id]) return null;
          const [px, py, pz] = peerPositions[p.id];
          return (
            <group key={p.id}>
              <AvatarModel
                key={`${p.id}-${p.avatar || "boy"}`}
                position={[px, py, pz]}
                avatarType={p.avatar || "boy"}
                isMoving={peerMoving?.[p.id] || false}
                emote={peerEmotes?.[p.id] || null}
                isSitting={peerSitting?.[p.id] || false}
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
                    <span>{p.username || "Guest"}</span>
                    {p.mic ? (
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
