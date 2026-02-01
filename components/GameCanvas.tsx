import React, { useRef, useState, useEffect, useMemo, useCallback } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { useKeyboardControls, KeyboardControls, Cloud, Stars, OrbitControls, useCursor, Billboard, Grid, Text, RoundedBox } from '@react-three/drei';
import * as THREE from 'three';
import { GameState, WeatherType, TimeOfDay, GameItem, PetState, AvatarState, ItemCategory, FloorType } from '../types';
import { generatePetThought } from '../services/geminiService';
import { DoorOpen } from 'lucide-react'; 

// --- Constants ---
const MOVEMENT_SPEED = 4;
const ISLAND_RADIUS = 22;
const TENT_POSITION = new THREE.Vector3(4, 0, -4);

const GREETINGS = ["Hi!", "Hello!", "Hey there!", "Yo!", "Nice day!", "Campsite looks great!", "Anyone have snacks?", "Relaxing...", "Good vibes only"];

// --- Texture/Pattern Generation Helpers ---
const createPatternTexture = (type: string) => {
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 512;
    const ctx = canvas.getContext('2d')!;
    
    if (type === 'DOTS') {
        ctx.fillStyle = '#111';
        ctx.fillRect(0, 0, 512, 512);
        ctx.fillStyle = 'white';
        for(let i=0; i<20; i++) {
            for(let j=0; j<20; j++) {
                ctx.beginPath();
                ctx.arc(i*30, j*30, 8, 0, Math.PI*2);
                ctx.fill();
            }
        }
    } else if (type === 'HEARTS') {
        ctx.fillStyle = '#ff9ff3';
        ctx.fillRect(0, 0, 512, 512);
        ctx.fillStyle = 'white';
        ctx.font = '40px Arial';
        for(let i=0; i<15; i++) {
            for(let j=0; j<15; j++) {
               ctx.fillText('♥', i*40, j*40);
            }
        }
    } else if (type === 'RAINBOW') {
        const grd = ctx.createLinearGradient(0, 0, 512, 512);
        grd.addColorStop(0, "red");
        grd.addColorStop(0.2, "orange");
        grd.addColorStop(0.4, "yellow");
        grd.addColorStop(0.6, "green");
        grd.addColorStop(0.8, "blue");
        grd.addColorStop(1, "purple");
        ctx.fillStyle = grd;
        ctx.fillRect(0, 0, 512, 512);
    } else {
        // Default Orange
        ctx.fillStyle = '#e67e22';
        ctx.fillRect(0, 0, 512, 512);
    }
    
    const tex = new THREE.CanvasTexture(canvas);
    tex.wrapS = THREE.RepeatWrapping;
    tex.wrapT = THREE.RepeatWrapping;
    return tex;
}

// --- Environmental Effects ---
const Rain = ({ count = 300 }) => {
  const meshRef = useRef<THREE.InstancedMesh>(null);
  const dummy = useMemo(() => new THREE.Object3D(), []);
  const particles = useMemo(() => {
    const temp = [];
    for (let i = 0; i < count; i++) {
      const speed = 0.5 + Math.random();
      const x = (Math.random() - 0.5) * 50;
      const z = (Math.random() - 0.5) * 50;
      const y = Math.random() * 40;
      temp.push({ speed, x, z, y });
    }
    return temp;
  }, [count]);

  useFrame((_, delta) => {
    if (!meshRef.current) return;
    particles.forEach((particle, i) => {
      particle.y -= particle.speed * 20 * delta;
      if (particle.y < 0) {
        particle.y = 30 + Math.random() * 10;
        particle.x = (Math.random() - 0.5) * 50; 
        particle.z = (Math.random() - 0.5) * 50;
      }
      dummy.position.set(particle.x, particle.y, particle.z);
      dummy.scale.set(0.05, 0.8, 0.05);
      dummy.updateMatrix();
      meshRef.current!.setMatrixAt(i, dummy.matrix);
    });
    meshRef.current.instanceMatrix.needsUpdate = true;
  });

  return (
    <instancedMesh ref={meshRef} args={[undefined, undefined, count]}>
      <boxGeometry args={[1, 1, 1]} />
      <meshBasicMaterial color="#a4b0be" transparent opacity={0.6} />
    </instancedMesh>
  );
};

const Snow = ({ count = 400 }) => {
  const meshRef = useRef<THREE.InstancedMesh>(null);
  const dummy = useMemo(() => new THREE.Object3D(), []);
  const particles = useMemo(() => {
    const temp = [];
    for (let i = 0; i < count; i++) {
      const speed = 0.05 + Math.random() * 0.1;
      const x = (Math.random() - 0.5) * 50;
      const z = (Math.random() - 0.5) * 50;
      const y = Math.random() * 40;
      const sway = Math.random() * Math.PI;
      temp.push({ speed, x, z, y, sway });
    }
    return temp;
  }, [count]);

  useFrame((state, delta) => {
    if (!meshRef.current) return;
    const t = state.clock.elapsedTime;
    particles.forEach((particle, i) => {
      particle.y -= particle.speed * 10 * delta;
      // Swaying motion
      particle.x += Math.sin(t + particle.sway) * 0.02;
      particle.z += Math.cos(t + particle.sway) * 0.02;

      if (particle.y < 0) {
        particle.y = 30 + Math.random() * 10;
        particle.x = (Math.random() - 0.5) * 50; 
        particle.z = (Math.random() - 0.5) * 50;
      }
      dummy.position.set(particle.x, particle.y, particle.z);
      // Small randomized scale for snowflakes
      const s = 0.1 + Math.random() * 0.1;
      dummy.scale.set(s, s, s);
      dummy.updateMatrix();
      meshRef.current!.setMatrixAt(i, dummy.matrix);
    });
    meshRef.current.instanceMatrix.needsUpdate = true;
  });

  return (
    <instancedMesh ref={meshRef} args={[undefined, undefined, count]}>
      <sphereGeometry args={[1, 6, 6]} />
      <meshBasicMaterial color="#ffffff" transparent opacity={0.8} />
    </instancedMesh>
  );
};

// --- Trees ---
const Tree = ({ type }: { type: number }) => {
    return (
        <group>
            <mesh position={[0, 0.5, 0]} castShadow>
                <cylinderGeometry args={[0.2, 0.3, 1]} />
                <meshStandardMaterial color="#5d4037" />
            </mesh>
            <group position={[0, 1, 0]}>
                {type === 0 && ( // Pine
                    <group>
                        <mesh position={[0, 0.5, 0]}><coneGeometry args={[1.2, 1.5, 8]} /><meshStandardMaterial color="#2d6a4f" /></mesh>
                        <mesh position={[0, 1.2, 0]}><coneGeometry args={[1, 1.5, 8]} /><meshStandardMaterial color="#2d6a4f" /></mesh>
                        <mesh position={[0, 1.9, 0]}><coneGeometry args={[0.8, 1.5, 8]} /><meshStandardMaterial color="#2d6a4f" /></mesh>
                    </group>
                )}
                {type === 1 && ( // Zelkova (Neuti)
                    <group position={[0, 1, 0]}>
                        <mesh><sphereGeometry args={[1.5, 16, 16]} /><meshStandardMaterial color="#40916c" /></mesh>
                        <mesh position={[0.8, -0.2, 0]}><sphereGeometry args={[1, 16, 16]} /><meshStandardMaterial color="#40916c" /></mesh>
                        <mesh position={[-0.8, -0.2, 0]}><sphereGeometry args={[1, 16, 16]} /><meshStandardMaterial color="#40916c" /></mesh>
                    </group>
                )}
                {type === 2 && ( // Round
                    <mesh position={[0, 1, 0]}><sphereGeometry args={[1.3, 16, 16]} /><meshStandardMaterial color="#74c69d" /></mesh>
                )}
                {type === 3 && ( // Birch/Angular
                    <group>
                        <mesh position={[0, -0.5, 0]}><cylinderGeometry args={[0.15, 0.2, 1.2]} /><meshStandardMaterial color="#ecf0f1" /></mesh>
                        <mesh position={[0, 0.8, 0]}><icosahedronGeometry args={[1.2, 0]} /><meshStandardMaterial color="#52b788" flatShading /></mesh>
                    </group>
                )}
            </group>
        </group>
    )
}

