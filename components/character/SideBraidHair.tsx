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
      {/* ㄱ-shaped bang connected to hairline */}
      <group position={[0.0, 0.21, 0.19]} rotation={[0.1, 0, 0.02]}>
        {/* Root blob to fuse with hair cap */}
        <mesh position={[-0.08, 0.03, -0.02]}>
          <sphereGeometry args={[0.05, 12, 10]} />
          <SideBraidHairMaterial />
        </mesh>
        {/* Top horizontal stroke */}
        <mesh position={[0.0, 0.03, 0.02]}>
          <boxGeometry args={[0.24, 0.035, 0.06]} />
          <SideBraidHairMaterial />
        </mesh>
        {/* Rounded corner */}
        <mesh position={[0.1, -0.01, 0.04]}>
          <sphereGeometry args={[0.03, 12, 10]} />
          <SideBraidHairMaterial />
        </mesh>
        {/* Vertical stroke */}
        <mesh position={[0.11, -0.09, 0.04]}>
          <boxGeometry args={[0.04, 0.18, 0.06]} />
          <SideBraidHairMaterial />
        </mesh>
      </group>
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
