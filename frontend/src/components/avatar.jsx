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

// ─── AvatarModel ──────────────────────────────────────────────────────────────

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
    if (names.length === 0 || Object.keys(actions).length === 0) return;

    if (!hasInitialized.current) {
      const raf = requestAnimationFrame(() => {
        hasInitialized.current = true;
        Object.values(actions).forEach((a) => a.stop());
        const standing = actions["Standing"];
        if (standing) {
          standing.reset().play();
          currentActionRef.current = "Standing";
        }
      });
      return () => cancelAnimationFrame(raf);
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

// ─── Helpers ──────────────────────────────────────────────────────────────────

// Returns the chair ID that a peer is currently occupying, or null.
function getOccupiedChairId(peerPos) {
  if (!peerPos) return null;
  const [px, , pz] = peerPos;
  for (const chair of CHAIR_POSITIONS) {
    const [cx, , cz] = chair.position;
    if (Math.sqrt((px - cx) ** 2 + (pz - cz) ** 2) < 0.1) {
      return chair.id;
    }
  }
  return null;
}

// Returns a Set of chair IDs currently occupied by peers.
function getOccupiedChairIds(participants, userId, peerSitting, peerPositions) {
  return new Set(
    participants
      .filter((p) => p.id !== userId && peerSitting?.[p.id])
      .map((p) => getOccupiedChairId(peerPositions[p.id]))
      .filter(Boolean),
  );
}

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

    // Sort by ID so every client assigns the same slot to the same person
    const sorted = [...participants].sort((a, b) =>
      String(a.id).localeCompare(String(b.id)),
    );
    const myIndex = sorted.findIndex((p) => p.id === user.id);
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

  // ── Spacebar — sit / stand ─────────────────────────────────────────────────
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
        setAvatarPosition([...posRef.current]);
        socket?.emit("sit-update", {
          roomCode,
          userId: user.id,
          isSitting: false,
          position: posRef.current,
        });
        return;
      }

      // Sit down — find nearest unoccupied chair
      const [px, , pz] = posRef.current;
      const occupiedChairIds = getOccupiedChairIds(
        participants,
        user.id,
        peerSitting,
        peerPositions,
      );

      let nearest = null;
      let nearestDist = Infinity;
      for (const chair of CHAIR_POSITIONS) {
        if (occupiedChairIds.has(chair.id)) continue;
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
    participants,
    peerSitting,
    peerPositions,
  ]);

  // ── Sit rejected by server ─────────────────────────────────────────────────
  useEffect(() => {
    const handleSitRejected = () => {
      sittingChairRef.current = null;
      setIsSitting(false);
      setNearChair(false);
    };
    socket?.on("sit-rejected", handleSitRejected);
    return () => socket?.off("sit-rejected", handleSitRejected);
  }, [socket, setIsSitting, setNearChair]);

  // ── Frame loop ─────────────────────────────────────────────────────────────
  useFrame((_, delta) => {
    const now = Date.now();

    // Always emit position + yaw — even while sitting so avatar turns in place
    if (socket && roomCode && now - lastEmitRef.current >= EMIT_INTERVAL) {
      lastEmitRef.current = now;
      socket.emit("position-update", {
        roomCode,
        userId: user.id,
        position: posRef.current,
        yaw: yawRef.current,
      });
    }

    // Proximity check — show sit prompt only for unoccupied nearby chairs
    if (!sittingChairRef.current) {
      const [px, , pz] = posRef.current;
      const occupiedChairIds = getOccupiedChairIds(
        participants,
        user.id,
        peerSitting,
        peerPositions,
      );
      const close = CHAIR_POSITIONS.some(({ id, position: [cx, , cz] }) => {
        if (occupiedChairIds.has(id)) return false;
        return Math.sqrt((px - cx) ** 2 + (pz - cz) ** 2) < CHAIR_SNAP_RADIUS;
      });
      setNearChair((prev) => (prev !== close ? close : prev));
    }

    // Skip movement while sitting
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
        const otherPos = peerPositions[other.id];
        if (!otherPos) continue;
        const [ox, , oz] = otherPos;
        if (ox === 0 && oz === 0) continue; // skip peers not yet spawned
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
