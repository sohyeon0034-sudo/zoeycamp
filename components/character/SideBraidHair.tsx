import { MeshStandardMaterial, Color } from 'three';
import { useMemo } from 'react';

function SideBraidHairMaterial() {
  const material = useMemo(() => {
    const mat = new MeshStandardMaterial({
      color: new Color('#e0b080'),
      roughness: 0.7,
      metalness: 0,
    });
    return mat;
  }, []);
  return <primitive object={material} attach="material" />;
}

export function SideBraidHair({ position = [0, 1.2, 0] }) {
  return (
    <group position={position}>
      {/* Top hair cap */}
      <mesh position={[0, 0.13, 0]} scale={[1.08, 1.08, 1.08]}>
        <sphereGeometry args={[0.5, 16, 12, 0, Math.PI * 2, 0, Math.PI * 0.6]} />
        <SideBraidHairMaterial />
      </mesh>
      {/* Bangs */}
      <mesh position={[0, 0.18, 0.26]}>
        <torusGeometry args={[0.22, 0.07, 10, 20, Math.PI]} />
        <SideBraidHairMaterial />
      </mesh>
      {/* Side braid: 4-5 segments */}
      <mesh position={[0.32, -0.05, 0.05]} rotation={[0.2, 0, 0.1]}>
        <sphereGeometry args={[0.11, 10, 8]} />
        <SideBraidHairMaterial />
      </mesh>
      <mesh position={[0.36, -0.17, 0.07]} rotation={[0.2, 0, 0.1]}>
        <sphereGeometry args={[0.10, 10, 8]} />
        <SideBraidHairMaterial />
      </mesh>
      <mesh position={[0.39, -0.27, 0.09]} rotation={[0.2, 0, 0.1]}>
        <sphereGeometry args={[0.09, 10, 8]} />
        <SideBraidHairMaterial />
      </mesh>
      <mesh position={[0.41, -0.36, 0.11]} rotation={[0.2, 0, 0.1]}>
        <sphereGeometry args={[0.08, 10, 8]} />
        <SideBraidHairMaterial />
      </mesh>
    </group>
  );
}
export default SideBraidHair;