// --- Distinct Items ---
const Campfire = () => ( <group> <mesh position={[0.2, 0.1, 0.2]} rotation={[0, 0, 0.4]}><cylinderGeometry args={[0.08, 0.08, 0.8]} /><meshStandardMaterial color="#5d4037" /></mesh> <mesh position={[-0.2, 0.1, -0.2]} rotation={[0, 0, -0.4]}><cylinderGeometry args={[0.08, 0.08, 0.8]} /><meshStandardMaterial color="#5d4037" /></mesh> <mesh position={[0.2, 0.1, -0.2]} rotation={[0.4, 0, 1.57]}><cylinderGeometry args={[0.08, 0.08, 0.8]} /><meshStandardMaterial color="#5d4037" /></mesh> <mesh position={[-0.2, 0.1, 0.2]} rotation={[-0.4, 0, 1.57]}><cylinderGeometry args={[0.08, 0.08, 0.8]} /><meshStandardMaterial color="#5d4037" /></mesh> <mesh position={[0, 0.4, 0]}><coneGeometry args={[0.25, 0.5, 8]} /><meshBasicMaterial color="#ff7043" /></mesh> <mesh position={[0, 0.3, 0]} rotation={[0,1,0]}><coneGeometry args={[0.3, 0.4, 8]} /><meshBasicMaterial color="#ffcc80" transparent opacity={0.8} /></mesh> <pointLight position={[0, 0.5, 0]} intensity={2} distance={5} color="#ffab91" decay={2} /> </group> );
const CookingPot = () => ( <group> <mesh position={[0, 0.25, 0]}><cylinderGeometry args={[0.25, 0.2, 0.4]} /><meshStandardMaterial color="#37474f" /></mesh> <mesh position={[0, 0.45, 0]}><cylinderGeometry args={[0.26, 0.26, 0.05]} /><meshStandardMaterial color="#455a64" /></mesh> <mesh position={[0, 0.4, 0]} rotation={[-Math.PI/2, 0, 0]}><circleGeometry args={[0.22]} /><meshStandardMaterial color="#d84315" /></mesh> </group> );
const CoffeePot = () => ( <group> <mesh position={[0, 0.2, 0]}><cylinderGeometry args={[0.15, 0.2, 0.4]} /><meshStandardMaterial color="#eceff1" /></mesh> <mesh position={[0.15, 0.3, 0]} rotation={[0,0,-Math.PI/2]}><torusGeometry args={[0.08, 0.02, 8, 16, Math.PI]} /><meshStandardMaterial color="#37474f" /></mesh> <mesh position={[-0.15, 0.35, 0]} rotation={[0,0,0.5]}><cylinderGeometry args={[0.03, 0.02, 0.15]} /><meshStandardMaterial color="#eceff1" /></mesh> </group> );
const Marshmallow = () => ( 
    <group> 
        <mesh position={[0, 0.2, 0]} rotation={[0,0,-0.2]}><cylinderGeometry args={[0.02, 0.02, 0.6]} /><meshStandardMaterial color="#d35400" /></mesh>
        <mesh position={[0.05, 0.35, 0]} rotation={[0,0,-0.2]}><cylinderGeometry args={[0.08, 0.08, 0.12]} /><meshStandardMaterial color="#fff" /></mesh> 
        <mesh position={[0.02, 0.25, 0]} rotation={[0,0,-0.2]}><cylinderGeometry args={[0.08, 0.08, 0.12]} /><meshStandardMaterial color="#fff" /></mesh> 
    </group> 
);
const CampingChair = () => ( <group> <mesh position={[0.25, 0.4, 0.25]} rotation={[0, 0, -0.2]}><cylinderGeometry args={[0.03, 0.03, 0.9]} /><meshStandardMaterial color="#555" /></mesh> <mesh position={[-0.25, 0.4, 0.25]} rotation={[0, 0, 0.2]}><cylinderGeometry args={[0.03, 0.03, 0.9]} /><meshStandardMaterial color="#555" /></mesh> <mesh position={[0.25, 0.4, -0.25]} rotation={[0, 0, -0.2]}><cylinderGeometry args={[0.03, 0.03, 0.9]} /><meshStandardMaterial color="#555" /></mesh> <mesh position={[-0.25, 0.4, -0.25]} rotation={[0, 0, 0.2]}><cylinderGeometry args={[0.03, 0.03, 0.9]} /><meshStandardMaterial color="#555" /></mesh> <mesh position={[0, 0.4, 0]} rotation={[-0.1, 0, 0]}><boxGeometry args={[0.6, 0.05, 0.6]} /><meshToonMaterial color="#e17055" /></mesh> <mesh position={[0, 0.8, -0.25]} rotation={[-0.2, 0, 0]}><boxGeometry args={[0.6, 0.5, 0.05]} /><meshToonMaterial color="#e17055" /></mesh> <mesh position={[0.32, 0.6, 0]} rotation={[0, 0, 0]}><boxGeometry args={[0.08, 0.05, 0.6]} /><meshStandardMaterial color="#d63031" /></mesh> <mesh position={[-0.32, 0.6, 0]} rotation={[0, 0, 0]}><boxGeometry args={[0.08, 0.05, 0.6]} /><meshStandardMaterial color="#d63031" /></mesh> </group> );
const CampingTable = () => ( <group> <mesh position={[0, 0.5, 0]}><boxGeometry args={[1.2, 0.08, 0.8]} /><meshStandardMaterial color="#d35400" /></mesh> <mesh position={[0.5, 0.25, 0.3]} rotation={[0, 0, -0.1]}><cylinderGeometry args={[0.04, 0.03, 0.5]} /><meshStandardMaterial color="#b2bec3" /></mesh> <mesh position={[-0.5, 0.25, 0.3]} rotation={[0, 0, 0.1]}><cylinderGeometry args={[0.04, 0.03, 0.5]} /><meshStandardMaterial color="#b2bec3" /></mesh> <mesh position={[0.5, 0.25, -0.3]} rotation={[0, 0, -0.1]}><cylinderGeometry args={[0.04, 0.03, 0.5]} /><meshStandardMaterial color="#b2bec3" /></mesh> <mesh position={[-0.5, 0.25, -0.3]} rotation={[0, 0, 0.1]}><cylinderGeometry args={[0.04, 0.03, 0.5]} /><meshStandardMaterial color="#b2bec3" /></mesh> <mesh position={[0, 0.3, 0]} rotation={[0, 0, 1.57]}><cylinderGeometry args={[0.02, 0.02, 1.0]} /><meshStandardMaterial color="#636e72" /></mesh> </group> );
const CampingLantern = () => ( <group> <mesh position={[0, 0.1, 0]}><cylinderGeometry args={[0.15, 0.18, 0.2]} /><meshStandardMaterial color="#2d3436" /></mesh> <mesh position={[0, 0.35, 0]}><cylinderGeometry args={[0.12, 0.12, 0.3]} /><meshStandardMaterial color="#fff" transparent opacity={0.3} /></mesh> <mesh position={[0, 0.55, 0]}><coneGeometry args={[0.2, 0.15, 16]} /><meshStandardMaterial color="#2d3436" /></mesh> <mesh position={[0, 0.65, 0]} rotation={[0, 0, 1.57]}><torusGeometry args={[0.1, 0.02, 8, 16]} /><meshStandardMaterial color="#000" /></mesh> <pointLight position={[0, 0.35, 0]} intensity={3} color="#ffeaa7" distance={8} decay={2} /> <mesh position={[0, 0.35, 0]}><sphereGeometry args={[0.05]} /><meshBasicMaterial color="#ffeaa7" /></mesh> </group> );
const TeddyBear = () => (<group><mesh position={[0,0.3,0]}><sphereGeometry args={[0.25]}/><meshToonMaterial color="#8d6e63"/></mesh><mesh position={[0,0.6,0]}><sphereGeometry args={[0.2]}/><meshToonMaterial color="#8d6e63"/></mesh><mesh position={[0.18,0.7,0]}><sphereGeometry args={[0.08]}/><meshToonMaterial color="#8d6e63"/></mesh><mesh position={[-0.18,0.7,0]}><sphereGeometry args={[0.08]}/><meshToonMaterial color="#8d6e63"/></mesh><mesh position={[0.2,0.3,0.1]}><sphereGeometry args={[0.1]}/><meshToonMaterial color="#8d6e63"/></mesh><mesh position={[-0.2,0.3,0.1]}><sphereGeometry args={[0.1]}/><meshToonMaterial color="#8d6e63"/></mesh><mesh position={[0.1,0.1,0.2]}><sphereGeometry args={[0.1]}/><meshToonMaterial color="#8d6e63"/></mesh><mesh position={[-0.1,0.1,0.2]}><sphereGeometry args={[0.1]}/><meshToonMaterial color="#8d6e63"/></mesh></group>);
const Pond = () => (<group><mesh rotation={[-Math.PI/2,0,0]} position={[0,0.01,0]}><circleGeometry args={[1.5,32]}/><meshStandardMaterial color="#4fc3f7" roughness={0.1}/></mesh><mesh position={[0.5,0.01,0.5]}><sphereGeometry args={[0.2]}/><meshStandardMaterial color="#95a5a6"/></mesh><mesh position={[-0.8,0.01,-0.2]}><sphereGeometry args={[0.15]}/><meshStandardMaterial color="#7f8c8d"/></mesh></group>);
const BoxItem = () => (<group><mesh position={[0,0.25,0]}><boxGeometry args={[0.6,0.5,0.4]}/><meshStandardMaterial color="#e67e22"/></mesh><mesh position={[0,0.25,0]}><boxGeometry args={[0.62,0.1,0.42]}/><meshStandardMaterial color="#d35400"/></mesh></group>);
const Laptop = () => (<group><mesh position={[0,0.02,0]}><boxGeometry args={[0.5,0.02,0.35]}/><meshStandardMaterial color="#bdc3c7"/></mesh><mesh position={[0,0.25,-0.17]} rotation={[Math.PI/6,0,0]}><boxGeometry args={[0.5,0.4,0.02]}/><meshStandardMaterial color="#bdc3c7"/></mesh><mesh position={[0,0.25,-0.16]} rotation={[Math.PI/6,0,0]}><planeGeometry args={[0.45,0.35]}/><meshBasicMaterial color="#2c3e50"/></mesh></group>);
const FirstAid = () => (<group><mesh position={[0,0.15,0]}><boxGeometry args={[0.4,0.3,0.25]}/><meshStandardMaterial color="white"/></mesh><mesh position={[0,0.15,0.13]}><boxGeometry args={[0.1,0.05,0.01]}/><meshBasicMaterial color="red"/></mesh><mesh position={[0,0.15,0.13]}><boxGeometry args={[0.05,0.1,0.01]}/><meshBasicMaterial color="red"/></mesh></group>);
const BookStack = () => (<group><mesh position={[0,0.05,0]}><boxGeometry args={[0.3,0.1,0.4]}/><meshStandardMaterial color="#e74c3c"/></mesh><mesh position={[0.05,0.15,0]} rotation={[0,0.2,0]}><boxGeometry args={[0.28,0.1,0.38]}/><meshStandardMaterial color="#3498db"/></mesh><mesh position={[-0.02,0.25,0]} rotation={[0,-0.1,0]}><boxGeometry args={[0.25,0.08,0.35]}/><meshStandardMaterial color="#f1c40f"/></mesh></group>);

// --- Radio with Audio and Animation ---
const Radio = () => {
    const [isPlaying, setIsPlaying] = useState(false);
    const audioRef = useRef<HTMLAudioElement | null>(null);
    const particlesRef = useRef<THREE.Group>(null);

    useEffect(() => {
        // Cute relaxing loop (public domain/royalty free style)
        audioRef.current = new Audio("https://cdn.pixabay.com/download/audio/2022/03/10/audio_5b63297a7a.mp3?filename=summer-walk-10497.mp3"); 
        audioRef.current.loop = true;
        audioRef.current.volume = 0.3;
        
        return () => {
            if (audioRef.current) {
                audioRef.current.pause();
                audioRef.current = null;
            }
        }
    }, []);

    const togglePlay = () => {
        if (!audioRef.current) return;
        if (isPlaying) {
            audioRef.current.pause();
        } else {
            audioRef.current.play().catch(e => console.log("Audio autoplay blocked", e));
        }
        setIsPlaying(!isPlaying);
    };

    useFrame((state) => {
        if (isPlaying && particlesRef.current) {
            particlesRef.current.children.forEach((child, i) => {
                const t = state.clock.elapsedTime + i;
                child.position.y = 0.5 + Math.sin(t * 3) * 0.2 + (i * 0.1);
                child.position.x = Math.cos(t * 2) * 0.2;
                child.scale.setScalar(0.5 + Math.sin(t * 5) * 0.2);
            });
        }
    });

    return (
        <group onClick={(e) => { e.stopPropagation(); togglePlay(); }}>
            {/* Body */}
            <mesh position={[0,0.2,0]}><boxGeometry args={[0.5,0.4,0.2]}/><meshStandardMaterial color="#c0392b"/></mesh>
            <mesh position={[0,0.2,0.11]}><circleGeometry args={[0.15]}/><meshStandardMaterial color="#333"/></mesh>
            <mesh position={[0.15,0.45,0]}><cylinderGeometry args={[0.01,0.01,0.5]}/><meshStandardMaterial color="#bdc3c7"/></mesh>
            
            {/* Notes Particles */}
            {isPlaying && (
                <group ref={particlesRef} position={[0, 0.6, 0]}>
                    <Billboard position={[0, 0, 0]}>
                        <Text fontSize={0.2} color="black">♪</Text>
                    </Billboard>
                    <Billboard position={[0.2, 0.2, 0]}>
                        <Text fontSize={0.2} color="black">♫</Text>
                    </Billboard>
                    <Billboard position={[-0.2, 0.1, 0]}>
                        <Text fontSize={0.2} color="black">♩</Text>
                    </Billboard>
                </group>
            )}
        </group>
    );
};

const GameConsole = () => (<group><mesh position={[0,0.05,0]}><boxGeometry args={[0.6,0.1,0.3]}/><meshStandardMaterial color="#2c3e50"/></mesh><mesh position={[-0.25,0.06,0]}><boxGeometry args={[0.08,0.12,0.3]}/><meshStandardMaterial color="#e74c3c"/></mesh><mesh position={[0.25,0.06,0]}><boxGeometry args={[0.08,0.12,0.3]}/><meshStandardMaterial color="#3498db"/></mesh></group>);

// --- New Items ---
const PicnicMat = () => (<mesh position={[0,0.01,0]} rotation={[-Math.PI/2,0,0]}><planeGeometry args={[2, 1.5]} /><meshStandardMaterial color="#dfe6e9" side={THREE.DoubleSide} /><mesh position={[0,0,0.01]}><planeGeometry args={[1.8, 1.3]} /><meshStandardMaterial color="#fab1a0" /></mesh></mesh>);
const OrangeMat = () => (<mesh position={[0,0.01,0]} rotation={[-Math.PI/2,0,0]}><circleGeometry args={[1, 32]} /><meshStandardMaterial color="#e17055" /></mesh>);
const Sunbed = () => (
    <group>
        {/* Frame */}
        <mesh position={[0, 0.2, 0]} rotation={[0.1, 0, 0]}><boxGeometry args={[0.7, 0.1, 1.8]} /><meshStandardMaterial color="#d35400" /></mesh>
        {/* Legs */}
        <mesh position={[0.3, 0.1, 0.7]}><cylinderGeometry args={[0.03, 0.03, 0.2]} /><meshStandardMaterial color="#d35400" /></mesh>
        <mesh position={[-0.3, 0.1, 0.7]}><cylinderGeometry args={[0.03, 0.03, 0.2]} /><meshStandardMaterial color="#d35400" /></mesh>
        <mesh position={[0.3, 0.05, -0.7]}><cylinderGeometry args={[0.03, 0.03, 0.15]} /><meshStandardMaterial color="#d35400" /></mesh>
        <mesh position={[-0.3, 0.05, -0.7]}><cylinderGeometry args={[0.03, 0.03, 0.15]} /><meshStandardMaterial color="#d35400" /></mesh>
        {/* Fabric */}
        <mesh position={[0, 0.26, 0]} rotation={[0.1, 0, 0]}><boxGeometry args={[0.6, 0.05, 1.7]} /><meshStandardMaterial color="white" /></mesh>
        {/* Pillow */}
        <mesh position={[0, 0.35, -0.6]} rotation={[0.2, 0, 0]}><boxGeometry args={[0.5, 0.05, 0.3]} /><meshStandardMaterial color="#74b9ff" /></mesh>
    </group>
);

