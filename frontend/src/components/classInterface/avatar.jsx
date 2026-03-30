export default function Avatar({ position = [0, 0, 0] }) {
  return (
    <mesh position={position}>
      <boxGeometry args={[0.5, 1.8, 0.5]} />
      <meshStandardMaterial color="skyblue" />
    </mesh>
  );
}
