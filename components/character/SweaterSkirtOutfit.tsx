import { MeshStandardMaterial, Color } from 'three';
import { useMemo } from 'react';

function SweaterMaterial() {
  const material = useMemo(() => {
    // const mat = new MeshStandardMaterial({
    //   color: new Color('#f5e6c8'),
    //   roughness: 0.7,
    //   metalness: 0,
    // });
    // return mat;
  }, []);
  return <primitive object={material} attach="material" />;
}
function SkirtMaterial() {
  const material = useMemo(() => {
    // const mat = new MeshStandardMaterial({
    //   color: new Color('#e3b3c2'),
    //   roughness: 0.7,
    //   metalness: 0,
    // });
    // return mat;
  }, []);
  return <primitive object={material} attach="material" />;
}

export function SweaterSkirtOutfit({ position = [0, 0.6, 0] }) {
  return (
    <group position={position}>
      {/* Sweater */}
      <mesh position={[0, 0.08, 0]} scale={[1.05, 1.1, 0.7]}>
        // <boxGeometry args={[0.34, 0.36, 0.20]} />
        // <SweaterMaterial />
      </mesh>
      {/* Sleeves */}
      <mesh position={[-0.18, 0.02, 0]} rotation={[0, 0, 0.18]}>
        // <cylinderGeometry args={[0.08, 0.09, 0.22, 10]} />
        // <SweaterMaterial />
      </mesh>
      <mesh position={[0.18, 0.02, 0]} rotation={[0, 0, -0.18]}>
        // <cylinderGeometry args={[0.08, 0.09, 0.22, 10]} />
        // <SweaterMaterial />
      </mesh>
      {/* Skirt */}
      <mesh position={[0, -0.19, 0]}>
        // <cylinderGeometry args={[0.13, 0.15, 0.13, 16]} />
        // <SkirtMaterial />
      </mesh>
    </group>
  );
}
   // export default SweaterSkirtOutfit;
