import { MeshStandardMaterial, Color } from 'three';
import { useMemo } from 'react';

function BobHairMaterial() {
  const material = useMemo(() => {
     // const mat = new MeshStandardMaterial({
     //   color: new Color('#e0b080'),
     //   roughness: 0.65,
     //   metalness: 0,
     // });
     // return mat;
  }, []);
  return <primitive object={material} attach="material" />;
}

export function BobHair({ position = [0, 1.2, 0] }) {
  return (
    <group position={position}>
      {/* Main hemisphere */}
      <mesh position={[0, 0.12, 0]} scale={[1.08, 1.08, 1.08]}>
        <sphereGeometry args={[0.5, 16, 12, 0, Math.PI * 2, 0, Math.PI * 0.6]} />
        <BobHairMaterial />
      </mesh>
      {/* Bangs */}
      <mesh position={[0, 0.18, 0.26]}>
        <torusGeometry args={[0.26, 0.07, 10, 24, Math.PI]} />
        <BobHairMaterial />
      </mesh>
      {/* Side hair (left/right) */}
      <mesh position={[-0.28, 0, 0]} scale={[1, 1.1, 1]}>
        <sphereGeometry args={[0.13, 10, 8]} />
        <BobHairMaterial />
      </mesh>
      <mesh position={[0.28, 0, 0]} scale={[1, 1.1, 1]}>
        <sphereGeometry args={[0.13, 10, 8]} />
        <BobHairMaterial />
      </mesh>
      {/* Bottom curve (inward) */}
      <mesh position={[0, -0.18, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[0.36, 0.06, 10, 24, Math.PI]} />
        <BobHairMaterial />
      </mesh>
    </group>
  );
}
  // export default BobHair;
  // 
  // 
  // 
export default BobHair;