const Snowman = () => (
    <group>
        {/* Body */}
        <mesh position={[0, 0.4, 0]}><sphereGeometry args={[0.45, 16, 16]} /><meshStandardMaterial color="white" /></mesh>
        <mesh position={[0, 1.0, 0]}><sphereGeometry args={[0.35, 16, 16]} /><meshStandardMaterial color="white" /></mesh>
        
        {/* Buttons (Sky Blue) */}
        <mesh position={[0, 0.5, 0.4]}><sphereGeometry args={[0.05]} /><meshBasicMaterial color="#74b9ff" /></mesh>
        <mesh position={[0, 0.3, 0.43]}><sphereGeometry args={[0.05]} /><meshBasicMaterial color="#74b9ff" /></mesh>

        {/* Eyes */}
        <mesh position={[0.12, 1.1, 0.3]}><sphereGeometry args={[0.03]} /><meshBasicMaterial color="black" /></mesh>
        <mesh position={[-0.12, 1.1, 0.3]}><sphereGeometry args={[0.03]} /><meshBasicMaterial color="black" /></mesh>
        
        {/* Carrot Nose */}
        <mesh position={[0, 1.05, 0.4]} rotation={[1.5, 0, 0]}><coneGeometry args={[0.04, 0.25]} /><meshStandardMaterial color="#e67e22" /></mesh>
        
        {/* Red Scarf */}
        <mesh position={[0, 0.8, 0]}><torusGeometry args={[0.3, 0.08, 8, 16]} rotation={[1.5, 0, 0]} /><meshStandardMaterial color="#e74c3c" /></mesh>
        <mesh position={[0.2, 0.6, 0.2]} rotation={[0.2, 0, -0.2]}><capsuleGeometry args={[0.08, 0.4]} /><meshStandardMaterial color="#e74c3c" /></mesh>

        {/* Arms */}
        <mesh position={[0.4, 0.6, 0]} rotation={[0,0,-0.5]}><cylinderGeometry args={[0.02, 0.02, 0.5]} /><meshStandardMaterial color="#5d4037" /></mesh>
        <mesh position={[-0.4, 0.6, 0]} rotation={[0,0,0.5]}><cylinderGeometry args={[0.02, 0.02, 0.5]} /><meshStandardMaterial color="#5d4037" /></mesh>
    </group>
);
const SnowPile = () => (
    <group>
        <mesh position={[0, 0.1, 0]} scale={[1, 0.4, 1]}><sphereGeometry args={[0.8, 16, 16]} /><meshStandardMaterial color="white" /></mesh>
        <mesh position={[0.5, 0.05, 0.2]} scale={[1, 0.5, 1]}><sphereGeometry args={[0.5, 16, 16]} /><meshStandardMaterial color="white" /></mesh>
        <mesh position={[-0.4, 0.08, -0.3]} scale={[1, 0.4, 1]}><sphereGeometry args={[0.6, 16, 16]} /><meshStandardMaterial color="white" /></mesh>
    </group>
);
const MiniTree = () => (
    <group>
        <mesh position={[0, 0.6, 0]}><coneGeometry args={[0.4, 1.2, 8]} /><meshStandardMaterial color="#2d6a4f" /></mesh>
        <mesh position={[0, 0.9, 0]}><coneGeometry args={[0.3, 0.8, 8]} /><meshStandardMaterial color="#2d6a4f" /></mesh>
        <mesh position={[0, 0.1, 0]}><cylinderGeometry args={[0.1, 0.1, 0.2]} /><meshStandardMaterial color="#5d4037" /></mesh>
        {/* Lights */}
        {[...Array(8)].map((_, i) => (
            <mesh key={i} position={[Math.sin(i)*0.3, 0.3 + i*0.1, Math.cos(i)*0.3]}><sphereGeometry args={[0.04]} /><meshBasicMaterial color={['red', 'gold', 'blue'][i%3]} /></mesh>
        ))}
        <mesh position={[0, 1.3, 0]}><sphereGeometry args={[0.08]} /><meshBasicMaterial color="gold" /></mesh>
    </group>
);
const CoffeeCup = () => (
    <group>
        <mesh position={[0, 0.15, 0]}><cylinderGeometry args={[0.08, 0.06, 0.3]} /><meshStandardMaterial color="white" /></mesh>
        <mesh position={[0, 0.31, 0]}><cylinderGeometry args={[0.085, 0.085, 0.02]} /><meshStandardMaterial color="#333" /></mesh>
        <mesh position={[0, 0.15, 0]}><cylinderGeometry args={[0.082, 0.07, 0.1]} /><meshStandardMaterial color="#a29bfe" /></mesh>
    </group>
);

const ElectricCar = ({ isOpen, onToggle }: { isOpen: boolean, onToggle: () => void }) => {
    return (
        <group onClick={(e) => { e.stopPropagation(); onToggle(); }}>
            {/* Smooth Hatchback Design */}
            
            {/* Main Chassis - Lower */}
            <mesh position={[0, 0.5, 0]}>
                <RoundedBox args={[2.2, 0.7, 3.8]} radius={0.25} smoothness={4}>
                    <meshStandardMaterial color="#a29bfe" roughness={0.3} metalness={0.1} />
                </RoundedBox>
            </mesh>
            
            {/* Cabin Top - Rounded Bubble Style */}
            <mesh position={[0, 1.1, -0.3]}>
                <RoundedBox args={[1.8, 0.7, 2.4]} radius={0.4} smoothness={8}>
                    <meshStandardMaterial color="#a29bfe" roughness={0.3} />
                </RoundedBox>
            </mesh>

            {/* Side Windows - Dark Solid Color */}
            <mesh position={[0, 1.15, -0.35]}>
                <RoundedBox args={[1.82, 0.6, 2.1]} radius={0.35} smoothness={4}>
                    <meshStandardMaterial color="#2d3436" roughness={0.1} />
                </RoundedBox>
            </mesh>

            {/* Front Windshield */}
            <mesh position={[0, 1.0, -1.6]} rotation={[0.5, 0, 0]}>
                <boxGeometry args={[1.7, 0.05, 0.8]} />
                <meshStandardMaterial color="#2d3436" roughness={0.1} />
            </mesh>

            {/* Wheels - Simple Cylinders */}
            <mesh position={[1.0, 0.35, 1.2]} rotation={[0,0,Math.PI/2]}><cylinderGeometry args={[0.35, 0.35, 0.3]} /><meshStandardMaterial color="#2d3436" /></mesh>
            <mesh position={[-1.0, 0.35, 1.2]} rotation={[0,0,Math.PI/2]}><cylinderGeometry args={[0.35, 0.35, 0.3]} /><meshStandardMaterial color="#2d3436" /></mesh>
            <mesh position={[1.0, 0.35, -1.2]} rotation={[0,0,Math.PI/2]}><cylinderGeometry args={[0.35, 0.35, 0.3]} /><meshStandardMaterial color="#2d3436" /></mesh>
            <mesh position={[-1.0, 0.35, -1.2]} rotation={[0,0,Math.PI/2]}><cylinderGeometry args={[0.35, 0.35, 0.3]} /><meshStandardMaterial color="#2d3436" /></mesh>

            {/* Tailgate / Trunk Door */}
            <group position={[0, 1.45, 1.6]} rotation={[isOpen ? -2.0 : 0, 0, 0]}>
                {/* Door Shape */}
                <mesh position={[0, -0.6, 0.1]}>
                    <RoundedBox args={[1.9, 1.2, 0.15]} radius={0.1} smoothness={2}>
                        <meshStandardMaterial color="#a29bfe" roughness={0.3} />
                    </RoundedBox>
                </mesh>
                {/* Rear Window */}
                <mesh position={[0, -0.6, 0.16]}>
                    <planeGeometry args={[1.6, 0.7]} />
                    <meshStandardMaterial color="#2d3436" />
                </mesh>
            </group>

            {/* Clean Interior - Visible when open */}
            {isOpen && (
                <group position={[0, 0.6, 1.3]}>
                    {/* Trunk Floor - Solid Clean Color */}
                    <mesh position={[0, -0.1, -0.2]} rotation={[-0.1, 0, 0]}>
                        <boxGeometry args={[1.8, 0.1, 1.5]} />
                        <meshStandardMaterial color="#dfe6e9" />
                    </mesh>
                    
                    {/* Cozy Yellow Sleeping Bag - Simple Capsule Shape */}
                    <mesh position={[0, 0.05, -0.2]} rotation={[0, 0, Math.PI/2]}>
                        <capsuleGeometry args={[0.25, 1.2, 4, 8]} />
                        <meshStandardMaterial color="#f1c40f" roughness={0.8} />
                    </mesh>
                    
                    {/* Pillow */}
                    <mesh position={[0.5, 0.15, -0.7]} rotation={[0.1, 0.2, 0]}>
                        <boxGeometry args={[0.5, 0.15, 0.3]} />
                        <meshStandardMaterial color="white" />
                    </mesh>
                </group>
            )}
        </group>
    );
}

// --- 3D Animal Models --- (Kept same as previous)
const AnimalLeg = ({ position }: { position: [number, number, number] }) => (
    <mesh position={position}>
        <cylinderGeometry args={[0.04, 0.04, 0.25]} />
        <meshToonMaterial color="#bdc3c7" />
    </mesh>
);

const QuadrupedAnimal = ({ color, ears, tail }: { color: string, ears: 'POINTY' | 'FLOPPY' | 'ROUND', tail: 'LONG' | 'SHORT' | 'CURLY' }) => {
    return (
        <group>
            <mesh position={[0, 0.25, 0]} castShadow>
                <boxGeometry args={[0.25, 0.25, 0.45]} />
                <meshToonMaterial color={color} />
            </mesh>
            <mesh position={[0.1, 0.1, 0.15]}><cylinderGeometry args={[0.035, 0.03, 0.25]} /><meshToonMaterial color={color} /></mesh>
            <mesh position={[-0.1, 0.1, 0.15]}><cylinderGeometry args={[0.035, 0.03, 0.25]} /><meshToonMaterial color={color} /></mesh>
            <mesh position={[0.1, 0.1, -0.15]}><cylinderGeometry args={[0.035, 0.03, 0.25]} /><meshToonMaterial color={color} /></mesh>
            <mesh position={[-0.1, 0.1, -0.15]}><cylinderGeometry args={[0.035, 0.03, 0.25]} /><meshToonMaterial color={color} /></mesh>
            <group position={[0, 0.45, 0.25]}>
                <mesh><boxGeometry args={[0.28, 0.25, 0.25]} /><meshToonMaterial color={color} /></mesh>
                <mesh position={[0.08, 0.02, 0.13]}><sphereGeometry args={[0.025]} /><meshBasicMaterial color="#333" /></mesh>
                <mesh position={[-0.08, 0.02, 0.13]}><sphereGeometry args={[0.025]} /><meshBasicMaterial color="#333" /></mesh>
                <mesh position={[0, -0.05, 0.13]}><sphereGeometry args={[0.03]} /><meshBasicMaterial color="#333" /></mesh>
                {ears === 'POINTY' && (
                    <>
                        <mesh position={[0.1, 0.15, 0]} rotation={[0,0,-0.2]}><coneGeometry args={[0.06, 0.15]} /><meshToonMaterial color={color} /></mesh>
                        <mesh position={[-0.1, 0.15, 0]} rotation={[0,0,0.2]}><coneGeometry args={[0.06, 0.15]} /><meshToonMaterial color={color} /></mesh>
                    </>
                )}
                {ears === 'FLOPPY' && (
                     <>
                        <mesh position={[0.15, 0, 0]} rotation={[0,0,-0.5]}><boxGeometry args={[0.05, 0.15, 0.1]} /><meshToonMaterial color={color} /></mesh>
                        <mesh position={[-0.15, 0, 0]} rotation={[0,0,0.5]}><boxGeometry args={[0.05, 0.15, 0.1]} /><meshToonMaterial color={color} /></mesh>
                    </>
                )}
                {ears === 'ROUND' && (
                    <>
                        <mesh position={[0.12, 0.15, 0]}><sphereGeometry args={[0.06]} /><meshToonMaterial color={color} /></mesh>
                        <mesh position={[-0.12, 0.15, 0]}><sphereGeometry args={[0.06]} /><meshToonMaterial color={color} /></mesh>
                    </>
                )}
            </group>
            {tail === 'LONG' && <mesh position={[0, 0.3, -0.25]} rotation={[0.5,0,0]}><cylinderGeometry args={[0.02, 0.01, 0.3]} /><meshToonMaterial color={color} /></mesh>}
            {tail === 'SHORT' && <mesh position={[0, 0.3, -0.25]} rotation={[0.5,0,0]}><sphereGeometry args={[0.05]} /><meshToonMaterial color={color} /></mesh>}
            {tail === 'CURLY' && <mesh position={[0, 0.35, -0.2]}><torusGeometry args={[0.06, 0.02]} /><meshToonMaterial color={color} /></mesh>}
        </group>
    );
};

