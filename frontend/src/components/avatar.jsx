import { useRoom } from "../components/roomContext";
import { useFrame } from "@react-three/fiber";
import { memo, useRef, useEffect, useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import { useGLTF, useAnimations, Html, Billboard } from "@react-three/drei";
import { BsMicFill, BsMicMuteFill } from "react-icons/bs";
import { SkeletonUtils } from "three-stdlib";
import {
  CHAIR_POSITIONS,
  CHAIR_SNAP_RADIUS,
  collidesWithFurniture,
} from "./classroom";

const COLLISION_RADIUS = 0.8;
const COLLISION_RADIUS_SQ = COLLISION_RADIUS * COLLISION_RADIUS;
const EMIT_INTERVAL = 33;
const CHAIR_SNAP_RADIUS_SQ = CHAIR_SNAP_RADIUS * CHAIR_SNAP_RADIUS;
const CHAIR_OCCUPIED_EPSILON_SQ = 0.01;
const SPAWN_SLOTS = [
  [-3, 0, 4],
  [-2, 0, 4],
  [-3, 0, 6],
  [-2, 0, 6],
  [-1, 0, 6],
  [-1, 0, 8],
];

const AvatarModel = memo(function AvatarModel({
  position,
  yaw = 0,
  avatarType = "boy",
  isMoving = false,
  emote = null,
  isSitting = false,
}) {
  const modelUrl =
    avatarType === "boy" ? "/fixed model/boy.glb" : "/fixed model/girl.glb";
  const { scene, animations } = useGLTF(modelUrl);
  const clone = useMemo(() => SkeletonUtils.clone(scene), [scene]);
  const { actions, names } = useAnimations(animations, clone);
  const currentActionRef = useRef(null);

  useEffect(() => {
    if (names.length === 0 || Object.keys(actions).length === 0) return;

    let targetAnim = "Standing";
    if (isSitting) targetAnim = "Sitting";
    else if (isMoving) targetAnim = "Walking";

    if (emote === "raise") targetAnim = "Raising Hand";
    else if (emote === "speaking") targetAnim = "Speaking";

    const target = actions[targetAnim];
    if (!target) return;

    // Stop all, play target — simple and reliable
    Object.values(actions).forEach((a) => {
      if (a !== target) a.fadeOut(0.2);
    });

    if (currentActionRef.current !== targetAnim) {
      target
        .reset()
        .fadeIn(currentActionRef.current ? 0.2 : 0)
        .play();
      currentActionRef.current = targetAnim;
    }
  }, [isSitting, isMoving, emote, actions, names]);

  return (
    <primitive
      object={clone}
      position={position}
      rotation={[0, -yaw + Math.PI, 0]}
      scale={1}
    />
  );
});
useGLTF.preload("/fixed model/boy.glb");
useGLTF.preload("/fixed model/girl.glb");

// ─── Helpers ──────────────────────────────────────────────────────────────────
function getOccupiedChairId(peerPos) {
  if (!peerPos) return null;
  const [px, , pz] = peerPos;
  for (const chair of CHAIR_POSITIONS) {
    const [cx, , cz] = chair.position;
    const dx = px - cx;
    const dz = pz - cz;
    if (dx * dx + dz * dz < CHAIR_OCCUPIED_EPSILON_SQ) return chair.id;
  }
  return null;
}

function getOccupiedChairIds(participants, userId, peerSitting, peerPositions) {
  const occupied = new Set();
  for (let i = 0; i < participants.length; i += 1) {
    const p = participants[i];
    if (p.id === userId || !peerSitting?.[p.id]) continue;
    const chairId = getOccupiedChairId(peerPositions[p.id]);
    if (chairId) occupied.add(chairId);
  }
  return occupied;
}

function lerpAngle(current, target, t) {
  let diff = target - current;
  while (diff > Math.PI) diff -= Math.PI * 2;
  while (diff < -Math.PI) diff += Math.PI * 2;
  return current + diff * t;
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
    peerEmotes,
    setIsSitting,
    setNearChair,
  } = useRoom();

  const user = JSON.parse(localStorage.getItem("userSession") || "{}");
  const lastEmitRef = useRef(0);
  const lastSentRef = useRef({ x: null, y: null, z: null, yaw: null });
  const initializedRef = useRef(false);
  const isMovingRef = useRef(false);
  const sittingChairRef = useRef(null);
  const [smoothedPeerPositions, setSmoothedPeerPositions] = useState({});
  const [smoothedPeerYaws, setSmoothedPeerYaws] = useState({});
  const targetPeerPositionsRef = useRef({});
  const targetPeerYawsRef = useRef({});
  const occupiedChairIds = useMemo(
    () =>
      getOccupiedChairIds(participants, user.id, peerSitting, peerPositions),
    [participants, user.id, peerSitting, peerPositions],
  );
  const otherParticipants = useMemo(
    () => participants.filter((p) => p.id !== user.id),
    [participants, user.id],
  );

  useEffect(() => {
    targetPeerPositionsRef.current = peerPositions;
  }, [peerPositions]);

  useEffect(() => {
    targetPeerYawsRef.current = peerYaws;
  }, [peerYaws]);

  // ── Spawn ──────────────────────────────────────────────────────────────────
  useEffect(() => {
    if (initializedRef.current || participants.length === 0) return;
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
    socket?.emit("position-update", {
      roomCode,
      userId: user.id,
      position: posRef.current,
      yaw: yawRef.current,
    });
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
      const activeTag = document.activeElement?.tagName?.toLowerCase();
      const isTyping =
        activeTag === "input" ||
        activeTag === "textarea" ||
        document.activeElement?.isContentEditable;

      if (isTyping) {
        return;
      }
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
      let nearest = null,
        nearestDistSq = Infinity;
      for (const chair of CHAIR_POSITIONS) {
        if (occupiedChairIds.has(chair.id)) continue;
        const [cx, , cz] = chair.position;
        const dx = px - cx;
        const dz = pz - cz;
        const distSq = dx * dx + dz * dz;
        if (distSq < CHAIR_SNAP_RADIUS_SQ && distSq < nearestDistSq) {
          nearest = chair;
          nearestDistSq = distSq;
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
    occupiedChairIds,
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
    const lerpFactor = 1 - Math.exp(-12 * delta);
    const targetPositions = targetPeerPositionsRef.current;
    const targetYaws = targetPeerYawsRef.current;

    setSmoothedPeerPositions((prev) => {
      let changed = false;
      const next = { ...prev };
      for (const id in targetPositions) {
        const target = targetPositions[id];
        if (!target) continue;
        const current = next[id] ?? target;
        const nx = current[0] + (target[0] - current[0]) * lerpFactor;
        const ny = current[1] + (target[1] - current[1]) * lerpFactor;
        const nz = current[2] + (target[2] - current[2]) * lerpFactor;
        if (
          !next[id] ||
          Math.abs(nx - current[0]) > 0.0001 ||
          Math.abs(ny - current[1]) > 0.0001 ||
          Math.abs(nz - current[2]) > 0.0001
        ) {
          next[id] = [nx, ny, nz];
          changed = true;
        }
      }
      return changed ? next : prev;
    });

    setSmoothedPeerYaws((prev) => {
      let changed = false;
      const next = { ...prev };
      for (const id in targetYaws) {
        const targetYaw = targetYaws[id];
        if (targetYaw === undefined) continue;
        const currentYaw = next[id] ?? targetYaw;
        const smoothed = lerpAngle(currentYaw, targetYaw, lerpFactor);
        if (!next[id] || Math.abs(smoothed - currentYaw) > 0.0001) {
          next[id] = smoothed;
          changed = true;
        }
      }
      return changed ? next : prev;
    });

    const now = Date.now();
    if (socket && roomCode && now - lastEmitRef.current >= EMIT_INTERVAL) {
      const [x, y, z] = posRef.current;
      const yaw = yawRef.current;
      const last = lastSentRef.current;
      const hasMoved =
        last.x === null ||
        Math.abs(last.x - x) > 0.001 ||
        Math.abs(last.y - y) > 0.001 ||
        Math.abs(last.z - z) > 0.001 ||
        Math.abs(last.yaw - yaw) > 0.001;
      if (hasMoved) {
        lastEmitRef.current = now;
        lastSentRef.current = { x, y, z, yaw };
        socket.emit("position-update", {
          roomCode,
          userId: user.id,
          position: [x, y, z],
          yaw,
        });
      }
    }

    if (!sittingChairRef.current) {
      const [px, , pz] = posRef.current;
      const close = CHAIR_POSITIONS.some(({ id, position: [cx, , cz] }) => {
        if (occupiedChairIds.has(id)) return false;
        const dx = px - cx;
        const dz = pz - cz;
        return dx * dx + dz * dz < CHAIR_SNAP_RADIUS_SQ;
      });
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

    const anyMoveKeyHeld =
      keys.w ||
      keys.a ||
      keys.s ||
      keys.d ||
      keys.arrowup ||
      keys.arrowdown ||
      keys.arrowleft ||
      keys.arrowright;
    if (anyMoveKeyHeld !== isMovingRef.current) {
      isMovingRef.current = anyMoveKeyHeld;
      socket?.emit("moving-update", {
        roomCode,
        userId: user.id,
        isMoving: anyMoveKeyHeld,
      });
    }

    if (dx !== 0 || dz !== 0) {
      const nx = x + dx;
      const nz = z + dz;
      let blocked = false;

      for (let i = 0; i < otherParticipants.length; i += 1) {
        const other = otherParticipants[i];
        const otherPos = peerPositions[other.id];
        if (!otherPos) continue;
        const [ox, , oz] = otherPos;
        if (ox === 0 && oz === 0) continue;
        const cdx = nx - ox;
        const cdz = nz - oz;
        if (cdx * cdx + cdz * cdz < COLLISION_RADIUS_SQ) {
          blocked = true;
          break;
        }
      }

      if (!blocked) {
        if (collidesWithFurniture(nx, nz)) {
          const slideX = !collidesWithFurniture(nx, z);
          const slideZ = !collidesWithFurniture(x, nz);
          if (slideX) {
            posRef.current = [nx, y, z];
            setAvatarPosition([nx, y, z]);
          } else if (slideZ) {
            posRef.current = [x, y, nz];
            setAvatarPosition([x, y, nz]);
          }
        } else {
          posRef.current = [nx, y, nz];
          setAvatarPosition([nx, y, nz]);
        }
      }
    }
  });

  // ── Render peers ───────────────────────────────────────────────────────────
  return (
    <>
      {otherParticipants.map((p) => {
        const displayedPos = smoothedPeerPositions[p.id] || peerPositions[p.id];
        if (!displayedPos) return null;
        const [px, py, pz] = displayedPos;
        return (
          <group key={p.id}>
            <AvatarModel
              key={`${p.id}-${p.avatar || "boy"}`}
              position={[px, py, pz]}
              avatarType={p.avatar || "boy"}
              isMoving={peerMoving?.[p.id] || false}
              emote={peerEmotes?.[p.id] || null}
              isSitting={peerSitting?.[p.id] || false}
              yaw={smoothedPeerYaws?.[p.id] ?? peerYaws?.[p.id] ?? 0}
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
