import { MeshStandardMaterial, Color } from 'three';
import { useMemo } from 'react';

function TwinTailsHairMaterial() {
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

export function TwinTailsHair({ position = [0, 1.2, 0] }) {
  return (
    <group position={position}>
      {/* Top hair cap */}
      <mesh position={[0, 0.13, 0]} scale={[1.08, 1.08, 1.08]}>
        <sphereGeometry args={[0.5, 16, 12, 0, Math.PI * 2, 0, Math.PI * 0.6]} />
        <TwinTailsHairMaterial />
      </mesh>
      {/* Bangs */}
      <mesh position={[0, 0.18, 0.26]}>
        <torusGeometry args={[0.22, 0.07, 10, 20, Math.PI]} />
        <TwinTailsHairMaterial />
      </mesh>
      {/* Left twin tail */}
      <mesh position={[-0.32, -0.08, 0]} rotation={[0, 0, 0.2]}>
        <cylinderGeometry args={[0.11, 0.13, 0.38, 10]} />
        <TwinTailsHairMaterial />
      </mesh>
      {/* Right twin tail */}
      <mesh position={[0.32, -0.08, 0]} rotation={[0, 0, -0.2]}>
        <cylinderGeometry args={[0.11, 0.13, 0.38, 10]} />
        <TwinTailsHairMaterial />
      </mesh>
    </group>
  );
}
export default TwinTailsHair;