const Maltese = () => <QuadrupedAnimal color="white" ears="FLOPPY" tail="CURLY" />;

const TurtleModel = () => (
    <group>
        <mesh position={[0, 0.15, 0]} scale={[1, 0.6, 1.2]}><sphereGeometry args={[0.3]} /><meshStandardMaterial color="#27ae60" /></mesh>
        <mesh position={[0, 0.1, 0]}><boxGeometry args={[0.5, 0.1, 0.7]} /><meshStandardMaterial color="#e67e22" /></mesh>
        <mesh position={[0, 0.15, 0.4]}><sphereGeometry args={[0.12]} /><meshToonMaterial color="#2ecc71" /></mesh>
        <mesh position={[0.06, 0.18, 0.5]}><sphereGeometry args={[0.015]} /><meshBasicMaterial color="black" /></mesh>
        <mesh position={[-0.06, 0.18, 0.5]}><sphereGeometry args={[0.015]} /><meshBasicMaterial color="black" /></mesh>
        <mesh position={[0.25, 0.05, 0.25]}><sphereGeometry args={[0.08]} /><meshToonMaterial color="#2ecc71" /></mesh>
        <mesh position={[-0.25, 0.05, 0.25]}><sphereGeometry args={[0.08]} /><meshToonMaterial color="#2ecc71" /></mesh>
        <mesh position={[0.25, 0.05, -0.25]}><sphereGeometry args={[0.08]} /><meshToonMaterial color="#2ecc71" /></mesh>
        <mesh position={[-0.25, 0.05, -0.25]}><sphereGeometry args={[0.08]} /><meshToonMaterial color="#2ecc71" /></mesh>
    </group>
);

const BirdModel = () => (
    <group position={[0, 0.3, 0]}>
         <mesh><sphereGeometry args={[0.2]} /><meshToonMaterial color="white" /></mesh>
         <mesh position={[0, 0.1, 0.15]}><sphereGeometry args={[0.12]} /><meshToonMaterial color="white" /></mesh>
         <mesh position={[0, 0.1, 0.25]} rotation={[0.2,0,0]}><coneGeometry args={[0.04, 0.1]} /><meshStandardMaterial color="#f1c40f" /></mesh>
         <mesh position={[0.06, 0.15, 0.22]}><sphereGeometry args={[0.015]} /><meshBasicMaterial color="black" /></mesh>
         <mesh position={[-0.06, 0.15, 0.22]}><sphereGeometry args={[0.015]} /><meshBasicMaterial color="black" /></mesh>
         <mesh position={[0.18, 0, 0]} rotation={[0,0,-0.5]}><ellipsoidGeometry args={[0.2, 0.05, 0.1]} /><meshToonMaterial color="white" /></mesh>
         <mesh position={[-0.18, 0, 0]} rotation={[0,0,0.5]}><ellipsoidGeometry args={[0.2, 0.05, 0.1]} /><meshToonMaterial color="white" /></mesh>
         <mesh position={[0.05, -0.2, 0]}><cylinderGeometry args={[0.01, 0.01, 0.15]} /><meshBasicMaterial color="#e67e22" /></mesh>
         <mesh position={[-0.05, -0.2, 0]}><cylinderGeometry args={[0.01, 0.01, 0.15]} /><meshBasicMaterial color="#e67e22" /></mesh>
    </group>
);

const KoalaModel = ({ color = "#95a5a6" }) => (
     <group>
        <mesh position={[0, 0.3, 0]}><capsuleGeometry args={[0.2, 0.4]} /><meshToonMaterial color={color} /></mesh>
        <group position={[0, 0.55, 0.05]}>
             <mesh><sphereGeometry args={[0.22]} /><meshToonMaterial color={color} /></mesh>
             <mesh position={[0.2, 0.15, 0]}><sphereGeometry args={[0.1]} /><meshToonMaterial color={color} /></mesh>
             <mesh position={[-0.2, 0.15, 0]}><sphereGeometry args={[0.1]} /><meshToonMaterial color={color} /></mesh>
             <mesh position={[0, 0, 0.2]} scale={[1, 1.5, 0.8]}><sphereGeometry args={[0.05]} /><meshBasicMaterial color="#2d3436" /></mesh>
             <mesh position={[0.08, 0.05, 0.18]}><sphereGeometry args={[0.02]} /><meshBasicMaterial color="black" /></mesh>
             <mesh position={[-0.08, 0.05, 0.18]}><sphereGeometry args={[0.02]} /><meshBasicMaterial color="black" /></mesh>
        </group>
        <mesh position={[0.15, 0.35, 0.1]} rotation={[0,0,-0.5]}><capsuleGeometry args={[0.05, 0.25]} /><meshToonMaterial color={color} /></mesh>
        <mesh position={[-0.15, 0.35, 0.1]} rotation={[0,0,0.5]}><capsuleGeometry args={[0.05, 0.25]} /><meshToonMaterial color={color} /></mesh>
        <mesh position={[0.1, 0.1, 0.1]}><capsuleGeometry args={[0.06, 0.25]} /><meshToonMaterial color={color} /></mesh>
        <mesh position={[-0.1, 0.1, 0.1]}><capsuleGeometry args={[0.06, 0.25]} /><meshToonMaterial color={color} /></mesh>
     </group>
);


// --- Camera Controller ---
const CameraController = ({ playerRef, controlsRef }: { playerRef: React.RefObject<THREE.Group>, controlsRef: React.RefObject<any> }) => {
  const prevPos = useRef(new THREE.Vector3());
  const isInitialized = useRef(false);
  useFrame((state) => {
    if (!playerRef.current || !controlsRef.current) return;
    const currentPos = playerRef.current.position;
    if (!isInitialized.current) {
      prevPos.current.copy(currentPos);
      isInitialized.current = true;
      controlsRef.current.target.set(currentPos.x, currentPos.y + 1, currentPos.z);
      return;
    }
    const delta = new THREE.Vector3().subVectors(currentPos, prevPos.current);
    if (delta.lengthSq() > 0) {
      state.camera.position.add(delta);
      controlsRef.current.target.add(delta);
    }
    prevPos.current.copy(currentPos);
  });
  return null;
};

