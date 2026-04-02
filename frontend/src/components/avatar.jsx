import { useRoom } from "../components/roomContext";
import { useFrame } from "@react-three/fiber";
import { useRef, useEffect, useMemo } from "react";
import { useParams } from "react-router-dom";
import { useGLTF, useAnimations } from "@react-three/drei";
import { SkeletonUtils } from "three-stdlib";

const COLLISION_RADIUS = 0.8;
const EMIT_INTERVAL = 50;

// Staggered spawn slots
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

function BoyModel({ position, yaw = 0 }) {
  const { scene, animations } = useGLTF("/boy.glb");
  const clone = useMemo(() => SkeletonUtils.clone(scene), [scene]);

  const { actions, names } = useAnimations(animations, clone);

  useEffect(() => {
    console.log("Animations array:", animations);

    if (names.length > 0) {
      console.log("Animation names:", names);

      const first = names[0];
      actions[first]?.reset().fadeIn(0.2).play();
    } else {
      console.log("No animations found in model");
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

export default function Avatar() {
  const { roomCode } = useParams();
  const { participants, peerPositions, socket, keysRef, yawRef, posRef } =
    useRoom();
  const user = JSON.parse(localStorage.getItem("userSession") || "{}");
  const lastEmitRef = useRef(0);

  useEffect(() => {
    const myIndex = participants.findIndex((p) => p.id === user.id);
    const slot = SPAWN_SLOTS[myIndex % SPAWN_SLOTS.length] ?? SPAWN_SLOTS[0];

    posRef.current = slot;
    yawRef.current = Math.PI / 2;

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

      if (!blocked) posRef.current = [nx, y, nz];
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

          return <BoyModel key={p.id} position={[px, py, pz]} />;
        })}
    </>
  );
}
