import { useFrame, useThree } from "@react-three/fiber";
import { useEffect, useRef } from "react";
import { useRoom } from "./roomContext";
import * as THREE from "three";

const MOUSE_SENSITIVITY = 0.002;
const KEY_TURN_SPEED = 2.0;
const EYE_HEIGHT = 1.6;

function applyLookDelta(e, yawRef, pitchRef) {
  yawRef.current += e.movementX * MOUSE_SENSITIVITY;
  pitchRef.current -= e.movementY * MOUSE_SENSITIVITY;
  const maxPitch = Math.PI / 3;
  pitchRef.current = Math.max(-maxPitch, Math.min(maxPitch, pitchRef.current));
}

export default function FollowCamera() {
  const { posRef, keysRef, yawRef, pitchRef } = useRoom();
  const { camera, gl } = useThree();
  const lookDragRef = useRef(false);

  useEffect(() => {
    const canvas = gl.domElement;

    const onMouseMove = (e) => {
      const pointerLocked = document.pointerLockElement === canvas;
      if (!pointerLocked && !lookDragRef.current) return;
      applyLookDelta(e, yawRef, pitchRef);
    };

    const onPointerDown = (e) => {
      if (e.button !== 0) return;
      lookDragRef.current = true;
      if (typeof canvas.setPointerCapture === "function") {
        canvas.setPointerCapture(e.pointerId);
      }
    };

    const endLookDrag = (e) => {
      lookDragRef.current = false;
      if (e && typeof canvas.releasePointerCapture === "function") {
        try {
          canvas.releasePointerCapture(e.pointerId);
        } catch {
          /* not the capturing element */
        }
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
      const tag = document.activeElement?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return;
      keysRef.current[e.key.toLowerCase()] = false;
    };

    canvas.tabIndex = 0;
    canvas.style.outline = "none";
    canvas.focus();

    canvas.addEventListener("click", onCanvasClick);
    canvas.addEventListener("pointerdown", onPointerDown);
    window.addEventListener("pointerup", endLookDrag);
    window.addEventListener("pointercancel", endLookDrag);
    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("keydown", onKeyDown); // 👈 window instead of canvas
    window.addEventListener("keyup", onKeyUp); // 👈 window instead of canvas

    return () => {
      canvas.removeEventListener("click", onCanvasClick);
      canvas.removeEventListener("pointerdown", onPointerDown);
      window.removeEventListener("pointerup", endLookDrag);
      window.removeEventListener("pointercancel", endLookDrag);
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
    };
  }, [gl, yawRef, pitchRef, keysRef]);
  
  useFrame((_, delta) => {
    const keys = keysRef.current;
    if (keys["q"]) yawRef.current -= KEY_TURN_SPEED * delta;
    if (keys["e"]) yawRef.current += KEY_TURN_SPEED * delta;

    const [x, , z] = posRef.current;
    camera.position.set(x, EYE_HEIGHT, z);

    const dir = new THREE.Vector3(
      Math.sin(yawRef.current) * Math.cos(pitchRef.current),
      Math.sin(pitchRef.current),
      -Math.cos(yawRef.current) * Math.cos(pitchRef.current),
    );
    camera.lookAt(x + dir.x, EYE_HEIGHT + dir.y, z + dir.z);
  });

  return null;
}