// --- Avatar Component ---
const Player = ({ avatar, playerRef, isPartner = false, mobileInput }: { avatar: AvatarState, playerRef: React.RefObject<THREE.Group>, isPartner?: boolean, mobileInput?: any }) => {
  const leftLeg = useRef<THREE.Group>(null);
  const rightLeg = useRef<THREE.Group>(null);
  const leftArm = useRef<THREE.Group>(null);
  const rightArm = useRef<THREE.Group>(null);
  const groupRef = useRef<THREE.Group>(null);
  
  // Jump State
  const velocityY = useRef(0);
  const isJumping = useRef(false);
  const [isBlinking, setIsBlinking] = useState(false);

  // Blinking Logic
  useEffect(() => {
    const blinkLoop = () => {
        const nextBlink = Math.random() * 3000 + 2000;
        setTimeout(() => {
            setIsBlinking(true);
            setTimeout(() => {
                setIsBlinking(false);
                blinkLoop();
            }, 150);
        }, nextBlink);
    };
    blinkLoop();
  }, []);

  // Combine refs if passed
  useEffect(() => {
      if(playerRef && groupRef.current) {
          (playerRef as React.MutableRefObject<THREE.Group>).current = groupRef.current;
      }
  }, [playerRef]);

  const [, getKeys] = useKeyboardControls();

  useFrame((state, delta) => {
    if (!groupRef.current) return;

    let isMoving = false;
    
    // Only main avatar moves with keyboard/mobile
    if (!isPartner && avatar.pose === 'IDLE') {
        const { forward, backward, left, right, jump } = getKeys();
        
        // Merge inputs
        const isForward = forward || mobileInput?.forward;
        const isBackward = backward || mobileInput?.backward;
        const isLeft = left || mobileInput?.left;
        const isRight = right || mobileInput?.right;
        const isJump = jump || mobileInput?.jump;

        const velocity = new THREE.Vector3();
        if (isForward) velocity.z -= 1;
        if (isBackward) velocity.z += 1;
        if (isLeft) velocity.x -= 1;
        if (isRight) velocity.x += 1;
        
        // Horizontal Movement
        if (velocity.length() > 0) {
            isMoving = true;
            velocity.normalize().multiplyScalar(MOVEMENT_SPEED * delta);
            groupRef.current.position.add(velocity);
            
            const dist = Math.sqrt(groupRef.current.position.x ** 2 + groupRef.current.position.z ** 2);
            if (dist > ISLAND_RADIUS - 1) groupRef.current.position.setLength(ISLAND_RADIUS - 1);

            const targetRotation = Math.atan2(velocity.x, velocity.z);
            const angleDiff = targetRotation - groupRef.current.rotation.y;
            let normalizedDiff = ((angleDiff + Math.PI) % (2 * Math.PI)) - Math.PI;
            groupRef.current.rotation.y += normalizedDiff * 0.15;
        }

        // Jump Logic
        if (isJump && !isJumping.current && groupRef.current.position.y <= 0.1) {
            velocityY.current = 5; // Initial jump velocity
            isJumping.current = true;
        }
    }

    // Apply Physics (Gravity)
    if (isJumping.current || groupRef.current.position.y > 0) {
        velocityY.current -= 9.8 * delta; // Gravity
        groupRef.current.position.y += velocityY.current * delta;

        // Ground collision
        if (groupRef.current.position.y <= 0) {
            groupRef.current.position.y = 0;
            velocityY.current = 0;
            isJumping.current = false;
        }
    }

    // Poses Logic
    if (avatar.pose === 'SIT') {
        if(groupRef.current) {
            groupRef.current.rotation.x = 0;
            groupRef.current.rotation.z = 0;
            groupRef.current.position.y = 0.1;
        }
        if(leftLeg.current) leftLeg.current.rotation.x = -Math.PI / 2;
        if(rightLeg.current) rightLeg.current.rotation.x = -Math.PI / 2;
        return; 
    } else if (avatar.pose === 'LIE') {
        if(groupRef.current) {
            groupRef.current.rotation.x = -Math.PI / 2; 
            groupRef.current.rotation.y = 0;
            groupRef.current.position.y = 0.15;
        }
        if(leftLeg.current) leftLeg.current.rotation.x = 0;
        if(rightLeg.current) rightLeg.current.rotation.x = 0;
        return;
    } else {
        // IDLE / STAND
        if(groupRef.current && !isJumping.current) {
            groupRef.current.rotation.x = 0;
            groupRef.current.rotation.z = 0;
        }
    }

    // Walking Animation
    if (isMoving && !isJumping.current && leftLeg.current && rightLeg.current && leftArm.current && rightArm.current) {
        const t = state.clock.elapsedTime * 12;
        leftLeg.current.rotation.x = Math.sin(t) * 0.6;
        rightLeg.current.rotation.x = Math.sin(t + Math.PI) * 0.6;
        leftArm.current.rotation.x = Math.sin(t + Math.PI) * 0.6;
        rightArm.current.rotation.x = Math.sin(t) * 0.6;
    } else if (isJumping.current && leftLeg.current && rightLeg.current && leftArm.current && rightArm.current) {
        leftLeg.current.rotation.x = 0.5;
        rightLeg.current.rotation.x = -0.5;
        leftArm.current.rotation.x = 2.5;
        rightArm.current.rotation.x = 2.5;
    } else if (leftLeg.current && rightLeg.current) {
        leftLeg.current.rotation.x = THREE.MathUtils.lerp(leftLeg.current.rotation.x, 0, 0.1);
        rightLeg.current.rotation.x = THREE.MathUtils.lerp(rightLeg.current.rotation.x, 0, 0.1);
        if(leftArm.current) leftArm.current.rotation.x = THREE.MathUtils.lerp(leftArm.current.rotation.x, 0, 0.1);
        if(rightArm.current) rightArm.current.rotation.x = THREE.MathUtils.lerp(rightArm.current.rotation.x, 0, 0.1);
    }
  });

  const skinColor = '#ffdecb';
  
  const getLegColor = () => {
    switch(avatar.outfit) {
        case 'JEANS_BLOUSE': return '#3498db'; 
        case 'YELLOW_SHORTS': return '#333'; 
        case 'BLACK_CHIC': return '#2c3e50'; 
        case 'PINK_DRESS': return skinColor;
        case 'BLACK_SUIT': return '#2d3436';
        case 'WHITE_SHIRT_JEANS': return '#3498db';
        case 'NAVY_HOODIE': return '#8d6e63'; 
        case 'GREY_HOODIE': return '#2d3436';
        case 'YELLOW_RAINCOAT': return '#f1c40f';
        case 'PINK_BIKINI': return skinColor;
        case 'BLACK_ONEPIECE': return skinColor;
        case 'BLACK_BOXERS': return skinColor; 
        case 'BLACK_RASHGUARD': return '#2d3436';
        default: return '#333';
    }
  }

  const getBody = () => {
    const shoulderWidth = 0.35;
    const torsoHeight = 0.45;
    const torsoDepth = 0.2;

    switch(avatar.outfit) {
        case 'PINK_BIKINI':
            return (
                <group position={[0, 0.55, 0]}>
                    {/* Skin Torso */}
                    <mesh><boxGeometry args={[shoulderWidth, torsoHeight, torsoDepth]} /><meshToonMaterial color={skinColor} /></mesh>
                    {/* Bikini Top */}
                    <mesh position={[0, 0.1, 0.11]}><boxGeometry args={[0.3, 0.15, 0.05]} /><meshToonMaterial color="#ff69b4" /></mesh>
                    {/* Bikini Bottom */}
                    <mesh position={[0, -0.25, 0]}><boxGeometry args={[shoulderWidth + 0.01, 0.1, torsoDepth + 0.01]} /><meshToonMaterial color="#ff69b4" /></mesh>
                </group>
            );
        case 'BLACK_ONEPIECE':
            return (
                <group position={[0, 0.55, 0]}>
                    <mesh><boxGeometry args={[shoulderWidth, torsoHeight, torsoDepth]} /><meshToonMaterial color="#2d3436" /></mesh>
                    {/* Nike Logo approximation */}
                    <mesh position={[0.05, 0.1, 0.11]} rotation={[0,0,0.5]}><boxGeometry args={[0.08, 0.02, 0.01]} /><meshBasicMaterial color="white" /></mesh>
                    <mesh position={[0, -0.25, 0]}><boxGeometry args={[shoulderWidth + 0.01, 0.1, torsoDepth + 0.01]} /><meshToonMaterial color="#2d3436" /></mesh>
                </group>
            );
        case 'BLACK_BOXERS':
            return (
                <group position={[0, 0.55, 0]}>
                    <mesh><boxGeometry args={[shoulderWidth, torsoHeight, torsoDepth]} /><meshToonMaterial color={skinColor} /></mesh>
                    <mesh position={[0, -0.25, 0]}><boxGeometry args={[shoulderWidth + 0.01, 0.15, torsoDepth + 0.01]} /><meshToonMaterial color="#2d3436" /></mesh>
                </group>
            );
        case 'BLACK_RASHGUARD':
            return (
                <group position={[0, 0.55, 0]}>
                    <mesh><boxGeometry args={[shoulderWidth, torsoHeight, torsoDepth]} /><meshToonMaterial color="#2d3436" /></mesh>
                    <mesh position={[0, -0.25, 0]}><boxGeometry args={[shoulderWidth + 0.01, 0.1, torsoDepth + 0.01]} /><meshToonMaterial color="#2d3436" /></mesh>
                </group>
            );
        case 'JEANS_BLOUSE': 
            return (
                <group position={[0, 0.55, 0]}>
                    <mesh><boxGeometry args={[shoulderWidth, torsoHeight, torsoDepth]} /><meshToonMaterial color="white" /></mesh>
                    <mesh position={[0, -0.25, 0]}><boxGeometry args={[shoulderWidth + 0.02, 0.1, torsoDepth + 0.02]} /><meshToonMaterial color="#3498db" /></mesh>
                </group>
            );
        case 'YELLOW_SHORTS':
            return (
                <group position={[0, 0.55, 0]}>
                     <mesh><boxGeometry args={[shoulderWidth, torsoHeight, torsoDepth]} /><meshToonMaterial color="#f1c40f" /></mesh>
                     <mesh position={[0, -0.25, 0]}><boxGeometry args={[shoulderWidth + 0.02, 0.1, torsoDepth + 0.02]} /><meshToonMaterial color="#333" /></mesh>
                </group>
            );
        case 'BLACK_CHIC':
             return (
                <group position={[0, 0.55, 0]}>
                    <mesh><boxGeometry args={[shoulderWidth, torsoHeight, torsoDepth]} /><meshToonMaterial color="#2d3436" /></mesh>
                </group>
             );
        case 'PINK_DRESS': 
            return (
                 <group position={[0, 0.5, 0]}>
                    <mesh position={[0, 0.15, 0]}><boxGeometry args={[0.3, 0.3, 0.2]} /><meshToonMaterial color="#FFB7B2" /></mesh>
                    <mesh position={[0, -0.2, 0]}><coneGeometry args={[0.28, 0.6, 32]} /><meshToonMaterial color="#FFB7B2" /></mesh>
                </group>
            );
        case 'BLACK_SUIT':
            return (
                <group position={[0, 0.55, 0]}>
                    <mesh><boxGeometry args={[shoulderWidth, torsoHeight, torsoDepth]} /><meshToonMaterial color="#2d3436" /></mesh>
                    <mesh position={[0, 0.1, 0.11]}><boxGeometry args={[0.05, 0.2, 0.01]} /><meshBasicMaterial color="white" /></mesh>
                </group>
            );
        case 'WHITE_SHIRT_JEANS':
            return (
                <group position={[0, 0.55, 0]}>
                    <mesh><boxGeometry args={[shoulderWidth, torsoHeight, torsoDepth]} /><meshToonMaterial color="white" /></mesh>
                    <mesh position={[0, -0.25, 0]}><boxGeometry args={[shoulderWidth + 0.02, 0.1, torsoDepth + 0.02]} /><meshToonMaterial color="#3498db" /></mesh>
                </group>
            );
        case 'NAVY_HOODIE':
            return (
                <group position={[0, 0.55, 0]}>
                    <mesh><boxGeometry args={[shoulderWidth, torsoHeight, torsoDepth]} /><meshToonMaterial color="#1a237e" /></mesh>
                    <mesh position={[0, 0.2, -0.1]} rotation={[0.5,0,0]}><torusGeometry args={[0.15, 0.05, 8, 16]} /><meshToonMaterial color="#1a237e" /></mesh>
                </group>
            );
        case 'GREY_HOODIE':
            return (
                <group position={[0, 0.55, 0]}>
                    <mesh><boxGeometry args={[shoulderWidth, torsoHeight, torsoDepth]} /><meshToonMaterial color="#bdc3c7" /></mesh>
                    <mesh position={[0, 0.2, -0.1]} rotation={[0.5,0,0]}><torusGeometry args={[0.15, 0.05, 8, 16]} /><meshToonMaterial color="#bdc3c7" /></mesh>
                </group>
            );
        case 'YELLOW_RAINCOAT':
            return (
                <group position={[0, 0.55, 0]}>
                    <mesh><boxGeometry args={[0.38, 0.5, 0.25]} /><meshToonMaterial color="#f1c40f" /></mesh>
                    <mesh position={[0, 0.25, -0.05]} rotation={[0.8,0,0]}><torusGeometry args={[0.14, 0.04, 8, 16]} /><meshToonMaterial color="#f1c40f" /></mesh>
                </group>
            );
        default:
             return (
                 <group position={[0, 0.5, 0]}>
                    <mesh position={[0, 0.15, 0]}><boxGeometry args={[0.3, 0.3, 0.2]} /><meshToonMaterial color="#FFB7B2" /></mesh>
                    <mesh position={[0, -0.2, 0]}><coneGeometry args={[0.28, 0.6, 32]} /><meshToonMaterial color="#FFB7B2" /></mesh>
                </group>
            );
    }
  };

  const isShorts = avatar.outfit === 'YELLOW_SHORTS' || avatar.outfit === 'BLACK_BOXERS' || avatar.outfit === 'PINK_BIKINI';

  // Helper to get arm color
  const getArmColor = () => {
      switch(avatar.outfit) {
        case 'JEANS_BLOUSE': case 'WHITE_SHIRT_JEANS': return 'white';
        case 'YELLOW_SHORTS': case 'YELLOW_RAINCOAT': return '#f1c40f';
        case 'BLACK_CHIC': case 'BLACK_SUIT': case 'BLACK_RASHGUARD': return '#2d3436';
        case 'NAVY_HOODIE': return '#1a237e';
        case 'GREY_HOODIE': return '#bdc3c7';
        case 'PINK_DRESS': return '#FFB7B2';
        default: return skinColor;
      }
  };

  return (
    <group ref={groupRef} position={[avatar.position[0], 0, avatar.position[2]]}>
      <group position={[0, 0, 0]}>
        <group position={[0, 0.4, 0]}>
           <group ref={leftLeg} position={[-0.1, -0.2, 0]}>
              <mesh position={[0, isShorts ? 0.1 : 0, 0]}>
                 <capsuleGeometry args={[0.08, isShorts ? 0.2 : 0.4]} />
                 <meshToonMaterial color={isShorts ? skinColor : getLegColor()} />
              </mesh>
              {avatar.shoes === 'RED_CANVAS' && <mesh position={[0, -0.2, 0.05]}><boxGeometry args={[0.1, 0.1, 0.15]} /><meshToonMaterial color="#e74c3c" /></mesh>}
              {avatar.shoes === 'GREEN_SNEAKERS' && <mesh position={[0, -0.2, 0.05]}><boxGeometry args={[0.1, 0.1, 0.15]} /><meshToonMaterial color="#2ecc71" /></mesh>}
              {avatar.shoes === 'BLACK_BOOTS' && <mesh position={[0, -0.1, 0.02]}><cylinderGeometry args={[0.07, 0.06, 0.3]} /><meshToonMaterial color="#2d3436" /></mesh>}
              {avatar.shoes === 'BLACK_SANDALS' && <mesh position={[0, -0.2, 0.05]}><boxGeometry args={[0.1, 0.02, 0.16]} /><meshStandardMaterial color="#2d3436" /></mesh>}
              {avatar.shoes === 'GREY_SNEAKERS' && <mesh position={[0, -0.2, 0.05]}><boxGeometry args={[0.1, 0.1, 0.15]} /><meshToonMaterial color="#95a5a6" /></mesh>}
              {avatar.shoes === 'BLACK_SNEAKERS_M' && <mesh position={[0, -0.2, 0.05]}><boxGeometry args={[0.1, 0.1, 0.15]} /><meshToonMaterial color="#2d3436" /></mesh>}
              {avatar.shoes === 'BAREFOOT' && (
                  <group position={[0, -0.2, 0.05]}>
                      <mesh><boxGeometry args={[0.08, 0.05, 0.15]} /><meshToonMaterial color={skinColor} /></mesh>
                  </group>
              )}
           </group>
           <group ref={rightLeg} position={[0.1, -0.2, 0]}>
               <mesh position={[0, isShorts ? 0.1 : 0, 0]}>
                 <capsuleGeometry args={[0.08, isShorts ? 0.2 : 0.4]} />
                 <meshToonMaterial color={isShorts ? skinColor : getLegColor()} />
              </mesh>
               {avatar.shoes === 'RED_CANVAS' && <mesh position={[0, -0.2, 0.05]}><boxGeometry args={[0.1, 0.1, 0.15]} /><meshToonMaterial color="#e74c3c" /></mesh>}
              {avatar.shoes === 'GREEN_SNEAKERS' && <mesh position={[0, -0.2, 0.05]}><boxGeometry args={[0.1, 0.1, 0.15]} /><meshToonMaterial color="#2ecc71" /></mesh>}
              {avatar.shoes === 'BLACK_BOOTS' && <mesh position={[0, -0.1, 0.02]}><cylinderGeometry args={[0.07, 0.06, 0.3]} /><meshToonMaterial color="#2d3436" /></mesh>}
              {avatar.shoes === 'BLACK_SANDALS' && <mesh position={[0, -0.2, 0.05]}><boxGeometry args={[0.1, 0.02, 0.16]} /><meshStandardMaterial color="#2d3436" /></mesh>}
              {avatar.shoes === 'GREY_SNEAKERS' && <mesh position={[0, -0.2, 0.05]}><boxGeometry args={[0.1, 0.1, 0.15]} /><meshToonMaterial color="#95a5a6" /></mesh>}
              {avatar.shoes === 'BLACK_SNEAKERS_M' && <mesh position={[0, -0.2, 0.05]}><boxGeometry args={[0.1, 0.1, 0.15]} /><meshToonMaterial color="#2d3436" /></mesh>}
              {avatar.shoes === 'BAREFOOT' && (
                  <group position={[0, -0.2, 0.05]}>
                      <mesh><boxGeometry args={[0.08, 0.05, 0.15]} /><meshToonMaterial color={skinColor} /></mesh>
                  </group>
              )}
           </group>
        </group>
        {getBody()}
        <mesh position={[0, 0.85, 0]}>
           <cylinderGeometry args={[0.06, 0.06, 0.35]} />
           <meshToonMaterial color={skinColor} />
        </mesh>
        
        {/* Arms - Attached INSIDE shoulder box */}
        <group position={[0, 0.77, 0]}> 
           {/* Left Arm Pivot */}
           <group ref={leftArm} position={[-0.17, 0, 0]} rotation={[0, 0, 0.2]}>
              <mesh position={[0, -0.05, 0]}>
                  <sphereGeometry args={[0.065]} />
                  <meshToonMaterial color={getArmColor()} />
              </mesh>
              {/* Upper Arm */}
              <group position={[0, -0.15, 0]}>
                  <mesh>
                      <capsuleGeometry args={[0.06, 0.3]} />
                      <meshToonMaterial color={getArmColor()} />
                  </mesh>
                  {/* Hand */}
                  <mesh position={[0, -0.18, 0]}>
                    <sphereGeometry args={[0.065]} />
                    <meshToonMaterial color={skinColor} />
                  </mesh>
                  {avatar.accessories.includes('KEYBOARD') && (
                      <group position={[0, -0.1, 0.15]} rotation={[0, 0, -0.2]}>
                          <boxGeometry args={[0.2, 0.4, 0.05]} />
                          <meshStandardMaterial color="#2d3436" />
                          <mesh position={[0, 0, 0.03]}>
                              <planeGeometry args={[0.18, 0.38]} />
                              <meshBasicMaterial color="#636e72" />
                          </mesh>
                      </group>
                  )}
              </group>
           </group>

           {/* Right Arm Pivot */}
           <group ref={rightArm} position={[0.17, 0, 0]} rotation={[0, 0, -0.2]}>
              <mesh position={[0, -0.05, 0]}>
                  <sphereGeometry args={[0.065]} />
                  <meshToonMaterial color={getArmColor()} />
              </mesh>
              <group position={[0, -0.15, 0]}>
                  <mesh>
                      <capsuleGeometry args={[0.06, 0.3]} />
                      <meshToonMaterial color={getArmColor()} />
                  </mesh>
                  <mesh position={[0, -0.18, 0]}>
                     <sphereGeometry args={[0.065]} />
                     <meshToonMaterial color={skinColor} />
                  </mesh>
                  {avatar.accessories.includes('WATCH') && (
                      <mesh position={[0, -0.05, 0]} rotation={[0,0,0]}>
                          <cylinderGeometry args={[0.07, 0.07, 0.05]} />
                          <meshStandardMaterial color="#2d3436" />
                          <mesh position={[0, 0, 0.06]}>
                              <boxGeometry args={[0.04, 0.04, 0.02]} />
                              <meshBasicMaterial color="#00ff00" />
                          </mesh>
                      </mesh>
                  )}
              </group>
           </group>
        </group>

        <group position={[0, 1.05, 0]} rotation={[avatar.pose === 'LIE' ? 0.4 : 0, 0, 0]}>
            {/* Hood part of raincoat - visible behind head */}
            {avatar.outfit === 'YELLOW_RAINCOAT' && (
                <group position={[0, -0.1, -0.15]} rotation={[0.2, 0, 0]}>
                    <mesh><sphereGeometry args={[0.25, 16, 16, 0, Math.PI * 2, 0, 1.5]} rotation={[-Math.PI/2, 0, 0]} /><meshToonMaterial color="#f1c40f" side={THREE.DoubleSide} /></mesh>
                </group>
            )}
            <mesh>
               <sphereGeometry args={[0.22, 32, 32]} />
               <meshToonMaterial color={skinColor} />
            </mesh>
             <mesh position={[0.22, 0, 0.05]} rotation={[0, 0.2, 0]}>
               <sphereGeometry args={[0.05]} />
               <meshToonMaterial color={skinColor} />
            </mesh>
            <mesh position={[-0.22, 0, 0.05]} rotation={[0, -0.2, 0]}>
               <sphereGeometry args={[0.05]} />
               <meshToonMaterial color={skinColor} />
            </mesh>
            <group position={[0, 0, 0.20]}> 
               {/* Eyes with Blinking */}
               <mesh position={[-0.08, 0.02, 0]} scale={[1, isBlinking ? 0.1 : 1, 1]}>
                  <sphereGeometry args={[0.025]} />
                  <meshBasicMaterial color="#333" />
               </mesh>
               <mesh position={[0.08, 0.02, 0]} scale={[1, isBlinking ? 0.1 : 1, 1]}>
                  <sphereGeometry args={[0.025]} />
                  <meshBasicMaterial color="#333" />
               </mesh>
               <mesh position={[0, -0.06, 0]} rotation={[0,0,0]}>
                   <torusGeometry args={[0.02, 0.005, 16, 16, Math.PI]} />
                   <meshBasicMaterial color="#e74c3c" />
               </mesh>
               {avatar.blush !== 'NONE' && (
                 <>
                   <mesh position={[0.12, -0.02, 0]} rotation={[0, -0.2, 0]}>
                      <circleGeometry args={[0.04]} />
                      <meshBasicMaterial color={avatar.blush === 'HOT_PINK' ? '#ff69b4' : (avatar.blush === 'ORANGE' ? '#ffa502' : '#ffb7b2')} transparent opacity={0.6} />
                   </mesh>
                   <mesh position={[-0.12, -0.02, 0]} rotation={[0, 0.2, 0]}>
                      <circleGeometry args={[0.04]} />
                      <meshBasicMaterial color={avatar.blush === 'HOT_PINK' ? '#ff69b4' : (avatar.blush === 'ORANGE' ? '#ffa502' : '#ffb7b2')} transparent opacity={0.6} />
                   </mesh>
                 </>
               )}
               {avatar.accessories.includes('GLASSES') && (
                   <group position={[0, 0.03, 0.05]}>
                       <mesh position={[-0.08, 0, 0]}>
                           <ringGeometry args={[0.045, 0.06, 32]} />
                           <meshBasicMaterial color="black" side={THREE.DoubleSide} />
                       </mesh>
                       <mesh position={[0.08, 0, 0]}>
                           <ringGeometry args={[0.045, 0.06, 32]} />
                           <meshBasicMaterial color="black" side={THREE.DoubleSide} />
                       </mesh>
                       <mesh position={[0, 0, 0]}>
                           <boxGeometry args={[0.06, 0.005, 0.01]} />
                           <meshBasicMaterial color="black" />
                       </mesh>
                   </group>
               )}
            </group>
            <group>
                <mesh position={[0, 0.05, -0.05]}>
                    <sphereGeometry args={[0.235]} />
                    <meshToonMaterial color={avatar.hairstyle.startsWith('SHORT') || avatar.hairstyle === 'UPSTYLE' ? '#2d3436' : "#5e412f"} />
                </mesh>
                {avatar.hairstyle === 'PONYTAIL' && <mesh position={[0, 0.1, -0.28]} rotation={[0.4, 0, 0]}><coneGeometry args={[0.1, 0.5]} /><meshToonMaterial color="#5e412f" /></mesh>}
                {avatar.hairstyle === 'LONG' && <mesh position={[0, -0.2, -0.1]}><boxGeometry args={[0.46, 0.5, 0.15]} /><meshToonMaterial color="#5e412f" /></mesh>}
                {avatar.hairstyle === 'SHORT' && <mesh position={[0, -0.05, -0.1]}><boxGeometry args={[0.49, 0.3, 0.2]} /><meshToonMaterial color="#5e412f" /></mesh>}
                {avatar.hairstyle === 'TWINTAIL' && (
                    <group>
                        <mesh position={[-0.25, 0.1, -0.1]} rotation={[0, 0, 0.5]}><coneGeometry args={[0.08, 0.4]} /><meshToonMaterial color="#5e412f" /></mesh>
                        <mesh position={[0.25, 0.1, -0.1]} rotation={[0, 0, -0.5]}><coneGeometry args={[0.08, 0.4]} /><meshToonMaterial color="#5e412f" /></mesh>
                    </group>
                )}
                {avatar.hairstyle === 'SHORT_BLACK' && (
                    <group>
                        <mesh position={[0, 0.15, 0.1]}><sphereGeometry args={[0.23]} /><meshToonMaterial color="#2d3436" /></mesh>
                        <mesh position={[0, 0.18, 0.15]}><boxGeometry args={[0.3, 0.1, 0.2]} /><meshToonMaterial color="#2d3436" /></mesh>
                    </group>
                )}
                {avatar.hairstyle === 'SHORT_PERM' && (
                    <group position={[0, 0.1, 0]}>
                        {[...Array(15)].map((_, i) => (
                            <mesh key={i} position={[Math.sin(i * 2) * 0.18, 0.15 + Math.random() * 0.1, Math.cos(i * 2) * 0.18]}><sphereGeometry args={[0.09]} /><meshToonMaterial color="#2d3436" /></mesh>
                        ))}
                        <mesh position={[0, 0.25, 0]}><sphereGeometry args={[0.15]} /><meshToonMaterial color="#2d3436" /></mesh>
                    </group>
                )}
                {avatar.hairstyle === 'UPSTYLE' && (
                    <group>
                        <mesh position={[0, 0.25, 0.05]} rotation={[-0.2, 0, 0]}><coneGeometry args={[0.15, 0.3]} /><meshToonMaterial color="#2d3436" /></mesh>
                        <mesh position={[0, 0.1, -0.1]}><sphereGeometry args={[0.23]} /><meshToonMaterial color="#2d3436" /></mesh>
                    </group>
                )}
            </group>
            <group position={[0, 0.05, 0]}>
              {avatar.accessories.includes('RIBBON') && <mesh position={[0, 0.23, 0.1]} rotation={[0,0, -0.2]}><boxGeometry args={[0.3, 0.15, 0.05]} /><meshToonMaterial color="#ff7675" /></mesh>}
              {avatar.accessories.includes('HAT') && (
                 <group position={[0, 0.1, 0.05]}>
                   <mesh><sphereGeometry args={[0.245, 32, 32, 0, Math.PI*2, 0, 1.5]} /><meshToonMaterial color="#74b9ff" /></mesh>
                   <mesh position={[0, 0, 0.2]} rotation={[0.2, 0, 0]}><boxGeometry args={[0.3, 0.02, 0.2]} /><meshToonMaterial color="#74b9ff" /></mesh>
                 </group>
              )}
               {(avatar.accessories.includes('HEADSET') || avatar.accessories.includes('HEADSET_WHITE')) && (
                 <group position={[0, 0.05, 0]}>
                    <mesh position={[0.24, 0, 0]}><boxGeometry args={[0.05, 0.15, 0.15]} /><meshStandardMaterial color="white" /></mesh>
                    <mesh position={[-0.24, 0, 0]}><boxGeometry args={[0.05, 0.15, 0.15]} /><meshStandardMaterial color="white" /></mesh>
                    <mesh position={[0, 0.15, 0]} rotation={[0,0,0]}><torusGeometry args={[0.25, 0.02, 8, 16, Math.PI]} /><meshStandardMaterial color="white" /></mesh>
                 </group>
              )}
               {avatar.accessories.includes('EARRINGS') && (
                 <group>
                    <mesh position={[0.22, -0.05, 0.05]}><sphereGeometry args={[0.03]} /><meshStandardMaterial color="#ffd700" /></mesh>
                    <mesh position={[-0.22, -0.05, 0.05]}><sphereGeometry args={[0.03]} /><meshStandardMaterial color="#ffd700" /></mesh>
                 </group>
              )}
              {avatar.accessories.includes('FLORAL_CAP') && (
                  <group position={[0, 0.12, 0]}>
                      <mesh><sphereGeometry args={[0.24, 32, 32, 0, Math.PI*2, 0, 1.5]} /><meshStandardMaterial color="white" /></mesh>
                      {[...Array(10)].map((_, i) => (
                          <mesh key={i} position={[Math.sin(i*0.6)*0.2, 0.1+Math.cos(i)*0.1, Math.cos(i*0.6)*0.2]}>
                              <sphereGeometry args={[0.05]} />
                              <meshStandardMaterial color={['#ff9ff3', '#feca57', '#54a0ff'][i%3]} />
                          </mesh>
                      ))}
                  </group>
              )}
            </group>
        </group>
      </group>
    </group>
  );
};

