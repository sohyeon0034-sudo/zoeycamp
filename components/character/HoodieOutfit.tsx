import { MeshStandardMaterial, Color } from 'three';
import { useMemo } from 'react';

function HoodieMaterial() {
  const material = useMemo(() => {
    const mat = new MeshStandardMaterial({
      color: new Color('#b0c4de'),
      roughness: 0.7,
      metalness: 0,
    });
    return mat;
  }, []);
  return <primitive object={material} attach="material" />;
}

export function HoodieOutfit({ position = [0, 0.6, 0] }) {
  return (
    <group position={position}>
      {/* Main hoodie body */}
      <mesh position={[0, 0, 0]} scale={[1.08, 1.15, 0.7]}>
        <boxGeometry args={[0.38, 0.44, 0.22]} />
        <HoodieMaterial />
      </mesh>
      {/* Sleeves */}
      <mesh position={[-0.22, -0.04, 0]} rotation={[0, 0, 0.2]}>
        <cylinderGeometry args={[0.09, 0.10, 0.28, 10]} />
        <HoodieMaterial />
      </mesh>
      <mesh position={[0.22, -0.04, 0]} rotation={[0, 0, -0.2]}>
        <cylinderGeometry args={[0.09, 0.10, 0.28, 10]} />
        <HoodieMaterial />
      </mesh>
      {/* Hood */}
      <mesh position={[0, 0.22, -0.09]}>
        <sphereGeometry args={[0.17, 12, 10, 0, Math.PI]} />
        <HoodieMaterial />
      </mesh>
      {/* Hem curve (bottom) */}
      <mesh position={[0, -0.23, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[0.19, 0.03, 8, 16, Math.PI]} />
        <HoodieMaterial />
      </mesh>
    </group>
  );
}
export default HoodieOutfit;
