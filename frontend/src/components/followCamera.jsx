import { useFrame, useThree } from "@react-three/fiber";
import { useEffect } from "react";
import { useRoom } from "./roomContext";
import * as THREE from "three";

const MOUSE_SENSITIVITY = 0.002;
const KEY_TURN_SPEED = 2.0;
const EYE_HEIGHT = 1.6;

export default function FollowCamera() {
  const { posRef, keysRef, yawRef, pitchRef } = useRoom();
  const { camera, gl } = useThree();

  useEffect(() => {
    const canvas = gl.domElement;

    const onMouseMove = (e) => {
      if (document.pointerLockElement === canvas) {
        yawRef.current += e.movementX * MOUSE_SENSITIVITY;

        pitchRef.current -= e.movementY * MOUSE_SENSITIVITY;

        const maxPitch = Math.PI / 3;
        pitchRef.current = Math.max(
          -maxPitch,
          Math.min(maxPitch, pitchRef.current),
        );
      }
    };

    const onCanvasClick = () => {
      if (document.pointerLockElement !== canvas) {
        canvas.requestPointerLock();
      }
    };

    const onKeyDown = (e) => {
      const tag = document.activeElement?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return;
      keysRef.current[e.key.toLowerCase()] = true;
    };

    const onKeyUp = (e) => {
      keysRef.current[e.key.toLowerCase()] = false;
    };

    canvas.tabIndex = 0;
    canvas.style.outline = "none";
    canvas.focus();

    canvas.addEventListener("click", onCanvasClick);
    document.addEventListener("mousemove", onMouseMove);
    canvas.addEventListener("keydown", onKeyDown);
    canvas.addEventListener("keyup", onKeyUp);

    return () => {
      canvas.removeEventListener("click", onCanvasClick);
      document.removeEventListener("mousemove", onMouseMove);
      canvas.removeEventListener("keydown", onKeyDown);
      canvas.removeEventListener("keyup", onKeyUp);
    };
  }, [gl, yawRef, pitchRef, keysRef]);

  useFrame((_, delta) => {
    const keys = keysRef.current;

    if (keys["q"]) yawRef.current -= KEY_TURN_SPEED * delta;
    if (keys["e"]) yawRef.current += KEY_TURN_SPEED * delta;

    const [x, , z] = posRef.current;

    // First-person camera: at player eye level
    camera.position.set(x, EYE_HEIGHT, z);

    // Look direction based on yaw and pitch
    const dir = new THREE.Vector3(
      Math.sin(yawRef.current) * Math.cos(pitchRef.current),
      Math.sin(pitchRef.current),
      -Math.cos(yawRef.current) * Math.cos(pitchRef.current),
    );

    camera.lookAt(x + dir.x, EYE_HEIGHT + dir.y, z + dir.z);
  });

  return null;
}