const TentMesh = ({ gameState, onInteract }: { gameState: GameState, onInteract: () => void }) => {
    const { type, pattern, isLit, isDoorOpen, rug } = gameState.tent;
    
    // Create texture only when pattern changes
    const texture = useMemo(() => createPatternTexture(pattern), [pattern]);
    
    return (
        <group position={[4, 0, -4]} onClick={(e) => { e.stopPropagation(); onInteract(); }}>
            {/* Tent Base Structure */}
            {type === 'TRIANGLE' ? (
                // DOME STYLE (Replaces Triangle)
                <group>
                    {/* Dome Body */}
                    <mesh position={[0, 0, 0]} castShadow receiveShadow>
                        {/* Half Sphere */}
                        <sphereGeometry args={[1.5, 32, 16, 0, Math.PI * 2, 0, Math.PI / 2]} />
                        <meshStandardMaterial map={texture} color={pattern === 'ORANGE' ? '#e67e22' : 'white'} side={THREE.DoubleSide} />
                    </mesh>
                    
                    {/* Frame/Poles */}
                    <mesh position={[0, 0, 0]} rotation={[0,0,0]}>
                        <torusGeometry args={[1.48, 0.03, 8, 32, Math.PI]} />
                        <meshStandardMaterial color="#2d3436" />
                    </mesh>
                    <mesh position={[0, 0, 0]} rotation={[0, Math.PI/2, 0]}>
                        <torusGeometry args={[1.48, 0.03, 8, 32, Math.PI]} />
                        <meshStandardMaterial color="#2d3436" />
                    </mesh>

                    {/* Door Area (Front) */}
                    <group position={[0, 0, 1.45]}>
                        {!isDoorOpen && (
                            // Closed Flap
                            <mesh position={[0, 0.7, -0.1]} rotation={[0,0,0]}>
                                <planeGeometry args={[1.2, 1.4]} />
                                <meshStandardMaterial map={texture} color={pattern === 'ORANGE' ? '#d35400' : '#bdc3c7'} side={THREE.DoubleSide} />
                            </mesh>
                        )}
                        {isDoorOpen && (
                            // Rolled Up Top
                            <group position={[0, 1.3, -0.1]}>
                                <mesh rotation={[0, 0, Math.PI/2]}>
                                    <cylinderGeometry args={[0.1, 0.1, 1.2]} />
                                    <meshStandardMaterial color={pattern === 'ORANGE' ? '#d35400' : '#bdc3c7'} />
                                </mesh>
                            </group>
                        )}
                    </group>
                </group>
            ) : (
                <group>
                     {/* Cabin Style */}
                    <mesh position={[0, 1, 0]} castShadow receiveShadow>
                        <boxGeometry args={[2.5, 2, 2.5]} />
                         <meshStandardMaterial map={texture} color={pattern === 'ORANGE' ? '#e67e22' : 'white'} transparent opacity={0.9} side={THREE.DoubleSide} />
                    </mesh>
                    <mesh position={[0, 2.3, 0]} rotation={[0, Math.PI/4, 0]}>
                        <coneGeometry args={[2.2, 1, 4]} />
                        <meshStandardMaterial color="#5d4037" />
                    </mesh>
                    {/* Door */}
                    <group position={[0, 0.8, 1.26]}>
                         {!isDoorOpen && (
                             <mesh position={[0, 0, 0]}>
                                <planeGeometry args={[1, 1.6]} />
                                <meshStandardMaterial color="#5d4037" side={THREE.DoubleSide} />
                                <mesh position={[0.3, 0, 0.05]}><sphereGeometry args={[0.05]} /><meshStandardMaterial color="gold" /></mesh>
                             </mesh>
                         )}
                         {isDoorOpen && (
                             <mesh position={[0.6, 0, 0.1]} rotation={[0, -1.2, 0]}>
                                <planeGeometry args={[1, 1.6]} />
                                <meshStandardMaterial color="#5d4037" side={THREE.DoubleSide} />
                                <mesh position={[0.3, 0, 0.05]}><sphereGeometry args={[0.05]} /><meshStandardMaterial color="gold" /></mesh>
                             </mesh>
                         )}
                    </group>
                </group>
            )}

            {/* Interior Light */}
            {isLit && (
                <pointLight position={[0, 1.2, 0]} intensity={3} distance={6} color="#ffeaa7" decay={2} />
            )}

            {/* Rug */}
            <group position={[0, 0.02, 0]}>
                {rug === 'ETHNIC' && <mesh rotation={[-Math.PI/2, 0, 0]}><circleGeometry args={[1, 32]} /><meshStandardMaterial color="#8d6e63" /></mesh>}
                {rug === 'BLUE_FUR' && <mesh rotation={[-Math.PI/2, 0, 0]}><circleGeometry args={[1, 32]} /><meshStandardMaterial color="#0984e3" /></mesh>}
                {rug === 'SILVER' && <mesh rotation={[-Math.PI/2, 0, 0]}><planeGeometry args={[1.8, 1.8]} /><meshStandardMaterial color="#b2bec3" metalness={0.6} roughness={0.3} /></mesh>}
                {rug === 'VINTAGE' && <mesh rotation={[-Math.PI/2, 0, 0]}><planeGeometry args={[1.8, 1.8]} /><meshStandardMaterial color="#d63031" /></mesh>}
            </group>
            
            {/* Interior Decor */}
             <group>
                 {/* Sleeping Bag */}
                 <mesh position={[-0.6, 0.1, -0.4]} rotation={[0, 0.2, 0]}>
                     <boxGeometry args={[0.7, 0.1, 1.6]} />
                     <meshStandardMaterial color="#fab1a0" />
                 </mesh>
                 <mesh position={[-0.6, 0.15, -1.1]} rotation={[0, 0.2, 0]}>
                     <cylinderGeometry args={[0.2, 0.2, 0.6]} rotation={[0,0,Math.PI/2]} />
                     <meshStandardMaterial color="white" />
                 </mesh>
             </group>
        </group>
    );
};

