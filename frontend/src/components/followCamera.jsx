import { useFrame, useThree } from "@react-three/fiber";
import { useEffect } from "react";
import { useRoom } from "./roomContext";
import * as THREE from "three";

const MOUSE_SENSITIVITY = 0.002;
const KEY_TURN_SPEED = 2.0;
const CAM_HEIGHT = 1.6;

export default function FollowCamera() {
  const { posRef, keysRef, yawRef } = useRoom();
  const { camera, gl } = useThree();

  useEffect(() => {
    const canvas = gl.domElement;

    // Mouse-look only works when pointer is locked
    const onMouseMove = (e) => {
      if (document.pointerLockElement === canvas) {
        yawRef.current -= e.movementX * MOUSE_SENSITIVITY;
      }
    };

    // Click canvas → request pointer lock for mouse-look
    const onCanvasClick = () => {
      if (document.pointerLockElement !== canvas) {
        canvas.requestPointerLock();
      }
    };

    // KEY FIX: listen on `document` not `window`.
    // When pointer lock is active, key events dispatch on document.
    // Window listeners miss them entirely.
    const onKeyDown = (e) => {
      const tag = document.activeElement?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return;
      keysRef.current[e.key.toLowerCase()] = true;
    };
    const onKeyUp = (e) => {
      keysRef.current[e.key.toLowerCase()] = false;
    };

    // Set tabIndex imperatively — NOT as a prop on <Canvas> (R3F overrides it).
    // This makes the canvas focusable so it receives key events directly.
    canvas.tabIndex = 0;
    canvas.style.outline = "none";
    canvas.focus();

    canvas.addEventListener("click", onCanvasClick);
    document.addEventListener("mousemove", onMouseMove);
    // Listen on canvas directly — fires when canvas has focus,
    // AND fires when pointer lock is active (pointer lock routes to document
    // which bubbles down to canvas listeners too).
    canvas.addEventListener("keydown", onKeyDown);
    canvas.addEventListener("keyup", onKeyUp);

    return () => {
      canvas.removeEventListener("click", onCanvasClick);
      document.removeEventListener("mousemove", onMouseMove);
      canvas.removeEventListener("keydown", onKeyDown);
      canvas.removeEventListener("keyup", onKeyUp);
    };
  }, [gl, yawRef, keysRef]);

  useFrame((_, delta) => {
    const keys = keysRef.current;
    if (keys["q"]) yawRef.current += KEY_TURN_SPEED * delta;
    if (keys["e"]) yawRef.current -= KEY_TURN_SPEED * delta;

    const [x, , z] = posRef.current;
    camera.position.set(x, CAM_HEIGHT, z);

    const dir = new THREE.Vector3(
      Math.sin(yawRef.current),
      0,
      -Math.cos(yawRef.current),
    );
    camera.lookAt(x + dir.x, CAM_HEIGHT, z + dir.z);
  });

  return null;
}
