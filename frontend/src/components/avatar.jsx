import { useRoom } from "../components/roomContext";
import { useFrame } from "@react-three/fiber";
import { useRef, useEffect } from "react";
import { useParams } from "react-router-dom";

const COLLISION_RADIUS = 0.8;
const EMIT_INTERVAL = 50; // ms — 20x per second

export default function Avatar() {
  const { roomCode } = useParams();
  const { participants, peerPositions, socket, keysRef, yawRef, posRef } =
    useRoom();

  const user = JSON.parse(localStorage.getItem("userSession") || "{}");
  const lastEmitRef = useRef(0);

  // Broadcast our starting position immediately so peers don't see us at 0,0,0
  useEffect(() => {
    if (socket && roomCode) {
      socket.emit("position-update", {
        roomCode,
        userId: user.id,
        position: posRef.current,
      });
    }
  }, [socket, roomCode]);

  useFrame((_, delta) => {
    const speed = 5;
    const keys = keysRef.current;
    const [x, y, z] = posRef.current;

    const yaw = yawRef.current;
    let dx = 0;
    let dz = 0;

    const forwardX = Math.sin(yaw);
    const forwardZ = -Math.cos(yaw);

    const rightX = Math.cos(yaw);
    const rightZ = Math.sin(yaw);

    if (keys["w"] || keys["arrowup"]) {
      dx += forwardX * speed * delta;
      dz += forwardZ * speed * delta;
    }
    if (keys["s"] || keys["arrowdown"]) {
      dx -= forwardX * speed * delta;
      dz -= forwardZ * speed * delta;
    }
    if (keys["a"] || keys["arrowleft"]) {
      dx -= rightX * speed * delta;
      dz -= rightZ * speed * delta;
    }
    if (keys["d"] || keys["arrowright"]) {
      dx += rightX * speed * delta;
      dz += rightZ * speed * delta;
    }

    if (dx !== 0 || dz !== 0) {
      const nx = x + dx;
      const nz = z + dz;

      const others = participants.filter((p) => p.id !== user.id);
      let blocked = false;
      for (const other of others) {
        // Skip peers whose position we haven't received yet
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
      }
    }

    // Throttled position emit
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
      {/* Render other participants' avatars */}
      {participants
        .filter((p) => p.id !== user.id)
        .map((p) => {
          // Don't render until we have a real position for this peer
          if (!peerPositions[p.id]) return null;
          const [px, , pz] = peerPositions[p.id];
          return (
            <group key={p.id} position={[px, 0, pz]}>
              {/* Body */}
              <mesh position={[0, 0.8, 0]}>
                <boxGeometry args={[0.6, 1.2, 0.3]} />
                <meshStandardMaterial color="#64748b" />
              </mesh>
              {/* Head */}
              <mesh position={[0, 1.7, 0]}>
                <boxGeometry args={[0.4, 0.4, 0.4]} />
                <meshStandardMaterial color="#94a3b8" />
              </mesh>
            </group>
          );
        })}
    </>
  );
}