const DraggableObject = ({ id, position, rotation, isSelected, onSelect, onMove, children }: any) => {
    const [hovered, setHover] = useState(false);
    const [isDragging, setIsDragging] = useState(false);
    const plane = useMemo(() => new THREE.Plane(new THREE.Vector3(0, 1, 0), 0), []);
    const intersect = new THREE.Vector3();

    useCursor(hovered, 'move', 'auto');

    const handlePointerDown = (e: any) => {
        e.stopPropagation();
        onSelect(id);
        setIsDragging(true);
        // @ts-ignore
        e.target.setPointerCapture(e.pointerId);
    };

    const handlePointerUp = (e: any) => {
        e.stopPropagation();
        setIsDragging(false);
        // @ts-ignore
        e.target.releasePointerCapture(e.pointerId);
    };

    const handlePointerMove = (e: any) => {
        if (isDragging) {
            e.stopPropagation();
            e.ray.intersectPlane(plane, intersect);
            const x = Math.round(intersect.x * 2) / 2;
            const z = Math.round(intersect.z * 2) / 2;
            if (x * x + z * z < ISLAND_RADIUS * ISLAND_RADIUS) {
                onMove(id, [x, 0, z]);
            }
        }
    };

    return (
        <group
            position={position}
            rotation={rotation || [0,0,0]}
            onPointerDown={handlePointerDown}
            onPointerUp={handlePointerUp}
            onPointerMove={handlePointerMove}
            onPointerOver={() => setHover(true)}
            onPointerOut={() => setHover(false)}
        >
            {children}
            {isSelected && (
                <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.05, 0]}>
                    <ringGeometry args={[0.6, 0.7, 32]} />
                    <meshBasicMaterial color="#f1c40f" opacity={0.8} transparent side={THREE.DoubleSide} />
                </mesh>
            )}
             <mesh visible={false}>
                 <boxGeometry args={[1, 1.5, 1]} />
             </mesh>
        </group>
    );
};

