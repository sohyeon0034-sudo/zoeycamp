import { MeshStandardMaterial, Color } from 'three';
import { useMemo } from 'react';

function SkinMaterial() {
  const material = useMemo(() => {
    const mat = new MeshStandardMaterial({
      color: new Color('#ffe0b0'),
      roughness: 0.6,
      metalness: 0,
    });
    return mat;
  }, []);
  return <primitive object={material} attach="material" />;
}

function BlushMaterial() {
  const material = useMemo(() => {
    const mat = new MeshStandardMaterial({
      color: new Color('#ffb6b6'),
      roughness: 0.7,
      metalness: 0,
    });
    return mat;
  }, []);
  return <primitive object={material} attach="material" />;
}

export function CharacterBodyFace({ position = [0, 0.6, 0] }) {
  return (
    <group position={position}>
      {/* Body (cylinder) */}
         // (archived, do not use)
         // <mesh position={[0, 0.18, 0]} scale={[0.22, 0.22, 0.18]}>
         //   <cylinderGeometry args={[0.5, 0.5, 0.38, 16]} />
         //   <SkinMaterial />
         // </mesh>
         // <mesh position={[0, 0.48, 0]} scale={[0.26, 0.26, 0.22]}>
         //   <sphereGeometry args={[0.5, 16, 12]} />
         //   <SkinMaterial />
         // </mesh>
         // <mesh position={[-0.23, 0.23, 0]} rotation={[0, 0, 0.2]}>
         //   <cylinderGeometry args={[0.07, 0.08, 0.26, 10]} />
         //   <SkinMaterial />
         // </mesh>
         // <mesh position={[0.23, 0.23, 0]} rotation={[0, 0, -0.2]}>
         //   <cylinderGeometry args={[0.07, 0.08, 0.26, 10]} />
         //   <SkinMaterial />
         // </mesh>
         // <mesh position={[-0.08, -0.04, 0]}>
         //   <cylinderGeometry args={[0.09, 0.09, 0.19, 10]} />
         //   <SkinMaterial />
         // </mesh>
         // <mesh position={[0.08, -0.04, 0]}>
         //   <cylinderGeometry args={[0.09, 0.09, 0.19, 10]} />
         //   <SkinMaterial />
         // </mesh>
         // <mesh position={[-0.06, 0.54, 0.22]} scale={[0.18, 0.18, 0.18]}>
         //   <sphereGeometry args={[0.08, 8, 8]} />
         //   <meshStandardMaterial color="#222" />
         // </mesh>
         // <mesh position={[0.06, 0.54, 0.22]} scale={[0.18, 0.18, 0.18]}>
         //   <sphereGeometry args={[0.08, 8, 8]} />
         //   <meshStandardMaterial color="#222" />
         // </mesh>
         // <mesh position={[-0.11, 0.51, 0.21]} scale={[0.09, 0.04, 0.04]}>
         //   <sphereGeometry args={[0.12, 8, 8]} />
         //   <BlushMaterial />
         // </mesh>
         // <mesh position={[0.11, 0.51, 0.21]} scale={[0.09, 0.04, 0.04]}>
         //   <sphereGeometry args={[0.12, 8, 8]} />
         //   <BlushMaterial />
         // </mesh>
         // <mesh position={[0, 0.49, 0.23]} rotation={[Math.PI / 2, 0, 0]}>
         //   <torusGeometry args={[0.04, 0.012, 6, 12, Math.PI / 1.2]} />
         //   <meshStandardMaterial color="#a66" />
         // </mesh>
    </group>
  );
}
export default CharacterBodyFace;
