import { useRoom } from "../components/roomContext";

export default function Avatar() {
  const { participants } = useRoom();
  const user = JSON.parse(localStorage.getItem("userSession") || "{}");

  return (
    <>
      {participants.map((p, i) => (
        <group key={p.id} position={[i * 2 - (participants.length - 1), 0, 0]}>
          {/* Body */}
          <mesh position={[0, 0.8, 0]}>
            <boxGeometry args={[0.6, 1.2, 0.3]} />
            <meshStandardMaterial
              color={p.id === user.id ? "#3b82f6" : "#64748b"}
            />
          </mesh>
          {/* Head */}
          <mesh position={[0, 1.7, 0]}>
            <boxGeometry args={[0.4, 0.4, 0.4]} />
            <meshStandardMaterial
              color={p.id === user.id ? "#60a5fa" : "#94a3b8"}
            />
          </mesh>
        </group>
      ))}
    </>
  );
}