const Pet = ({ pet, isSelected, onSelect, onMove, weather, time }: any) => {
    const [thought, setThought] = useState("");
    const [showThought, setShowThought] = useState(false);

    useEffect(() => {
        let isMounted = true;
        let timeout: ReturnType<typeof setTimeout>;
        const loop = () => {
            const delay = Math.random() * 20000 + 10000;
            timeout = setTimeout(async () => {
                if (!isMounted) return;
                try {
                    const text = await generatePetThought(pet, weather, time);
                    if (isMounted && text) {
                        setThought(text);
                        setShowThought(true);
                        setTimeout(() => { if (isMounted) setShowThought(false); }, 5000);
                    }
                } catch {}
                if (isMounted) loop();
            }, delay);
        };
        timeout = setTimeout(loop, 5000);
        return () => {
            isMounted = false;
            clearTimeout(timeout);
        };
    }, [pet.name, weather, time, pet]);

    return (
        <DraggableObject
            id={pet.id}
            position={pet.position}
            rotation={pet.rotation}
            isSelected={isSelected}
            onSelect={onSelect}
            onMove={onMove}
        >
            {pet.type === 'Maltese' && <Maltese />}
            {pet.type === 'Poodle' && <QuadrupedAnimal color="white" ears="POINTY" tail="SHORT" />}
            {pet.type === 'Bichon' && <QuadrupedAnimal color="white" ears="ROUND" tail="CURLY" />}
            {pet.type === 'Shiba' && <QuadrupedAnimal color="#e67e22" ears="POINTY" tail="CURLY" />}
            {pet.type === 'CheeseCat' && <QuadrupedAnimal color="#f1c40f" ears="POINTY" tail="LONG" />}
            {pet.type === 'SpottedCat' && <QuadrupedAnimal color="#bdc3c7" ears="POINTY" tail="LONG" />}
            {pet.type === 'Koala' && <KoalaModel />}
            {pet.type === 'Quokka' && <KoalaModel color="#cd6133" />}
            {pet.type === 'Turtle' && <TurtleModel />}
            {pet.type === 'WhiteBird' && <BirdModel />}

            {showThought && (
                <Billboard position={[0, 1.2, 0]}>
                    <mesh position={[0, 0, -0.02]}>
                        <planeGeometry args={[2.4, 0.7]} />
                        <meshBasicMaterial color="white" transparent opacity={0.9} />
                    </mesh>
                    <Text
                        fontSize={0.18}
                        color="#333"
                        maxWidth={2.2}
                        textAlign="center"
                        anchorX="center"
                        anchorY="middle"
                    >
                        {thought}
                    </Text>
                </Billboard>
            )}
        </DraggableObject>
    );
};

const GameCanvas = ({ 
    gameState, 
    setGameState, 
    onRemoveItem, 
    onMoveItem, 
    onMovePet, 
    onMovePartner,
    onRotateItem, 
    selectedItemId, 
    setSelectedItemId,
    mobileInput 
}: any) => {
    
    // REMOVED showTentMenu logic (deleted state and UI)
    
    const playerRef = useRef<THREE.Group>(null);
    const controlsRef = useRef<any>(null);

    const handleBackgroundClick = (e: any) => {
        setSelectedItemId(null);
    };

    const toggleItemState = (id: string) => {
        setGameState((prev: GameState) => ({
            ...prev,
            placedItems: prev.placedItems.map(item => 
                item.id === id ? { ...item, itemState: { ...item.itemState, isOpen: !item.itemState?.isOpen } } : item
            )
        }));
    };

    const toggleTentDoor = () => {
        setGameState((prev: any) => ({...prev, tent: {...prev.tent, isDoorOpen: !prev.tent.isDoorOpen}}));
    }

    const map = useMemo(()=>[
        { name: 'forward', keys: ['ArrowUp', 'KeyW'] },
        { name: 'backward', keys: ['ArrowDown', 'KeyS'] },
        { name: 'left', keys: ['ArrowLeft', 'KeyA'] },
        { name: 'right', keys: ['ArrowRight', 'KeyD'] },
        { name: 'jump', keys: ['Space'] }, 
    ], [])

    const isNight = gameState.time === TimeOfDay.NIGHT;
    const isSunset = gameState.time === TimeOfDay.SUNSET;
    const isDawn = gameState.time === TimeOfDay.DAWN;
    
    const getSkyColor = () => {
        if (isNight) return "#0f172a";
        if (isDawn) return "#70a1ff"; 
        
        if (isSunset) {
             if (gameState.weather === WeatherType.RAINY) return "#d35400"; 
             return "#ff7e5f"; 
        }

        if (gameState.weather === WeatherType.RAINY) {
            if (isDawn) return "#6c5ce7";
            return "#64748b"; 
        }
        if (gameState.weather === WeatherType.CLOUDY) {
             if (isDawn) return "#a29bfe";
             return "#bdc3c7";
        }
        if (gameState.weather === WeatherType.SNOWY) {
            if (isNight) return "#2c3e50";
            return "#dfe6e9";
        }

        return "#87CEEB"; 
    }

    // Determine Ground Color based on FloorType or Weather override
    const getGroundColor = () => {
        // Weather Overrides
        if (gameState.weather === WeatherType.SNOWY) return "#f1f2f6"; 
        
        // Floor Type Selection
        switch(gameState.floor) {
            case FloorType.GRASS: 
                if (isNight) return "#2f3640";
                if (isDawn) return "#7bed9f"; 
                if (isSunset) return "#eccc68"; 
                return "#57b864";
            case FloorType.SNOW: return "#f1f2f6";
            case FloorType.SAND: return "#f7d794";
            case FloorType.DIRT: return "#cd6133";
            default: return "#57b864";
        }
    }

    const bgColor = getSkyColor();
    const groundColor = getGroundColor();

    const getLighting = () => {
        let ambInt = 0.6;
        let dirInt = 1.2;
        let dirColor = "#ffffff";
        
        if (isNight) {
            ambInt = 0.2;
            dirInt = 0.2;
            dirColor = "#a29bfe";
        } else if (isDawn) {
            ambInt = 0.5;
            dirInt = 0.8;
            dirColor = "#ffeaa7"; 
        } else if (isSunset) {
            ambInt = 0.5;
            dirInt = 1.0;
            dirColor = "#ff7675"; 
        }

        if (gameState.weather === WeatherType.RAINY) {
             ambInt *= 0.7;
             dirInt *= 0.6;
        } else if (gameState.weather === WeatherType.SNOWY) {
             ambInt += 0.2; 
             dirInt *= 0.8; 
        }

        // Sunny Day Boost
        if (gameState.weather === WeatherType.SUNNY && gameState.time === TimeOfDay.DAY) {
            dirInt = 2.0; // Very bright sun
            ambInt = 0.7;
        }

        return { ambInt, dirInt, dirColor };
    }

    const { ambInt, dirInt, dirColor } = getLighting();

    return (
        <div className="w-full h-full relative">
            <KeyboardControls map={map}>
                <Canvas shadows camera={{ position: [0, 8, 12], fov: 45 }} onPointerMissed={handleBackgroundClick}>
                    <color attach="background" args={[bgColor]} />
                    
                    <ambientLight intensity={ambInt} />
                    <directionalLight 
                        position={[10, 20, 10]} 
                        intensity={dirInt} 
                        color={dirColor}
                        castShadow 
                        shadow-mapSize={[2048, 2048]}
                        shadow-bias={-0.0001}
                    >
                        <orthographicCamera attach="shadow-camera" args={[-20, 20, 20, -20]} />
                    </directionalLight>

                    {isNight && <Stars radius={100} depth={50} count={5000} factor={4} saturation={0} fade speed={1} />}
                    
                    {!isNight && gameState.weather !== WeatherType.RAINY && (
                       <>
                        <Cloud opacity={0.4} speed={0.1} bounds={[30, 2, 5]} segments={15} position={[10, 12, -10]} color="white" />
                        <Cloud opacity={0.3} speed={0.1} bounds={[30, 2, 5]} segments={15} position={[-10, 10, -5]} color="white" />
                        <Cloud opacity={0.3} speed={0.1} bounds={[20, 2, 5]} segments={10} position={[0, 15, 0]} color="white" />
                       </>
                    )}

                    {gameState.weather === WeatherType.RAINY && (
                        <Cloud opacity={0.7} speed={0.3} bounds={[40, 4, 10]} segments={40} color="white" position={[0, 10, 0]} />
                    )}
                    
                    {gameState.weather === WeatherType.RAINY && <Rain />}
                    {gameState.weather === WeatherType.SNOWY && <Snow />}

                    <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow position={[0, -0.01, 0]}>
                        <circleGeometry args={[ISLAND_RADIUS, 64]} />
                        <meshStandardMaterial color={groundColor} />
                    </mesh>
                    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.5, 0]}>
                        <planeGeometry args={[100, 100]} />
                        <meshStandardMaterial color="#4fc3f7" transparent opacity={0.8} />
                    </mesh>

                    {/* Show grid only on grass/dirt to keep sand/snow looking clean, or change color */}
                    <Grid position={[0, 0.01, 0]} args={[40, 40]} cellColor={isNight ? "#444" : "white"} sectionColor={isNight ? "#666" : "white"} fadeDistance={25} opacity={0.3} />

                    <TentMesh gameState={gameState} onInteract={() => { toggleTentDoor(); setSelectedItemId(null); }} />

                    <Player 
                        avatar={gameState.avatar} 
                        playerRef={playerRef}
                        mobileInput={mobileInput}
                    />

                    {gameState.partners.map(partner => (
                        <DraggableObject 
                            key={partner.id}
                            id={partner.id} 
                            position={partner.position} 
                            rotation={partner.rotation}
                            isSelected={selectedItemId === partner.id} 
                            onSelect={setSelectedItemId} 
                            onMove={(id, pos) => onMovePartner(id, pos)}
                        >
                            <Player 
                                avatar={partner} 
                                playerRef={{ current: null } as any} 
                                isPartner={true} 
                            />
                        </DraggableObject>
                    ))}

                    {gameState.placedItems.map(item => (
                        <DraggableObject 
                            key={item.id} 
                            id={item.id} 
                            position={item.position} 
                            rotation={item.rotation}
                            isSelected={selectedItemId === item.id} 
                            onSelect={setSelectedItemId} 
                            onMove={onMoveItem}
                        >
                            {item.itemId === 'tree_pine' && <Tree type={0} />}
                            {item.itemId === 'tree_zelkova' && <Tree type={1} />}
                            {item.itemId === 'tree_round' && <Tree type={2} />}
                            {item.itemId === 'tree_birch' && <Tree type={3} />}
                            {item.itemId === 'mini_tree' && <MiniTree />}

                            {/* Interactive EV */}
                            {item.itemId === 'ev_car' && (
                                <ElectricCar 
                                    isOpen={item.itemState?.isOpen || false} 
                                    onToggle={() => toggleItemState(item.id)} 
                                />
                            )}

                            {/* Interactive Radio */}
                            {item.itemId === 'radio' && <Radio />}

                            {/* New Decor */}
                            {item.itemId === 'sunbed' && <Sunbed />}
                            {item.itemId === 'picnic_mat' && <PicnicMat />}
                            {item.itemId === 'orange_mat' && <OrangeMat />}
                            {item.itemId === 'snowman' && <Snowman />}
                            {item.itemId === 'snow_pile' && <SnowPile />}
                            {item.itemId === 'coffee_cup' && <CoffeeCup />}

                            {item.itemId === 'campfire' && <Campfire />}
                            {item.itemId === 'lantern' && <CampingLantern />}
                            {item.itemId === 'camping_chair' && <CampingChair />}
                            {item.itemId === 'camping_table' && <CampingTable />}
                            {item.itemId === 'teddy_bear' && <TeddyBear />}
                            {item.itemId === 'pond' && <Pond />}
                            {item.itemId === 'pot' && <CookingPot />}
                            {item.itemId === 'coffee_pot' && <CoffeePot />}
                            {item.itemId === 'marshmallow' && <Marshmallow />}
                            {item.itemId === 'camping_box' && <BoxItem />}
                            {item.itemId === 'laptop' && <Laptop />}
                            {item.itemId === 'first_aid' && <FirstAid />}
                            {item.itemId === 'books' && <BookStack />}
                            {item.itemId === 'game_console' && <GameConsole />}
                        </DraggableObject>
                    ))}

                    {gameState.pets.map(pet => (
                        <Pet 
                            key={pet.id} 
                            pet={pet} 
                            isSelected={selectedItemId === pet.id} 
                            onSelect={setSelectedItemId} 
                            onMove={onMovePet} 
                            weather={gameState.weather}
                            time={gameState.time}
                        />
                    ))}

                    <CameraController playerRef={playerRef} controlsRef={controlsRef} />
                    <OrbitControls ref={controlsRef} enablePan={false} maxPolarAngle={Math.PI / 2 - 0.1} minDistance={5} maxDistance={20} />
                </Canvas>
            </KeyboardControls>
        </div>
    );
};

export default GameCanvas;