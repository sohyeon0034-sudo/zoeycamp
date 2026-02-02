import React, { useRef, useState, useEffect, useMemo, useCallback } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { useKeyboardControls, KeyboardControls, Cloud, Stars, OrbitControls, useCursor, Billboard, Grid, Text, RoundedBox, MeshDistortMaterial } from '@react-three/drei';
import * as THREE from 'three';
import { GameState, WeatherType, TimeOfDay, GameItem, PetState, AvatarState, ItemCategory, FloorType, WaterTheme, TentState, TentSize } from '../types';
import { generatePetThought } from '../services/geminiService';
import { DoorOpen } from 'lucide-react';

// --- Constants ---
const MOVEMENT_SPEED = 4;
const ISLAND_RADIUS = 22;
const ISLAND_TOP_Y = 0;
const ISLAND_HEIGHT = 0.6;
const ISLAND_CENTER_HEIGHT = 1.3;
const ISLAND_EDGE_HEIGHT = 0.8;
const ISLAND_CENTER_RADIUS = 0.6;
const ISLAND_EDGE_RADIUS = 0.9;
const ISLAND_EDGE_Y_OFFSET = ISLAND_EDGE_HEIGHT - ISLAND_CENTER_HEIGHT;
const PET_GROUND_OFFSET = -0.06;
const TREE_GROUND_OFFSET = -0.08;

const getItemGroundOffset = (itemId: string) => {
    if (itemId.startsWith('tree_') || itemId === 'mini_tree') return TREE_GROUND_OFFSET;
    return 0;
};

const getIslandSurfaceY = (x: number, z: number) => {
    const r = Math.sqrt(x * x + z * z);
    const t = Math.min(r / ISLAND_RADIUS, 1);
    const blend = THREE.MathUtils.smoothstep(t, ISLAND_CENTER_RADIUS, ISLAND_EDGE_RADIUS);
    return ISLAND_TOP_Y + ISLAND_EDGE_Y_OFFSET * blend;
};

const getGroundedPosition = (pos: [number, number, number], extraYOffset = 0): [number, number, number] => {
    const groundY = getIslandSurfaceY(pos[0], pos[2]);
    return [pos[0], pos[1] + groundY + extraYOffset, pos[2]];
};

const getTentScale = (size: TentSize) => (size === 'SMALL' ? 0.8 : (size === 'LARGE' ? 1.2 : 1));
const getTentRadius = (size: TentSize) => 1.6 * getTentScale(size);

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
    } else if (type === 'YELLOW_STARS') {
        // Yellow background with stars
        ctx.fillStyle = '#f1c40f';
        ctx.fillRect(0, 0, 512, 512);
        ctx.fillStyle = '#fff';
        
        // Draw stars
        const drawStar = (x: number, y: number, radius: number) => {
            ctx.beginPath();
            for (let i = 0; i < 5; i++) {
                const outerRadius = radius;
                const innerRadius = radius * 0.4;
                const angle = (i * 4 * Math.PI) / 5 - Math.PI / 2;
                const nextAngle = ((i + 1) * 4 * Math.PI) / 5 - Math.PI / 2;
                
                const x1 = x + outerRadius * Math.cos(angle);
                const y1 = y + outerRadius * Math.sin(angle);
                const x2 = x + innerRadius * Math.cos(angle + (2 * Math.PI) / 10);
                const y2 = y + innerRadius * Math.sin(angle + (2 * Math.PI) / 10);
                
                if (i === 0) {
                    ctx.moveTo(x1, y1);
                } else {
                    ctx.lineTo(x1, y1);
                }
                ctx.lineTo(x2, y2);
            }
            ctx.closePath();
            ctx.fill();
        };
        
        // Draw 50 stars with better visibility
        for (let i = 0; i < 50; i++) {
            const x = Math.random() * 512;
            const y = Math.random() * 512;
            const size = Math.random() * 6 + 4;
            drawStar(x, y, size);
        }
    } else if (type === 'KHAKI_OUTDOOR') {
        // Khaki background with outdoor decorations
        ctx.fillStyle = '#c4a747';
        ctx.fillRect(0, 0, 512, 512);
        // Rope pattern
        ctx.strokeStyle = '#8b7355';
        ctx.lineWidth = 2;
        for(let i=0; i<8; i++) {
            ctx.beginPath();
            ctx.moveTo(0, i * 64);
            ctx.quadraticCurveTo(256, i * 64 + 16, 512, i * 64);
            ctx.stroke();
        }
        // Decorative circles (buttons/grommets)
        ctx.fillStyle = '#5d4037';
        for(let i=0; i<12; i++) {
            const x = (i % 4) * 128 + 64;
            const y = Math.floor(i / 4) * 128 + 64;
            ctx.beginPath();
            ctx.arc(x, y, 8, 0, Math.PI * 2);
            ctx.fill();
        }
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

const getPatternBaseColor = (pattern: string): string => {
    switch(pattern) {
        case 'ORANGE':
            return '#e67e22';
        case 'YELLOW_STARS':
            return '#ffffff';
        case 'KHAKI_OUTDOOR':
            return '#c4a747';
        case 'DOTS':
        case 'HEARTS':
        case 'RAINBOW':
        default:
            return 'white';
    }
}

const createWaterTextures = (theme: WaterTheme) => {
    const size = 256;
    const makeCanvas = () => {
        const canvas = document.createElement('canvas');
        canvas.width = size;
        canvas.height = size;
        return canvas;
    };
    const palette = theme === WaterTheme.EMERALD
        ? { base: '#3abfae', wave: 'rgba(235,255,250,0.1)' }
        : { base: '#3a98cc', wave: 'rgba(255,255,255,0.1)' };

    const mapCanvas = makeCanvas();
    const mapCtx = mapCanvas.getContext('2d')!;
    mapCtx.fillStyle = palette.base;
    mapCtx.fillRect(0, 0, size, size);

    // Subtle wave lines
    for (let y = 0; y < size; y += 16) {
        mapCtx.beginPath();
        for (let x = 0; x <= size; x += 4) {
            const wave = Math.sin((x / size) * Math.PI * 2 * 2 + y * 0.08) * 2;
            mapCtx.lineTo(x, y + wave);
        }
        mapCtx.strokeStyle = palette.wave;
        mapCtx.lineWidth = 1;
        mapCtx.stroke();
    }

    const bumpCanvas = makeCanvas();
    const bumpCtx = bumpCanvas.getContext('2d')!;
    bumpCtx.fillStyle = '#555';
    bumpCtx.fillRect(0, 0, size, size);
    for (let y = 0; y < size; y += 12) {
        bumpCtx.beginPath();
        for (let x = 0; x <= size; x += 4) {
            const wave = Math.sin((x / size) * Math.PI * 2 * 3 + y * 0.1) * 1.5;
            bumpCtx.lineTo(x, y + wave);
        }
        bumpCtx.strokeStyle = 'rgba(255,255,255,0.28)';
        bumpCtx.lineWidth = 1.1;
        bumpCtx.stroke();
    }

    const map = new THREE.CanvasTexture(mapCanvas);
    const bump = new THREE.CanvasTexture(bumpCanvas);
    map.wrapS = map.wrapT = THREE.RepeatWrapping;
    bump.wrapS = bump.wrapT = THREE.RepeatWrapping;
    map.repeat.set(4, 4);
    bump.repeat.set(6, 6);
    return { map, bump };
};

const createSandTextures = () => {
    const size = 256;
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d')!;
    ctx.fillStyle = '#f1cf8a';
    ctx.fillRect(0, 0, size, size);

    // Fine grains
    const grainPalette = [
        'rgba(214,171,108,0.28)',
        'rgba(196,146,88,0.3)',
        'rgba(173,123,74,0.32)',
        'rgba(235,197,134,0.22)'
    ];
    for (let i = 0; i < 2600; i++) {
        const x = Math.random() * size;
        const y = Math.random() * size;
        ctx.fillStyle = grainPalette[Math.floor(Math.random() * grainPalette.length)];
        ctx.fillRect(x, y, 1, 1);
    }
    // Micro grains
    for (let i = 0; i < 1800; i++) {
        const x = Math.random() * size;
        const y = Math.random() * size;
        const alpha = 0.18 + Math.random() * 0.18;
        ctx.fillStyle = `rgba(176,124,76,${alpha})`;
        ctx.fillRect(x, y, 0.5, 0.5);
    }

    // Slightly larger grains
    for (let i = 0; i < 220; i++) {
        const x = Math.random() * size;
        const y = Math.random() * size;
        const w = Math.random() > 0.6 ? 2 : 1;
        const h = Math.random() > 0.6 ? 2 : 1;
        ctx.fillStyle = grainPalette[Math.floor(Math.random() * grainPalette.length)];
        ctx.fillRect(x, y, w, h);
    }

    // Soft dune patches (subtle tan variations)
    for (let i = 0; i < 14; i++) {
        const x = Math.random() * size;
        const y = Math.random() * size;
        const r = 10 + Math.random() * 16;
        const grad = ctx.createRadialGradient(x, y, 0, x, y, r);
        grad.addColorStop(0, 'rgba(231,190,124,0.18)');
        grad.addColorStop(1, 'rgba(231,190,124,0)');
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.arc(x, y, r, 0, Math.PI * 2);
        ctx.fill();
    }
    for (let i = 0; i < 10; i++) {
        const x = Math.random() * size;
        const y = Math.random() * size;
        const r = 12 + Math.random() * 12;
        const grad = ctx.createRadialGradient(x, y, 0, x, y, r);
        grad.addColorStop(0, 'rgba(196,146,88,0.16)');
        grad.addColorStop(1, 'rgba(196,146,88,0)');
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.arc(x, y, r, 0, Math.PI * 2);
        ctx.fill();
    }
    // Broad tone variation (very soft, larger areas)
    for (let i = 0; i < 8; i++) {
        const x = Math.random() * size;
        const y = Math.random() * size;
        const r = 28 + Math.random() * 28;
        const grad = ctx.createRadialGradient(x, y, 0, x, y, r);
        grad.addColorStop(0, 'rgba(226,184,120,0.08)');
        grad.addColorStop(1, 'rgba(226,184,120,0)');
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.arc(x, y, r, 0, Math.PI * 2);
        ctx.fill();
    }
    for (let i = 0; i < 6; i++) {
        const x = Math.random() * size;
        const y = Math.random() * size;
        const r = 24 + Math.random() * 24;
        const grad = ctx.createRadialGradient(x, y, 0, x, y, r);
        grad.addColorStop(0, 'rgba(198,148,92,0.07)');
        grad.addColorStop(1, 'rgba(198,148,92,0)');
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.arc(x, y, r, 0, Math.PI * 2);
        ctx.fill();
    }

    const bumpCanvas = document.createElement('canvas');
    bumpCanvas.width = size;
    bumpCanvas.height = size;
    const bctx = bumpCanvas.getContext('2d')!;
    bctx.fillStyle = '#808080';
    bctx.fillRect(0, 0, size, size);
    for (let i = 0; i < 1200; i++) {
        const x = Math.random() * size;
        const y = Math.random() * size;
        const alpha = 0.15 + Math.random() * 0.2;
        bctx.fillStyle = `rgba(255,255,255,${alpha})`;
        bctx.fillRect(x, y, 1, 1);
    }

    const map = new THREE.CanvasTexture(canvas);
    const bump = new THREE.CanvasTexture(bumpCanvas);
    map.wrapS = map.wrapT = THREE.RepeatWrapping;
    bump.wrapS = bump.wrapT = THREE.RepeatWrapping;
    map.repeat.set(6, 6);
    bump.repeat.set(8, 8);
    return { map, bump };
};

const WaterPlane = ({ textures, color, roughness, metalness, bumpScale, displacementScale, opacity }: { textures: { map: THREE.Texture; bump: THREE.Texture }; color: string; roughness: number; metalness: number; bumpScale: number; displacementScale: number; opacity: number }) => {
    useFrame((_, delta) => {
        textures.map.offset.x += delta * 0.01;
        textures.map.offset.y += delta * 0.006;
        textures.bump.offset.x -= delta * 0.008;
        textures.bump.offset.y += delta * 0.004;
    });

    return (
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.5, 0]}>
            <ringGeometry args={[0, 80, 96, 6]} />
            <meshStandardMaterial
                color={color}
                map={textures.map}
                bumpMap={textures.bump}
                bumpScale={bumpScale}
                displacementMap={textures.bump}
                displacementScale={displacementScale}
                displacementBias={-displacementScale * 0.5}
                transparent
                opacity={opacity}
                roughness={roughness}
                metalness={metalness}
            />
        </mesh>
    );
};

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

const Snow = ({ count = 260 }) => {
  const meshRef = useRef<THREE.InstancedMesh>(null);
  const dummy = useMemo(() => new THREE.Object3D(), []);
  const particles = useMemo(() => {
    const temp = [];
    for (let i = 0; i < count; i++) {
      const speed = 0.06 + Math.random() * 0.09;
      const x = (Math.random() - 0.5) * 50;
      const z = (Math.random() - 0.5) * 50;
      const y = Math.random() * 40;
      const sway = Math.random() * Math.PI;
      const scale = Math.random() > 0.7 ? 0.18 + Math.random() * 0.14 : 0.07 + Math.random() * 0.08;
      const drift = 0.02 + Math.random() * 0.05;
      const spread = 0.015 + Math.random() * 0.03;
      temp.push({ speed, x, z, y, sway, scale, drift, spread });
    }
    return temp;
  }, [count]);

  useFrame((state, delta) => {
    if (!meshRef.current) return;
    const t = state.clock.elapsedTime;
    particles.forEach((particle, i) => {
      particle.y -= particle.speed * 12 * delta;
      // Swaying + scattered drift
      particle.x += Math.sin(t * particle.drift + particle.sway) * particle.spread;
      particle.z += Math.cos(t * particle.drift + particle.sway) * particle.spread;

      if (particle.y < 0) {
        particle.y = 30 + Math.random() * 10;
        particle.x = (Math.random() - 0.5) * 50; 
        particle.z = (Math.random() - 0.5) * 50;
      }
      dummy.position.set(particle.x, particle.y, particle.z);
      dummy.scale.set(particle.scale, particle.scale, particle.scale);
      dummy.updateMatrix();
      meshRef.current!.setMatrixAt(i, dummy.matrix);
    });
    meshRef.current.instanceMatrix.needsUpdate = true;
  });

  return (
    <instancedMesh ref={meshRef} args={[undefined, undefined, count]}>
      <sphereGeometry args={[1, 6, 6]} />
      <meshBasicMaterial color="#eef5f8" transparent opacity={0.65} />
    </instancedMesh>
  );
};

// --- Trees ---
const Tree = ({ type }: { type: number }) => {
    if (type === 4) {
        return (
            <group>
                <mesh position={[0, 1.1, 0]} castShadow>
                    <cylinderGeometry args={[0.18, 0.26, 2.2, 8]} />
                    <meshStandardMaterial color="#8d6e63" />
                </mesh>
                <group position={[0, 2.2, 0]}>
                    {[0, (2 * Math.PI) / 3, (4 * Math.PI) / 3].map((a, i) => (
                        <mesh key={i} rotation={[-0.5, a, 0]} position={[0, 0, 0.8]}>
                            <boxGeometry args={[0.2, 0.08, 1.8]} />
                            <meshStandardMaterial color="#2ecc71" />
                        </mesh>
                    ))}
                </group>
            </group>
        );
    }

    if (type === 5) {
        const lemonPositions = [
            [0.62, -0.12, 0.52],
            [-0.65, -0.18, 0.42],
            [0.28, -0.32, -0.78],
            [-0.42, -0.28, -0.68],
        ];
        return (
            <group>
                <mesh position={[0, 0.55, 0]} castShadow>
                    <cylinderGeometry args={[0.14, 0.2, 1.1, 8]} />
                    <meshStandardMaterial color="#5d4037" />
                </mesh>
                <group position={[0, 1.4, 0]}>
                    <mesh><sphereGeometry args={[0.85, 16, 16]} /><meshStandardMaterial color="#5cb85c" /></mesh>
                    <mesh position={[0.5, -0.1, 0]}><sphereGeometry args={[0.55, 16, 16]} /><meshStandardMaterial color="#5cb85c" /></mesh>
                    <mesh position={[-0.45, -0.1, 0]}><sphereGeometry args={[0.55, 16, 16]} /><meshStandardMaterial color="#5cb85c" /></mesh>
                    {lemonPositions.map((pos, i) => (
                        <mesh key={i} position={pos as [number, number, number]}>
                            <sphereGeometry args={[0.11, 12, 12]} />
                            <meshStandardMaterial color="#f1c40f" emissive="#f6e58d" emissiveIntensity={0.15} />
                            <mesh position={[0, 0.12, 0]}>
                                <cylinderGeometry args={[0.015, 0.015, 0.05]} />
                                <meshStandardMaterial color="#2d6a4f" />
                            </mesh>
                        </mesh>
                    ))}
                </group>
            </group>
        );
    }

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
const Campfire = () => {
    const outerFlameRef = useRef<THREE.Mesh>(null);
    const midFlameRef = useRef<THREE.Mesh>(null);
    const innerFlameRef = useRef<THREE.Mesh>(null);
    const lightRef = useRef<THREE.PointLight>(null);

    useFrame((state) => {
        const t = state.clock.elapsedTime;
        const flicker = 0.9 + Math.sin(t * 8) * 0.08 + Math.sin(t * 13) * 0.05;
        if (outerFlameRef.current) {
            outerFlameRef.current.scale.set(1, 1 + flicker * 0.25, 1);
            outerFlameRef.current.position.y = 0.34 + Math.sin(t * 6) * 0.02;
            outerFlameRef.current.rotation.y = Math.sin(t * 2) * 0.07;
        }
        if (midFlameRef.current) {
            midFlameRef.current.scale.set(1, 1 + flicker * 0.22, 1);
            midFlameRef.current.position.y = 0.3 + Math.sin(t * 7) * 0.018;
            midFlameRef.current.rotation.y = Math.cos(t * 2.5) * 0.06;
        }
        if (innerFlameRef.current) {
            innerFlameRef.current.scale.set(1, 1 + flicker * 0.18, 1);
            innerFlameRef.current.position.y = 0.26 + Math.sin(t * 8) * 0.015;
            innerFlameRef.current.rotation.y = Math.sin(t * 3) * 0.05;
        }
        if (lightRef.current) {
            lightRef.current.intensity = 1.7 + Math.sin(t * 10) * 0.35 + Math.sin(t * 4) * 0.15;
        }
    });

    const logAngles = [0, (2 * Math.PI) / 3, (4 * Math.PI) / 3];

    return (
        <group>
            {/* Logs */}
            {logAngles.map((a, i) => (
                <mesh key={i} position={[Math.cos(a) * 0.12, 0.1, Math.sin(a) * 0.12]} rotation={[Math.PI / 2, a, 0.08]}>
                    <cylinderGeometry args={[0.07, 0.08, 0.7]} />
                    <meshStandardMaterial color="#5d4037" roughness={0.9} />
                </mesh>
            ))}
            <mesh position={[0, 0.06, 0]} rotation={[Math.PI / 2, 0, 0]}>
                <circleGeometry args={[0.22, 16]} />
                <meshStandardMaterial color="#4b2e24" roughness={1} />
            </mesh>

            {/* Flames */}
            <mesh ref={outerFlameRef} position={[0, 0.36, 0]} rotation={[0, 0.2, 0]}>
                <coneGeometry args={[0.22, 0.6, 16]} />
                <MeshDistortMaterial color="#ff4d2d" distort={0.32} speed={2.4} transparent opacity={0.9} />
            </mesh>
            <mesh ref={midFlameRef} position={[0, 0.3, 0]} rotation={[0, -0.3, 0]}>
                <coneGeometry args={[0.16, 0.45, 16]} />
                <MeshDistortMaterial color="#ff8c2a" distort={0.28} speed={2.8} transparent opacity={0.9} />
            </mesh>
            <mesh ref={innerFlameRef} position={[0, 0.26, 0]} rotation={[0, 0.4, 0]}>
                <coneGeometry args={[0.11, 0.32, 16]} />
                <MeshDistortMaterial color="#ffd36a" distort={0.2} speed={3.2} transparent opacity={0.95} />
            </mesh>
            <pointLight ref={lightRef} position={[0, 0.45, 0]} intensity={1.8} distance={5} color="#ffab91" decay={2} />
        </group>
    );
};
const CookingPot = () => ( <group> <mesh position={[0, 0.25, 0]}><cylinderGeometry args={[0.25, 0.2, 0.4]} /><meshStandardMaterial color="#37474f" /></mesh> <mesh position={[0, 0.45, 0]}><cylinderGeometry args={[0.26, 0.26, 0.05]} /><meshStandardMaterial color="#455a64" /></mesh> <mesh position={[0, 0.4, 0]} rotation={[-Math.PI/2, 0, 0]}><circleGeometry args={[0.22]} /><meshStandardMaterial color="#d84315" /></mesh> </group> );
const CoffeePot = () => {
    const steamRefs = useRef<THREE.Mesh[]>([]);

    useFrame((state) => {
        const t = state.clock.elapsedTime;
        steamRefs.current.forEach((mesh, i) => {
            if (!mesh) return;
            const phase = (t * 0.18 + i * 0.4) % 1;
            mesh.position.y = 0.62 + phase * 0.25;
            mesh.position.x = Math.sin((t + i) * 1.7) * 0.02;
            mesh.position.z = Math.cos((t + i) * 1.5) * 0.02;
            const scale = 0.55 + phase * 0.6;
            mesh.scale.setScalar(scale);
            const mat = mesh.material as THREE.MeshStandardMaterial;
            if (mat) mat.opacity = 0.28 * (1 - phase);
        });
    });

    const glassMaterialProps = {
        color: '#f7f7f7',
        transparent: true,
        opacity: 0.55,
        transmission: 0.85,
        roughness: 0.12,
        thickness: 0.2,
        ior: 1.45
    };

    return (
        <group>
            {/* Glass Carafe */}
            <mesh position={[0, 0.22, 0]}>
                <cylinderGeometry args={[0.18, 0.2, 0.36, 20]} />
                <meshPhysicalMaterial {...glassMaterialProps} />
            </mesh>
            <mesh position={[0, 0.41, 0]}>
                <cylinderGeometry args={[0.11, 0.13, 0.12, 20]} />
                <meshPhysicalMaterial {...glassMaterialProps} />
            </mesh>
            <mesh position={[0, 0.02, 0]}>
                <cylinderGeometry args={[0.2, 0.22, 0.04, 20]} />
                <meshStandardMaterial color="#dfe6e9" metalness={0.2} roughness={0.6} />
            </mesh>

            {/* Coffee Liquid */}
            <mesh position={[0, 0.2, 0]}>
                <cylinderGeometry args={[0.16, 0.17, 0.2, 20]} />
                <meshStandardMaterial color="#5a3b24" roughness={0.4} metalness={0.1} transparent opacity={0.9} />
            </mesh>

            {/* Handle + Spout */}
            <mesh position={[0.22, 0.28, 0]} rotation={[0, 0, Math.PI / 2]}>
                <torusGeometry args={[0.08, 0.02, 8, 16, Math.PI]} />
                <meshStandardMaterial color="#37474f" roughness={0.7} />
            </mesh>
            <mesh position={[-0.2, 0.3, 0.06]} rotation={[0, 0, -0.5]}>
                <coneGeometry args={[0.05, 0.12, 12]} />
                <meshStandardMaterial color="#37474f" roughness={0.7} />
            </mesh>

            {/* Dripper */}
            <mesh position={[0, 0.54, 0]}>
                <coneGeometry args={[0.16, 0.2, 20]} />
                <meshStandardMaterial color="#2d3436" roughness={0.8} />
            </mesh>
            <mesh position={[0, 0.54, 0]}>
                <coneGeometry args={[0.12, 0.16, 20]} />
                <meshStandardMaterial color="#fafafa" roughness={0.6} />
            </mesh>

            {/* Steam */}
            {[0, 1, 2].map((i) => (
                <mesh
                    key={i}
                    ref={(el) => {
                        if (el) steamRefs.current[i] = el;
                    }}
                    position={[0, 0.62, 0]}
                >
                    <coneGeometry args={[0.05, 0.18, 12]} />
                    <meshStandardMaterial color="#ffffff" transparent opacity={0.25} />
                </mesh>
            ))}
        </group>
    );
};
const CampingBurner = () => (
    <group>
        <mesh position={[0, 0.05, 0]}>
            <cylinderGeometry args={[0.26, 0.26, 0.1, 24]} />
            <meshStandardMaterial color="#2d3436" />
        </mesh>
        <mesh position={[0, 0.1, 0]}>
            <torusGeometry args={[0.12, 0.02, 8, 20]} />
            <meshStandardMaterial color="#636e72" />
        </mesh>
        {[0, (2 * Math.PI) / 3, (4 * Math.PI) / 3].map((a, i) => (
            <mesh key={i} position={[Math.cos(a) * 0.16, 0.12, Math.sin(a) * 0.16]} rotation={[0, a, 0]}>
                <boxGeometry args={[0.08, 0.02, 0.2]} />
                <meshStandardMaterial color="#7f8c8d" />
            </mesh>
        ))}
        <mesh position={[0, -0.1, 0]}>
            <cylinderGeometry args={[0.12, 0.16, 0.18, 20]} />
            <meshStandardMaterial color="#c0392b" />
        </mesh>
        <mesh position={[0.18, -0.05, 0]}>
            <cylinderGeometry args={[0.03, 0.03, 0.08, 12]} />
            <meshStandardMaterial color="#d35400" />
        </mesh>
    </group>
);
const RamenPot = () => (
    <group>
        <mesh position={[0, 0.18, 0]}>
            <cylinderGeometry args={[0.24, 0.22, 0.26, 24]} />
            <meshStandardMaterial color="#f0c36d" metalness={0.25} roughness={0.6} />
        </mesh>
        <mesh position={[0, 0.32, 0]}>
            <cylinderGeometry args={[0.25, 0.25, 0.04, 24]} />
            <meshStandardMaterial color="#f7d38f" metalness={0.2} roughness={0.5} />
        </mesh>
        <mesh position={[0, 0.26, 0]} rotation={[-Math.PI/2, 0, 0]}>
            <circleGeometry args={[0.2, 24]} />
            <meshStandardMaterial color="#ff6f3d" />
        </mesh>
        <mesh position={[0.28, 0.22, 0]} rotation={[0, 0, Math.PI/2]}>
            <torusGeometry args={[0.06, 0.02, 8, 16, Math.PI]} />
            <meshStandardMaterial color="#f0c36d" />
        </mesh>
        <mesh position={[-0.28, 0.22, 0]} rotation={[0, 0, -Math.PI/2]}>
            <torusGeometry args={[0.06, 0.02, 8, 16, Math.PI]} />
            <meshStandardMaterial color="#f0c36d" />
        </mesh>
    </group>
);
const SpoonChopsticksSet = () => (
    <group>
        <mesh position={[0, 0.02, 0]}>
            <cylinderGeometry args={[0.18, 0.18, 0.04, 20]} />
            <meshStandardMaterial color="#ecf0f1" />
        </mesh>
        <mesh position={[0.04, 0.06, 0]} rotation={[0, 0, 0.2]}>
            <cylinderGeometry args={[0.01, 0.01, 0.24, 12]} />
            <meshStandardMaterial color="#bdc3c7" />
        </mesh>
        <mesh position={[0.07, 0.1, 0]} rotation={[0, 0, 0.2]}>
            <sphereGeometry args={[0.03, 12, 12]} />
            <meshStandardMaterial color="#bdc3c7" />
        </mesh>
        <mesh position={[-0.04, 0.06, 0.02]} rotation={[0, 0.05, 0.6]}>
            <cylinderGeometry args={[0.005, 0.005, 0.28, 10]} />
            <meshStandardMaterial color="#8e8e8e" />
        </mesh>
        <mesh position={[-0.02, 0.06, -0.02]} rotation={[0, -0.05, 0.6]}>
            <cylinderGeometry args={[0.005, 0.005, 0.28, 10]} />
            <meshStandardMaterial color="#8e8e8e" />
        </mesh>
    </group>
);
const ChocoCookie = () => (
    <group>
        <mesh position={[-0.08, 0.03, 0]} rotation={[0, Math.PI / 2, 0]}>
            <cylinderGeometry args={[0.14, 0.14, 0.06, 24, 1, false, 0, Math.PI]} />
            <meshStandardMaterial color="#3b2a1e" roughness={0.9} />
        </mesh>
        <mesh position={[0.08, 0.03, 0]} rotation={[0, -Math.PI / 2, 0]}>
            <cylinderGeometry args={[0.14, 0.14, 0.06, 24, 1, false, 0, Math.PI]} />
            <meshStandardMaterial color="#3b2a1e" roughness={0.9} />
        </mesh>
        <mesh position={[-0.08, 0.03, 0]} rotation={[0, Math.PI / 2, 0]}>
            <cylinderGeometry args={[0.11, 0.11, 0.04, 24, 1, false, 0, Math.PI]} />
            <meshStandardMaterial color="#b7e08a" />
        </mesh>
        <mesh position={[0.08, 0.03, 0]} rotation={[0, -Math.PI / 2, 0]}>
            <cylinderGeometry args={[0.11, 0.11, 0.04, 24, 1, false, 0, Math.PI]} />
            <meshStandardMaterial color="#b7e08a" />
        </mesh>
    </group>
);
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
const WoodenStreetLamp = () => (
    <group>
        <mesh position={[0, 1.2, 0]} castShadow>
            <cylinderGeometry args={[0.08, 0.1, 2.4, 10]} />
            <meshStandardMaterial color="#5b3a29" roughness={0.8} />
        </mesh>
        <mesh position={[0.35, 2.2, 0]} rotation={[0, 0, Math.PI / 2]}>
            <cylinderGeometry args={[0.04, 0.04, 0.7, 10]} />
            <meshStandardMaterial color="#5b3a29" roughness={0.8} />
        </mesh>
        <group position={[0.7, 2.2, 0]}>
            <mesh position={[0, 0, 0]}>
                <boxGeometry args={[0.35, 0.4, 0.35]} />
                <meshStandardMaterial color="#2d3436" />
            </mesh>
            <mesh position={[0, 0, 0]}>
                <boxGeometry args={[0.28, 0.28, 0.28]} />
                <meshPhysicalMaterial color="#fff6d6" emissive="#ffe7b3" emissiveIntensity={0.35} transparent opacity={0.55} transmission={0.85} roughness={0.15} thickness={0.2} ior={1.45} />
            </mesh>
            <mesh position={[0, 0, 0]}>
                <sphereGeometry args={[0.06, 16, 16]} />
                <meshStandardMaterial color="#fff1b8" emissive="#ffdca0" emissiveIntensity={1.2} />
            </mesh>
            <pointLight position={[0, 0, 0]} intensity={2.0} distance={7} color="#ffe7b3" decay={2} />
        </group>
    </group>
);
const Candle = () => (
    <group>
        <mesh position={[0, 0.08, 0]}>
            <cylinderGeometry args={[0.07, 0.08, 0.16, 16]} />
            <meshStandardMaterial color="#f6f1e1" />
        </mesh>
        <mesh position={[0, 0.17, 0]}>
            <coneGeometry args={[0.03, 0.08, 12]} />
            <meshStandardMaterial color="#ffd36a" emissive="#ffb84d" emissiveIntensity={0.9} />
        </mesh>
        <pointLight position={[0, 0.18, 0]} intensity={0.9} distance={3} color="#ffd9a6" decay={2} />
    </group>
);
const Flashlight = () => (
    <group>
        <mesh position={[0, 0.06, 0]} rotation={[Math.PI / 2, 0, 0]}>
            <cylinderGeometry args={[0.05, 0.06, 0.3, 16]} />
            <meshStandardMaterial color="#2f3640" />
        </mesh>
        <mesh position={[0, 0.06, 0.17]} rotation={[Math.PI / 2, 0, 0]}>
            <cylinderGeometry args={[0.065, 0.07, 0.05, 16]} />
            <meshStandardMaterial color="#3d3d3d" />
        </mesh>
        <mesh position={[0, 0.06, 0.2]}>
            <circleGeometry args={[0.05, 16]} />
            <meshStandardMaterial color="#fff3c4" emissive="#ffe7b3" emissiveIntensity={1} />
        </mesh>
        <pointLight position={[0, 0.06, 0.26]} intensity={1.4} distance={4} color="#fff3c4" decay={2} />
    </group>
);
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
const Sunbed = () => {
    const seatY = 0.22;
    const seatZ = 0.1;
    const seatLength = 0.9;
    const backLength = 0.9;
    const backAngle = 0.55;
    const backPivotZ = seatZ - seatLength / 2;

    return (
        <group>
            {/* Seat */}
            <mesh position={[0, seatY, seatZ]}>
                <boxGeometry args={[0.7, 0.08, seatLength]} />
                <meshStandardMaterial color="#d35400" />
            </mesh>
            <mesh position={[0, seatY + 0.04, seatZ]}>
                <boxGeometry args={[0.6, 0.05, seatLength - 0.05]} />
                <meshStandardMaterial color="white" />
            </mesh>

            {/* Backrest */}
            <group position={[0, seatY, backPivotZ]} rotation={[backAngle, 0, 0]}>
                <mesh position={[0, 0, -backLength / 2]}>
                    <boxGeometry args={[0.7, 0.08, backLength]} />
                    <meshStandardMaterial color="#d35400" />
                </mesh>
                <mesh position={[0, 0.04, -backLength / 2]}>
                    <boxGeometry args={[0.6, 0.05, backLength - 0.05]} />
                    <meshStandardMaterial color="white" />
                </mesh>
                <mesh position={[0, 0.12, -backLength + 0.2]} rotation={[0.05, 0, 0]}>
                    <boxGeometry args={[0.5, 0.06, 0.3]} />
                    <meshStandardMaterial color="#74b9ff" />
                </mesh>
            </group>
            {/* Legs */}
            <mesh position={[0.3, 0.11, seatZ + seatLength / 2]}>
                <cylinderGeometry args={[0.03, 0.03, 0.22]} />
                <meshStandardMaterial color="#d35400" />
            </mesh>
            <mesh position={[-0.3, 0.11, seatZ + seatLength / 2]}>
                <cylinderGeometry args={[0.03, 0.03, 0.22]} />
                <meshStandardMaterial color="#d35400" />
            </mesh>
            <mesh position={[0.3, 0.11, backPivotZ]}>
                <cylinderGeometry args={[0.03, 0.03, 0.22]} />
                <meshStandardMaterial color="#d35400" />
            </mesh>
            <mesh position={[-0.3, 0.11, backPivotZ]}>
                <cylinderGeometry args={[0.03, 0.03, 0.22]} />
                <meshStandardMaterial color="#d35400" />
            </mesh>
        </group>
    );
};

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

const DuckFloat = () => (
    <group>
        {/* Ring */}
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.08, 0]}>
            <torusGeometry args={[0.6, 0.16, 16, 32]} />
            <meshStandardMaterial color="#f1c40f" />
        </mesh>
        {/* Duck body */}
        <mesh position={[0, 0.22, 0.15]}>
            <sphereGeometry args={[0.22, 16, 16]} />
            <meshStandardMaterial color="#f1c40f" />
        </mesh>
        {/* Duck head */}
        <mesh position={[0, 0.38, 0.32]}>
            <sphereGeometry args={[0.14, 16, 16]} />
            <meshStandardMaterial color="#f1c40f" />
        </mesh>
        {/* Beak */}
        <mesh position={[0, 0.34, 0.46]} rotation={[0.1, 0, 0]}>
            <boxGeometry args={[0.12, 0.06, 0.08]} />
            <meshStandardMaterial color="#e67e22" />
        </mesh>
        {/* Eyes */}
        <mesh position={[-0.05, 0.4, 0.42]}>
            <sphereGeometry args={[0.02, 12, 12]} />
            <meshStandardMaterial color="#2d3436" />
        </mesh>
        <mesh position={[0.05, 0.4, 0.42]}>
            <sphereGeometry args={[0.02, 12, 12]} />
            <meshStandardMaterial color="#2d3436" />
        </mesh>
    </group>
);

const DuckFeet = () => (
    <group>
        {/* Left foot */}
        <mesh position={[-0.22, 0.05, 0.1]} rotation={[-Math.PI / 2, 0, 0.1]}>
            <coneGeometry args={[0.22, 0.05, 3]} />
            <meshStandardMaterial color="#4da3ff" />
        </mesh>
        <mesh position={[-0.08, 0.05, 0.12]} rotation={[-Math.PI / 2, 0, -0.1]}>
            <coneGeometry args={[0.18, 0.05, 3]} />
            <meshStandardMaterial color="#4da3ff" />
        </mesh>

        {/* Right foot */}
        <mesh position={[0.22, 0.05, 0.1]} rotation={[-Math.PI / 2, 0, -0.1]}>
            <coneGeometry args={[0.22, 0.05, 3]} />
            <meshStandardMaterial color="#4da3ff" />
        </mesh>
        <mesh position={[0.08, 0.05, 0.12]} rotation={[-Math.PI / 2, 0, 0.1]}>
            <coneGeometry args={[0.18, 0.05, 3]} />
            <meshStandardMaterial color="#4da3ff" />
        </mesh>

        {/* Ankles */}
        <mesh position={[-0.18, 0.11, 0]}>
            <cylinderGeometry args={[0.03, 0.03, 0.12]} />
            <meshStandardMaterial color="#2d3436" />
        </mesh>
        <mesh position={[0.18, 0.11, 0]}>
            <cylinderGeometry args={[0.03, 0.03, 0.12]} />
            <meshStandardMaterial color="#2d3436" />
        </mesh>
    </group>
);

const SmallPicnicTable = () => (
    <group>
        {/* Tabletop */}
        <mesh position={[0, 0.24, 0]}>
            <boxGeometry args={[1.0, 0.08, 0.6]} />
            <meshStandardMaterial color="#d08c3f" />
        </mesh>
        {/* Table legs */}
        {[
            [-0.4, 0.12, -0.22],
            [0.4, 0.12, -0.22],
            [-0.4, 0.12, 0.22],
            [0.4, 0.12, 0.22],
        ].map((pos, i) => (
            <mesh key={i} position={pos as [number, number, number]}>
                <boxGeometry args={[0.08, 0.24, 0.08]} />
                <meshStandardMaterial color="#8d6e63" />
            </mesh>
        ))}
        {/* Benches */}
        <mesh position={[0, 0.14, -0.4]}>
            <boxGeometry args={[1.0, 0.06, 0.2]} />
            <meshStandardMaterial color="#c27c35" />
        </mesh>
        <mesh position={[0, 0.14, 0.4]}>
            <boxGeometry args={[1.0, 0.06, 0.2]} />
            <meshStandardMaterial color="#c27c35" />
        </mesh>
        {/* Bench legs */}
        {[
            [-0.4, 0.07, -0.4],
            [0.4, 0.07, -0.4],
            [-0.4, 0.07, 0.4],
            [0.4, 0.07, 0.4],
        ].map((pos, i) => (
            <mesh key={`b-${i}`} position={pos as [number, number, number]}>
                <boxGeometry args={[0.06, 0.14, 0.06]} />
                <meshStandardMaterial color="#8d6e63" />
            </mesh>
        ))}
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
                <mesh position={[0.08, 0.02, 0.13]}><sphereGeometry args={[0.025]} /><meshBasicMaterial color="#111" /></mesh>
                <mesh position={[-0.08, 0.02, 0.13]}><sphereGeometry args={[0.025]} /><meshBasicMaterial color="#111" /></mesh>
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

const QuokkaModel = () => (
    <group>
        {/* Body */}
        <mesh position={[0, 0.28, 0]}><capsuleGeometry args={[0.22, 0.32]} /><meshToonMaterial color="#b97a4f" /></mesh>
        <mesh position={[0, 0.22, 0.05]} scale={[0.9, 0.7, 0.9]}><sphereGeometry args={[0.16]} /><meshToonMaterial color="#d9a46f" /></mesh>

        {/* Head */}
        <group position={[0, 0.55, 0.08]}>
            <mesh><sphereGeometry args={[0.22]} /><meshToonMaterial color="#b97a4f" /></mesh>
            {/* Ears */}
            <mesh position={[0.14, 0.16, -0.02]}><sphereGeometry args={[0.06]} /><meshToonMaterial color="#b97a4f" /></mesh>
            <mesh position={[-0.14, 0.16, -0.02]}><sphereGeometry args={[0.06]} /><meshToonMaterial color="#b97a4f" /></mesh>
            {/* Muzzle */}
            <mesh position={[0, -0.02, 0.18]} scale={[1, 0.7, 1.1]}>
                <sphereGeometry args={[0.11]} />
                <meshToonMaterial color="#e4b47b" />
            </mesh>
            <mesh position={[0, 0.02, 0.26]}><sphereGeometry args={[0.03]} /><meshBasicMaterial color="#2d3436" /></mesh>
            {/* Eyes */}
            <mesh position={[0.08, 0.05, 0.17]}><sphereGeometry args={[0.02]} /><meshBasicMaterial color="#111" /></mesh>
            <mesh position={[-0.08, 0.05, 0.17]}><sphereGeometry args={[0.02]} /><meshBasicMaterial color="#111" /></mesh>
            {/* Smile */}
            <mesh position={[0, -0.03, 0.2]} rotation={[0, 0, 0]}>
                <torusGeometry args={[0.04, 0.006, 8, 16, Math.PI]} />
                <meshBasicMaterial color="#5d4037" />
            </mesh>
        </group>

        {/* Legs */}
        <mesh position={[0.12, 0.08, 0.12]}><capsuleGeometry args={[0.06, 0.18]} /><meshToonMaterial color="#a8683f" /></mesh>
        <mesh position={[-0.12, 0.08, 0.12]}><capsuleGeometry args={[0.06, 0.18]} /><meshToonMaterial color="#a8683f" /></mesh>
        <mesh position={[0.12, 0.08, -0.08]}><capsuleGeometry args={[0.06, 0.18]} /><meshToonMaterial color="#a8683f" /></mesh>
        <mesh position={[-0.12, 0.08, -0.08]}><capsuleGeometry args={[0.06, 0.18]} /><meshToonMaterial color="#a8683f" /></mesh>

        {/* Tail */}
        <mesh position={[0, 0.2, -0.22]} rotation={[0.6, 0, 0]}>
            <capsuleGeometry args={[0.04, 0.16]} />
            <meshToonMaterial color="#a8683f" />
        </mesh>
    </group>
);

const CatModel = ({ base = "#f1c40f", spot = "#d35400", spots = false }: { base?: string; spot?: string; spots?: boolean }) => (
    <group>
        {/* Body */}
        <mesh position={[0, 0.22, 0]}><capsuleGeometry args={[0.18, 0.38]} /><meshToonMaterial color={base} /></mesh>
        <mesh position={[0, 0.18, 0]} scale={[1.1, 0.6, 1.2]}><sphereGeometry args={[0.18]} /><meshToonMaterial color={base} /></mesh>

        {/* Head */}
        <group position={[0, 0.5, 0.22]}>
            <mesh><sphereGeometry args={[0.2]} /><meshToonMaterial color={base} /></mesh>
            {/* Ears */}
            <mesh position={[0.12, 0.16, -0.02]} rotation={[0, 0, 0.2]}><coneGeometry args={[0.06, 0.16]} /><meshToonMaterial color={base} /></mesh>
            <mesh position={[-0.12, 0.16, -0.02]} rotation={[0, 0, -0.2]}><coneGeometry args={[0.06, 0.16]} /><meshToonMaterial color={base} /></mesh>
            {/* Eyes */}
            <mesh position={[0.07, 0.05, 0.16]}><sphereGeometry args={[0.02]} /><meshBasicMaterial color="#111" /></mesh>
            <mesh position={[-0.07, 0.05, 0.16]}><sphereGeometry args={[0.02]} /><meshBasicMaterial color="#111" /></mesh>
            {/* Nose */}
            <mesh position={[0, 0.02, 0.2]}><sphereGeometry args={[0.02]} /><meshBasicMaterial color="#333" /></mesh>
            {/* Whiskers - horizontal, slightly inward */}
            {[0.03, 0, -0.03].map((y, i) => (
                <mesh key={`wh-r-${i}`} position={[0.12, y, 0.18]} rotation={[0, -0.25, Math.PI / 2]}>
                    <cylinderGeometry args={[0.003, 0.003, 0.16]} />
                    <meshBasicMaterial color="#333" />
                </mesh>
            ))}
            {[0.03, 0, -0.03].map((y, i) => (
                <mesh key={`wh-l-${i}`} position={[-0.12, y, 0.18]} rotation={[0, 0.25, Math.PI / 2]}>
                    <cylinderGeometry args={[0.003, 0.003, 0.16]} />
                    <meshBasicMaterial color="#333" />
                </mesh>
            ))}
        </group>

        {/* Legs - quadruped stance */}
        <mesh position={[0.12, 0.08, 0.18]} rotation={[0.1, 0, 0]}>
            <capsuleGeometry args={[0.045, 0.2]} />
            <meshToonMaterial color={base} />
        </mesh>
        <mesh position={[-0.12, 0.08, 0.18]} rotation={[0.1, 0, 0]}>
            <capsuleGeometry args={[0.045, 0.2]} />
            <meshToonMaterial color={base} />
        </mesh>
        <mesh position={[0.12, 0.08, -0.14]} rotation={[-0.1, 0, 0]}>
            <capsuleGeometry args={[0.045, 0.2]} />
            <meshToonMaterial color={base} />
        </mesh>
        <mesh position={[-0.12, 0.08, -0.14]} rotation={[-0.1, 0, 0]}>
            <capsuleGeometry args={[0.045, 0.2]} />
            <meshToonMaterial color={base} />
        </mesh>

        {/* Tail */}
        <mesh position={[0, 0.28, -0.32]} rotation={[0.9, 0, 0]}>
            <capsuleGeometry args={[0.035, 0.4]} />
            <meshToonMaterial color={base} />
        </mesh>

        {spots && (
            <group>
                <mesh position={[0.12, 0.25, 0.05]}><sphereGeometry args={[0.05]} /><meshToonMaterial color={spot} /></mesh>
                <mesh position={[-0.1, 0.18, -0.08]}><sphereGeometry args={[0.04]} /><meshToonMaterial color={spot} /></mesh>
                <mesh position={[0.02, 0.32, -0.12]}><sphereGeometry args={[0.035]} /><meshToonMaterial color={spot} /></mesh>
            </group>
        )}
    </group>
);


// --- Camera Controller ---
const CameraController = ({ playerRef, controlsRef, isEditMode }: { playerRef: React.RefObject<THREE.Group>, controlsRef: React.RefObject<any>, isEditMode?: boolean }) => {
  const prevPos = useRef(new THREE.Vector3());
  const isInitialized = useRef(false);
  useFrame((state) => {
    if (!playerRef.current || !controlsRef.current) return;
    
    // In edit mode, keep camera still
    if (isEditMode) return;
    
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
const Player = ({ avatar, playerRef, isPartner = false, moveTarget, setMoveTarget, obstacles = [], getGroundY }: { avatar: AvatarState, playerRef: React.RefObject<THREE.Group>, isPartner?: boolean, moveTarget?: [number, number, number] | null, setMoveTarget?: (target: [number, number, number] | null) => void, obstacles?: Array<{ position: [number, number, number]; radius: number }>, getGroundY?: (x: number, z: number) => number }) => {
  const leftLeg = useRef<THREE.Group>(null);
  const rightLeg = useRef<THREE.Group>(null);
  const leftArm = useRef<THREE.Group>(null);
  const rightArm = useRef<THREE.Group>(null);
  const groupRef = useRef<THREE.Group>(null);
  const avoidVec = useMemo(() => new THREE.Vector3(), []);
  const steerVec = useMemo(() => new THREE.Vector3(), []);
  const nextPos = useMemo(() => new THREE.Vector3(), []);
  const tempVec = useMemo(() => new THREE.Vector3(), []);
  
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
    let wantsJump = false;
    
    // Only main avatar moves with keyboard/mobile
    if (!isPartner && avatar.pose === 'IDLE') {
        const { forward, backward, left, right, jump } = getKeys();
        
        // Merge inputs
        const isForward = forward;
        const isBackward = backward;
        const isLeft = left;
        const isRight = right;
        const isJump = jump;
        const hasManualInput = isForward || isBackward || isLeft || isRight || isJump;
        wantsJump = isJump;

        const applySteeredMove = (dir: THREE.Vector3) => {
            if (dir.lengthSq() === 0) return { moved: false, moveVec: tempVec.set(0, 0, 0) };
            const desiredDir = dir.clone().normalize();
            const stepSize = MOVEMENT_SPEED * delta;
            const currentX = groupRef.current!.position.x;
            const currentZ = groupRef.current!.position.z;
            nextPos.set(currentX, 0, currentZ).addScaledVector(desiredDir, stepSize);

            avoidVec.set(0, 0, 0);
            obstacles.forEach(obs => {
                const minDist = obs.radius + 0.35;
                tempVec.set(obs.position[0], 0, obs.position[2]);
                const dist = nextPos.distanceTo(tempVec);
                if (dist < minDist) {
                    const away = nextPos.clone().sub(tempVec);
                    if (away.lengthSq() < 0.0001) {
                        away.set(desiredDir.z, 0, -desiredDir.x);
                    }
                    away.normalize().multiplyScalar((minDist - dist) / minDist);
                    avoidVec.add(away);
                }
            });

            if (avoidVec.lengthSq() > 0) {
                steerVec.copy(desiredDir).addScaledVector(avoidVec, 1.6).normalize();
                nextPos.set(currentX, 0, currentZ).addScaledVector(steerVec, stepSize);
            }

            if (nextPos.length() > ISLAND_RADIUS - 1) nextPos.setLength(ISLAND_RADIUS - 1);

            obstacles.forEach(obs => {
                const minDist = obs.radius + 0.3;
                tempVec.set(obs.position[0], 0, obs.position[2]);
                const dist = nextPos.distanceTo(tempVec);
                if (dist < minDist) {
                    const away = nextPos.clone().sub(tempVec);
                    if (away.lengthSq() < 0.0001) {
                        away.set(desiredDir.z, 0, -desiredDir.x);
                    }
                    away.normalize();
                    nextPos.copy(tempVec).addScaledVector(away, minDist);
                }
            });

            if (nextPos.length() > ISLAND_RADIUS - 1) nextPos.setLength(ISLAND_RADIUS - 1);

            const moveVec = new THREE.Vector3(nextPos.x - currentX, 0, nextPos.z - currentZ);
            if (moveVec.lengthSq() > 0.00001) {
                groupRef.current!.position.x = nextPos.x;
                groupRef.current!.position.z = nextPos.z;
                return { moved: true, moveVec };
            }
            return { moved: false, moveVec };
        };

        if (hasManualInput) {
            if (moveTarget && setMoveTarget) setMoveTarget(null);
            const velocity = new THREE.Vector3();
            if (isForward) velocity.z -= 1;
            if (isBackward) velocity.z += 1;
            if (isLeft) velocity.x -= 1;
            if (isRight) velocity.x += 1;
            
            // Horizontal Movement
            if (velocity.length() > 0) {
                const { moved, moveVec } = applySteeredMove(velocity);
                isMoving = moved;
                if (moved) {
                    const targetRotation = Math.atan2(moveVec.x, moveVec.z);
                    const angleDiff = targetRotation - groupRef.current.rotation.y;
                    let normalizedDiff = ((angleDiff + Math.PI) % (2 * Math.PI)) - Math.PI;
                    groupRef.current.rotation.y += normalizedDiff * 0.15;
                }
            }
        } else if (moveTarget) {
            const target = new THREE.Vector3(moveTarget[0], 0, moveTarget[2]);
            const toTarget = target.clone().sub(groupRef.current.position);
            toTarget.y = 0;
            const dist = toTarget.length();
            if (dist < 0.15) {
                if (setMoveTarget) setMoveTarget(null);
            } else {
                const { moved, moveVec } = applySteeredMove(toTarget);
                isMoving = moved;
                if (moved) {
                    const targetRotation = Math.atan2(moveVec.x, moveVec.z);
                    const angleDiff = targetRotation - groupRef.current.rotation.y;
                    let normalizedDiff = ((angleDiff + Math.PI) % (2 * Math.PI)) - Math.PI;
                    groupRef.current.rotation.y += normalizedDiff * 0.15;
                }
            }
        }

    }

    const groundY = getGroundY ? getGroundY(groupRef.current.position.x, groupRef.current.position.z) : 0;

    // Jump Logic
    if (wantsJump && !isJumping.current && groupRef.current.position.y <= groundY + 0.1) {
        velocityY.current = 5; // Initial jump velocity
        isJumping.current = true;
    }

    // Apply Physics (Gravity)
    if (isJumping.current || groupRef.current.position.y > groundY) {
        velocityY.current -= 9.8 * delta; // Gravity
        groupRef.current.position.y += velocityY.current * delta;

        // Ground collision
        if (groupRef.current.position.y <= groundY) {
            groupRef.current.position.y = groundY;
            velocityY.current = 0;
            isJumping.current = false;
        }
    }

    // Poses Logic
    if (avatar.pose === 'SIT') {
        if(groupRef.current) {
            groupRef.current.rotation.x = 0;
            groupRef.current.rotation.z = 0;
            groupRef.current.position.y = groundY;
        }
        if(leftLeg.current) leftLeg.current.rotation.x = -Math.PI / 2;
        if(rightLeg.current) rightLeg.current.rotation.x = -Math.PI / 2;
        return; 
    } else if (avatar.pose === 'LIE') {
        if(groupRef.current) {
            groupRef.current.rotation.x = -Math.PI / 2; 
            groupRef.current.rotation.y = 0;
            groupRef.current.position.y = groundY;
        }
        if(leftLeg.current) leftLeg.current.rotation.x = 0;
        if(rightLeg.current) rightLeg.current.rotation.x = 0;
        return;
    } else {
        // IDLE / STAND
        if(groupRef.current && !isJumping.current) {
            groupRef.current.rotation.x = 0;
            groupRef.current.rotation.z = 0;
            groupRef.current.position.y = groundY;
        }
    }

    // Walking Animation
    if (isMoving && !isJumping.current && leftLeg.current && rightLeg.current && leftArm.current && rightArm.current) {
        const tLeg = state.clock.elapsedTime * 6;
        const tArm = state.clock.elapsedTime * 2;
        leftLeg.current.rotation.x = Math.sin(tLeg) * 0.6;
        rightLeg.current.rotation.x = Math.sin(tLeg + Math.PI) * 0.6;
        leftArm.current.rotation.x = Math.sin(tArm + Math.PI) * 0.25;
        rightArm.current.rotation.x = Math.sin(tArm) * 0.25;
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

  const skinToneMap: Record<string, string> = {
    TONE1: '#ffdecb',
    TONE2: '#f2c4a4',
    TONE3: '#d79a7a',
    TONE4: '#b87958'
  };
  const skinColor = skinToneMap[avatar.skinTone] ?? '#ffdecb';
  const blushTexture = useMemo(() => {
    const size = 128;
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d')!;
    const grad = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
    grad.addColorStop(0, 'rgba(255,255,255,1)');
    grad.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, size, size);
    const tex = new THREE.CanvasTexture(canvas);
    tex.needsUpdate = true;
    return tex;
  }, []);
  const checkMarkShape = useMemo(() => {
    const shape = new THREE.Shape();
    // V-shaped check: left tail a bit longer, right tail longest
    shape.moveTo(-0.36, 0.12);
    shape.lineTo(-0.22, -0.14);
    shape.lineTo(-0.12, -0.06);
    shape.lineTo(0.34, -0.32);
    shape.lineTo(0.46, -0.22);
    shape.lineTo(-0.04, 0.24);
    shape.lineTo(-0.26, 0.18);
    shape.closePath();
    return shape;
  }, []);

  const purpleGradientSkirtTexture = useMemo(() => {
    const size = 64;
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d')!;
    const grad = ctx.createLinearGradient(0, 0, 0, size);
    grad.addColorStop(0, '#5b2bd9');
    grad.addColorStop(1, '#7ecbff');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, size, size);
    const tex = new THREE.CanvasTexture(canvas);
    tex.needsUpdate = true;
    return tex;
  }, []);
  
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
        case 'YELLOW_RAINCOAT': return '#95a5a6';
        case 'PINK_BIKINI': return skinColor;
        case 'SKY_BIKINI_SKIRT': return skinColor;
        case 'PURPLE_BIKINI_GRADIENT_SKIRT': return skinColor;
        case 'BLACK_ONEPIECE': return skinColor;
        case 'BLACK_BOXERS': return skinColor; 
        case 'BLACK_RASHGUARD': return '#2d3436';
        default: return '#333';
    }
  }

  const getBody = () => {
    const shoulderWidth = torsoW;
    const torsoHeight = torsoH;
    const torsoDepth = torsoD;

    switch(avatar.outfit) {
        case 'PINK_BIKINI':
            return (
                <group position={[0, bodyCenterY, 0]}>
                    {/* Skin Torso */}
                    <mesh><boxGeometry args={[shoulderWidth, torsoHeight, torsoDepth]} /><meshToonMaterial color={skinColor} /></mesh>
                    {/* Bikini Top (continuous wrap) */}
                    <mesh position={[0, 0.1, 0]}>
                        <boxGeometry args={[shoulderWidth + 0.02, 0.15, torsoDepth + 0.04]} />
                        <meshToonMaterial color="#ff69b4" />
                    </mesh>
                    {/* Bikini Bottom */}
                    <mesh position={[0, -0.25, 0]}><boxGeometry args={[shoulderWidth + 0.01, 0.1, torsoDepth + 0.01]} /><meshToonMaterial color="#ff69b4" /></mesh>
                </group>
            );
        case 'SKY_BIKINI_SKIRT':
            return (
                <group position={[0, bodyCenterY, 0]}>
                    {/* Skin Torso */}
                    <mesh><boxGeometry args={[shoulderWidth, torsoHeight, torsoDepth]} /><meshToonMaterial color={skinColor} /></mesh>
                    {/* Bikini Top */}
                    <mesh position={[0, 0.1, 0]}>
                        <boxGeometry args={[shoulderWidth + 0.02, 0.15, torsoDepth + 0.04]} />
                        <meshToonMaterial color="#7ecbff" />
                    </mesh>
                    {/* Bikini Bottom */}
                    <mesh position={[0, -0.25, 0]}>
                        <boxGeometry args={[shoulderWidth + 0.01, 0.1, torsoDepth + 0.01]} />
                        <meshToonMaterial color="#7ecbff" />
                    </mesh>
                    {/* Skirt (fitted) */}
                    <mesh position={[0, -0.22, 0]}>
                        <boxGeometry args={[shoulderWidth + 0.02, 0.16, torsoDepth + 0.04]} />
                        <meshToonMaterial color="#7ecbff" />
                    </mesh>
                </group>
            );
        case 'PURPLE_BIKINI_GRADIENT_SKIRT':
            return (
                <group position={[0, bodyCenterY, 0]}>
                    {/* Skin Torso */}
                    <mesh><boxGeometry args={[shoulderWidth, torsoHeight, torsoDepth]} /><meshToonMaterial color={skinColor} /></mesh>
                    {/* Bikini Top */}
                    <mesh position={[0, 0.1, 0]}>
                        <boxGeometry args={[shoulderWidth + 0.02, 0.15, torsoDepth + 0.04]} />
                        <meshToonMaterial color="#5b2bd9" />
                    </mesh>
                    {/* Bikini Bottom */}
                    <mesh position={[0, -0.25, 0]}>
                        <boxGeometry args={[shoulderWidth + 0.01, 0.1, torsoDepth + 0.01]} />
                        <meshToonMaterial color="#5b2bd9" />
                    </mesh>
                    {/* Gradient Skirt (fitted) */}
                    <mesh position={[0, -0.22, 0]}>
                        <boxGeometry args={[shoulderWidth + 0.02, 0.16, torsoDepth + 0.04]} />
                        <meshToonMaterial map={purpleGradientSkirtTexture} color="white" />
                    </mesh>
                </group>
            );
        case 'BLACK_ONEPIECE':
            return (
                <group position={[0, bodyCenterY, 0]}>
                    <mesh><boxGeometry args={[shoulderWidth, torsoHeight, torsoDepth]} /><meshToonMaterial color="#2d3436" /></mesh>
                    {/* White check mark */}
                    <mesh position={[0.03, 0.08, 0.12]} rotation={[0, 0, Math.PI - 0.2]} scale={[-0.28, 0.28, 0.28]}>
                        <shapeGeometry args={[checkMarkShape]} />
                        <meshBasicMaterial color="white" side={THREE.DoubleSide} />
                    </mesh>
                    <mesh position={[0, -0.25, 0]}><boxGeometry args={[shoulderWidth + 0.01, 0.1, torsoDepth + 0.01]} /><meshToonMaterial color="#2d3436" /></mesh>
                </group>
            );
        case 'BLACK_BOXERS':
            return (
                <group position={[0, bodyCenterY, 0]}>
                    <mesh><boxGeometry args={[shoulderWidth, torsoHeight, torsoDepth]} /><meshToonMaterial color={skinColor} /></mesh>
                    <mesh position={[0, -0.25, 0]}><boxGeometry args={[shoulderWidth + 0.01, 0.15, torsoDepth + 0.01]} /><meshToonMaterial color="#2d3436" /></mesh>
                </group>
            );
        case 'BLACK_RASHGUARD':
            return (
                <group position={[0, bodyCenterY, 0]}>
                    <mesh><boxGeometry args={[shoulderWidth, torsoHeight, torsoDepth]} /><meshToonMaterial color="#2d3436" /></mesh>
                    <mesh position={[0, -0.25, 0]}><boxGeometry args={[shoulderWidth + 0.01, 0.1, torsoDepth + 0.01]} /><meshToonMaterial color="#2d3436" /></mesh>
                </group>
            );
        case 'JEANS_BLOUSE': 
            return (
                <group position={[0, bodyCenterY, 0]}>
                    <mesh><boxGeometry args={[shoulderWidth, torsoHeight, torsoDepth]} /><meshToonMaterial color="white" /></mesh>
                    <mesh position={[0, -0.25, 0]}><boxGeometry args={[shoulderWidth + 0.02, 0.1, torsoDepth + 0.02]} /><meshToonMaterial color="#3498db" /></mesh>
                </group>
            );
        case 'YELLOW_SHORTS':
            return (
                <group position={[0, bodyCenterY, 0]}>
                     <mesh><boxGeometry args={[shoulderWidth, torsoHeight, torsoDepth]} /><meshToonMaterial color="#f1c40f" /></mesh>
                     <mesh position={[0, -0.25, 0]}><boxGeometry args={[shoulderWidth + 0.02, 0.1, torsoDepth + 0.02]} /><meshToonMaterial color="#333" /></mesh>
                </group>
            );
        case 'BLACK_CHIC':
             return (
                <group position={[0, bodyCenterY, 0]}>
                    <mesh><boxGeometry args={[shoulderWidth, torsoHeight, torsoDepth]} /><meshToonMaterial color="#2d3436" /></mesh>
                </group>
             );
        case 'PINK_DRESS': 
            return (
                <group position={[0, bodyCenterY - 0.05, 0]}>
                    <mesh position={[0, 0.15, 0]}><boxGeometry args={[0.3, 0.3, 0.2]} /><meshToonMaterial color="#FFB7B2" /></mesh>
                    <mesh position={[0, -0.2, 0]}><coneGeometry args={[0.28, 0.6, 32]} /><meshToonMaterial color="#FFB7B2" /></mesh>
                </group>
            );
        case 'BLACK_SUIT':
            return (
                <group position={[0, bodyCenterY, 0]}>
                    <mesh><boxGeometry args={[shoulderWidth, torsoHeight, torsoDepth]} /><meshToonMaterial color="#2d3436" /></mesh>
                    <mesh position={[0, 0.1, 0.11]}><boxGeometry args={[0.05, 0.2, 0.01]} /><meshBasicMaterial color="white" /></mesh>
                </group>
            );
        case 'WHITE_SHIRT_JEANS':
            return (
                <group position={[0, bodyCenterY, 0]}>
                    <mesh><boxGeometry args={[shoulderWidth, torsoHeight, torsoDepth]} /><meshToonMaterial color="white" /></mesh>
                    <mesh position={[0, -0.25, 0]}><boxGeometry args={[shoulderWidth + 0.02, 0.1, torsoDepth + 0.02]} /><meshToonMaterial color="#3498db" /></mesh>
                </group>
            );
        case 'NAVY_HOODIE':
            return (
                <group position={[0, bodyCenterY, 0]}>
                    <mesh><boxGeometry args={[shoulderWidth, torsoHeight, torsoDepth]} /><meshToonMaterial color="#1a237e" /></mesh>
                    <mesh position={[0, 0.2, -0.1]} rotation={[0.5,0,0]}><torusGeometry args={[0.15, 0.05, 8, 16]} /><meshToonMaterial color="#1a237e" /></mesh>
                </group>
            );
        case 'GREY_HOODIE':
            return (
                <group position={[0, bodyCenterY, 0]}>
                    <mesh><boxGeometry args={[shoulderWidth, torsoHeight, torsoDepth]} /><meshToonMaterial color="#bdc3c7" /></mesh>
                    <mesh position={[0, 0.2, -0.1]} rotation={[0.5,0,0]}><torusGeometry args={[0.15, 0.05, 8, 16]} /><meshToonMaterial color="#bdc3c7" /></mesh>
                </group>
            );
        case 'YELLOW_RAINCOAT':
            return (
                <group position={[0, bodyCenterY, 0]}>
                    {/* Long raincoat to knee */}
                    <mesh position={[0, -0.14, 0]}>
                        <boxGeometry args={[0.42, 0.7, 0.28]} />
                        <meshToonMaterial color="#f1c40f" />
                    </mesh>
                    {/* Front placket */}
                    <mesh position={[0, -0.14, 0.15]}>
                        <boxGeometry args={[0.1, 0.7, 0.02]} />
                        <meshToonMaterial color="#f6c453" />
                    </mesh>
                    {/* Snap buttons */}
                    {[-0.32, -0.12, 0.08, 0.28].map((y, i) => (
                        <mesh key={`rain-btn-${i}`} position={[0, y, 0.165]}>
                            <cylinderGeometry args={[0.018, 0.018, 0.015, 12]} />
                            <meshStandardMaterial color="#dfe6e9" />
                        </mesh>
                    ))}
                    <mesh position={[0, 0.28, -0.05]} rotation={[0.8,0,0]}>
                        <torusGeometry args={[0.16, 0.045, 8, 16]} />
                        <meshToonMaterial color="#f1c40f" />
                    </mesh>
                </group>
            );
        default:
             return (
                <group position={[0, bodyCenterY - 0.05, 0]}>
                    <mesh position={[0, 0.15, 0]}><boxGeometry args={[0.3, 0.3, 0.2]} /><meshToonMaterial color="#FFB7B2" /></mesh>
                    <mesh position={[0, -0.2, 0]}><coneGeometry args={[0.28, 0.6, 32]} /><meshToonMaterial color="#FFB7B2" /></mesh>
                </group>
            );
    }
  };

  const isShorts = avatar.outfit === 'YELLOW_SHORTS' || avatar.outfit === 'BLACK_BOXERS' || avatar.outfit === 'PINK_BIKINI' || avatar.outfit === 'SKY_BIKINI_SKIRT' || avatar.outfit === 'PURPLE_BIKINI_GRADIENT_SKIRT';
  const torsoW = 0.36;
  const torsoH = 0.5;
  const torsoD = 0.22;
  const legW = 0.12;
  const legH = 0.34;
  const legD = 0.12;
  const armW = 0.08;
  const armH = 0.28;
  const armD = 0.08;
  const taperH = 0.09;
  const shoulderW = armW * 1.25;
  const shoulderD = armD;
  const shoulderInset = (shoulderW - armW) / 2;
  const handW = 0.09;
  const handH = 0.08;
  const handD = 0.09;
  const footW = 0.14;
  const footH = 0.08;
  const footD = 0.18;
  const bootH = 0.14;
  const bareFootH = 0.06;
  const bodyCenterY = legH + torsoH / 2;
  const hipY = bodyCenterY - torsoH / 2;
  const shoulderY = bodyCenterY + torsoH / 2;
  const headY = bodyCenterY + torsoH / 2 + 0.24;
  const legX = 0.1;
  const armX = torsoW / 2 + shoulderW / 2;
  const footY = -legH + footH / 2;
  const bootY = -legH + bootH / 2;
  const bareFootY = -legH + bareFootH / 2;

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
  const isBob = avatar.hairstyle === 'SHORT';
  const isLongHair = avatar.hairstyle === 'LONG';
  const isPonytail = avatar.hairstyle === 'PONYTAIL' || avatar.hairstyle === 'PONYTAIL_PINK';
  const isPonytailPink = avatar.hairstyle === 'PONYTAIL_PINK';
  const isTopBun = avatar.hairstyle === 'BUN_GREEN';
  const hairColor = isBob ? '#2d3436' : "#5e412f";
  const showRainHood = avatar.outfit === 'YELLOW_RAINCOAT';

  const initialGroundY = getGroundY ? getGroundY(avatar.position[0], avatar.position[2]) : 0;

  return (
    <group ref={groupRef} position={[avatar.position[0], (avatar.position[1] ?? 0) + initialGroundY, avatar.position[2]]}>
      <group position={[0, 0, 0]}>
        <group position={[0, hipY, 0]}>
           <group ref={leftLeg} position={[-legX, 0, 0]}>
              <mesh position={[0, -legH / 2, 0]}>
                 <boxGeometry args={[legW, legH, legD]} />
                 <meshToonMaterial color={isShorts ? skinColor : getLegColor()} />
              </mesh>
              {avatar.shoes === 'RED_CANVAS' && <mesh position={[0, footY, 0]}><boxGeometry args={[footW, footH, footD]} /><meshToonMaterial color="#e74c3c" /></mesh>}
              {avatar.shoes === 'GREEN_SNEAKERS' && <mesh position={[0, footY, 0]}><boxGeometry args={[footW, footH, footD]} /><meshToonMaterial color="#2ecc71" /></mesh>}
              {avatar.shoes === 'BLACK_BOOTS' && <mesh position={[0, bootY, 0]}><boxGeometry args={[footW, bootH, footD]} /><meshToonMaterial color="#2d3436" /></mesh>}
              {avatar.shoes === 'BLACK_SANDALS' && <mesh position={[0, footY, 0]}><boxGeometry args={[footW, footH * 0.5, footD]} /><meshStandardMaterial color="#2d3436" /></mesh>}
              {avatar.shoes === 'GREY_SNEAKERS' && <mesh position={[0, footY, 0]}><boxGeometry args={[footW, footH, footD]} /><meshToonMaterial color="#95a5a6" /></mesh>}
              {avatar.shoes === 'BLACK_SNEAKERS_M' && <mesh position={[0, footY, 0]}><boxGeometry args={[footW, footH, footD]} /><meshToonMaterial color="#2d3436" /></mesh>}
              {avatar.shoes === 'BAREFOOT' && (
                  <mesh position={[0, bareFootY, 0]}>
                      <boxGeometry args={[footW * 0.9, bareFootH, footD * 0.9]} />
                      <meshToonMaterial color={skinColor} />
                  </mesh>
              )}
           </group>
           <group ref={rightLeg} position={[legX, 0, 0]}>
               <mesh position={[0, -legH / 2, 0]}>
                 <boxGeometry args={[legW, legH, legD]} />
                 <meshToonMaterial color={isShorts ? skinColor : getLegColor()} />
              </mesh>
              {avatar.shoes === 'RED_CANVAS' && <mesh position={[0, footY, 0]}><boxGeometry args={[footW, footH, footD]} /><meshToonMaterial color="#e74c3c" /></mesh>}
              {avatar.shoes === 'GREEN_SNEAKERS' && <mesh position={[0, footY, 0]}><boxGeometry args={[footW, footH, footD]} /><meshToonMaterial color="#2ecc71" /></mesh>}
              {avatar.shoes === 'BLACK_BOOTS' && <mesh position={[0, bootY, 0]}><boxGeometry args={[footW, bootH, footD]} /><meshToonMaterial color="#2d3436" /></mesh>}
              {avatar.shoes === 'BLACK_SANDALS' && <mesh position={[0, footY, 0]}><boxGeometry args={[footW, footH * 0.5, footD]} /><meshStandardMaterial color="#2d3436" /></mesh>}
              {avatar.shoes === 'GREY_SNEAKERS' && <mesh position={[0, footY, 0]}><boxGeometry args={[footW, footH, footD]} /><meshToonMaterial color="#95a5a6" /></mesh>}
              {avatar.shoes === 'BLACK_SNEAKERS_M' && <mesh position={[0, footY, 0]}><boxGeometry args={[footW, footH, footD]} /><meshToonMaterial color="#2d3436" /></mesh>}
              {avatar.shoes === 'BAREFOOT' && (
                  <mesh position={[0, bareFootY, 0]}>
                      <boxGeometry args={[footW * 0.9, bareFootH, footD * 0.9]} />
                      <meshToonMaterial color={skinColor} />
                  </mesh>
              )}
           </group>
        </group>
        {getBody()}
        <mesh position={[0, bodyCenterY + torsoH / 2 + 0.04, 0]}>
           <boxGeometry args={[0.12, 0.08, 0.12]} />
           <meshToonMaterial color={skinColor} />
        </mesh>
        
        {/* Arms - Blocky and connected */}
        <group position={[0, shoulderY, 0]}> 
           {/* Left Arm Pivot */}
           <group ref={leftArm} position={[-armX, 0, 0]} rotation={[0, 0, 0]}>
              <mesh position={[shoulderInset, -taperH / 2, 0]}>
                  <boxGeometry args={[shoulderW, taperH, shoulderD]} />
                  <meshToonMaterial color={getArmColor()} />
              </mesh>
              <mesh position={[0, -(taperH + armH / 2), 0]}>
                  <boxGeometry args={[armW, armH, armD]} />
                  <meshToonMaterial color={getArmColor()} />
              </mesh>
              <mesh position={[0, -(taperH + armH + handH / 2), 0]}>
                  <boxGeometry args={[handW, handH, handD]} />
                  <meshToonMaterial color={skinColor} />
              </mesh>
              {avatar.accessories.includes('KEYBOARD') && (
                  <group position={[0, -(taperH + armH + handH / 2) + 0.02, 0.15]} rotation={[0, 0, -0.2]}>
                      <boxGeometry args={[0.2, 0.4, 0.05]} />
                      <meshStandardMaterial color="#2d3436" />
                      <mesh position={[0, 0, 0.03]}>
                          <planeGeometry args={[0.18, 0.38]} />
                          <meshBasicMaterial color="#636e72" />
                      </mesh>
                  </group>
              )}
           </group>

           {/* Right Arm Pivot */}
           <group ref={rightArm} position={[armX, 0, 0]} rotation={[0, 0, 0]}>
              <mesh position={[-shoulderInset, -taperH / 2, 0]}>
                  <boxGeometry args={[shoulderW, taperH, shoulderD]} />
                  <meshToonMaterial color={getArmColor()} />
              </mesh>
              <mesh position={[0, -(taperH + armH / 2), 0]}>
                  <boxGeometry args={[armW, armH, armD]} />
                  <meshToonMaterial color={getArmColor()} />
              </mesh>
              <mesh position={[0, -(taperH + armH + handH / 2), 0]}>
                  <boxGeometry args={[handW, handH, handD]} />
                  <meshToonMaterial color={skinColor} />
              </mesh>
              {avatar.accessories.includes('WATCH') && (
                  <mesh position={[0, -(taperH + armH / 2), 0.06]}>
                      <boxGeometry args={[armW + 0.02, 0.04, armD + 0.02]} />
                      <meshStandardMaterial color="#2d3436" />
                      <mesh position={[0, 0, 0.04]}>
                          <boxGeometry args={[0.04, 0.04, 0.02]} />
                          <meshBasicMaterial color="#00ff00" />
                      </mesh>
                  </mesh>
              )}
           </group>
        </group>

        <group position={[0, headY, 0]} rotation={[avatar.pose === 'LIE' ? 0.4 : 0, 0, 0]}>
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
                  <meshBasicMaterial color="#111" />
               </mesh>
               <mesh position={[0.08, 0.02, 0]} scale={[1, isBlinking ? 0.1 : 1, 1]}>
                  <sphereGeometry args={[0.025]} />
                  <meshBasicMaterial color="#111" />
               </mesh>
               <mesh position={[0, -0.06, 0]} rotation={[0,0,0]}>
                   <torusGeometry args={[0.02, 0.005, 16, 16, Math.PI]} />
                   <meshBasicMaterial color="#e74c3c" />
               </mesh>
               {avatar.blush !== 'NONE' && (
                 <>
                   <mesh position={[0.12, -0.02, 0.01]} rotation={[0, -0.2, 0]}>
                      <circleGeometry args={[0.04]} />
                      <meshBasicMaterial
                        map={blushTexture}
                        color={avatar.blush === 'HOT_PINK' ? '#ff69b4' : (avatar.blush === 'ORANGE' ? '#ffa502' : '#ffb7b2')}
                        transparent
                        opacity={1}
                        depthWrite={false}
                      />
                   </mesh>
                   <mesh position={[-0.12, -0.02, 0.01]} rotation={[0, 0.2, 0]}>
                      <circleGeometry args={[0.04]} />
                      <meshBasicMaterial
                        map={blushTexture}
                        color={avatar.blush === 'HOT_PINK' ? '#ff69b4' : (avatar.blush === 'ORANGE' ? '#ffa502' : '#ffb7b2')}
                        transparent
                        opacity={1}
                        depthWrite={false}
                      />
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
                    <meshToonMaterial color={hairColor} />
                </mesh>
                {isPonytail && (
                    <group>
                        <mesh position={[0, 0.1, -0.28]} rotation={[0.4, 0, 0]}>
                            <coneGeometry args={[0.1, 0.5]} />
                            <meshToonMaterial color={hairColor} />
                        </mesh>
                        {isPonytailPink && (
                            <mesh position={[0, 0.14, -0.18]} rotation={[Math.PI / 2, 0, 0]}>
                                <torusGeometry args={[0.06, 0.02, 10, 20]} />
                                <meshStandardMaterial color="#ff7eb9" emissive="#ff9fd4" emissiveIntensity={0.4} />
                            </mesh>
                        )}
                    </group>
                )}
                {isTopBun && (
                    <group>
                        <mesh position={[0, 0.23, -0.08]}>
                            <sphereGeometry args={[0.16, 18, 18]} />
                            <meshToonMaterial color={hairColor} />
                        </mesh>
                        <mesh position={[0, 0.2, -0.08]} rotation={[Math.PI / 2, 0, 0]}>
                            <torusGeometry args={[0.08, 0.02, 10, 20]} />
                            <meshStandardMaterial color="#2ecc71" emissive="#56e39f" emissiveIntensity={0.35} />
                        </mesh>
                    </group>
                )}
                {isLongHair && (
                    <mesh position={[0, -0.2, -0.1]}>
                        <boxGeometry args={[0.46, 0.5, 0.15]} />
                        <meshToonMaterial color={hairColor} />
                    </mesh>
                )}
                {isBob && (
                    <mesh position={[0, -0.05, -0.1]}>
                        <boxGeometry args={[0.49, 0.3, 0.2]} />
                        <meshToonMaterial color={hairColor} />
                    </mesh>
                )}
            </group>
            <group position={[0, 0.05, 0]}>
              {avatar.accessories.includes('RIBBON') && <mesh position={[0, 0.23, 0.1]} rotation={[0,0, -0.2]}><boxGeometry args={[0.3, 0.15, 0.05]} /><meshToonMaterial color="#ff7675" /></mesh>}
              {showRainHood && (
                 <group position={[0, 0.1, 0.05]}>
                   <mesh><sphereGeometry args={[0.26, 32, 32, 0, Math.PI*2, 0, 1.55]} /><meshToonMaterial color="#f1c40f" /></mesh>
                   <mesh position={[0, 0, 0.2]} rotation={[0.2, 0, 0]}><boxGeometry args={[0.32, 0.03, 0.22]} /><meshToonMaterial color="#f1c40f" /></mesh>
                 </group>
              )}
              {!showRainHood && avatar.accessories.includes('HAT') && (
                 <group position={[0, 0.02, 0.02]}>
                   <mesh><sphereGeometry args={[0.235, 32, 32, 0, Math.PI*2, 0, 1.5]} /><meshToonMaterial color="#74b9ff" /></mesh>
                   <mesh position={[0, -0.02, 0.18]} rotation={[0.2, 0, 0]}><boxGeometry args={[0.28, 0.02, 0.18]} /><meshToonMaterial color="#74b9ff" /></mesh>
                 </group>
              )}
               {(avatar.accessories.includes('HEADSET') || avatar.accessories.includes('HEADSET_WHITE')) && (
                 <group position={[0, -0.02, 0.05]}>
                    <mesh position={[0.25, -0.01, 0.05]}><boxGeometry args={[0.06, 0.18, 0.16]} /><meshStandardMaterial color="white" /></mesh>
                    <mesh position={[-0.25, -0.01, 0.05]}><boxGeometry args={[0.06, 0.18, 0.16]} /><meshStandardMaterial color="white" /></mesh>
                    <mesh position={[0, 0.06, 0.03]} rotation={[0,0,0]}><torusGeometry args={[0.26, 0.03, 8, 16, Math.PI]} /><meshStandardMaterial color="white" /></mesh>
                 </group>
              )}
               {avatar.accessories.includes('EARRINGS') && (
                 <group>
                    <mesh position={[0.22, -0.07, 0.06]}>
                        <torusGeometry args={[0.03, 0.005, 8, 16]} />
                        <meshStandardMaterial color="#c9a227" />
                    </mesh>
                    <mesh position={[-0.22, -0.07, 0.06]}>
                        <torusGeometry args={[0.03, 0.005, 8, 16]} />
                        <meshStandardMaterial color="#c9a227" />
                    </mesh>
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

const TentMesh = ({ tent }: { tent: TentState }) => {
    const { type, pattern, isLit, isDoorOpen, rug, size } = tent;
    const tentOpacity = 0.75;
    const sizeScale = size === 'SMALL' ? 0.8 : (size === 'LARGE' ? 1.2 : 1);
    
    // Create texture only when pattern changes
    const texture = useMemo(() => createPatternTexture(pattern), [pattern]);
    
    return (
        <group scale={[sizeScale, sizeScale, sizeScale]}>
            {/* Tent Base Structure */}
            {type === 'TRIANGLE' ? (
                // DOME STYLE (Replaces Triangle)
                <group>
                    {/* Dome Body */}
                    <mesh position={[0, 0, 0]} castShadow receiveShadow>
                        {/* Half Sphere */}
                        <sphereGeometry args={[1.5, 32, 16, 0, Math.PI * 2, 0, Math.PI / 2]} />
                        <meshStandardMaterial
                            map={texture}
                            color={getPatternBaseColor(pattern)}
                            side={THREE.DoubleSide}
                            transparent
                            opacity={tentOpacity}
                        />
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
                                <meshStandardMaterial
                                    map={texture}
                                    color={pattern === 'KHAKI_OUTDOOR' ? '#9d8b6c' : (pattern === 'YELLOW_STARS' ? '#ffffff' : (pattern === 'ORANGE' ? '#d35400' : '#bdc3c7'))}
                                    side={THREE.DoubleSide}
                                    transparent
                                    opacity={tentOpacity}
                                />
                            </mesh>
                        )}
                        {isDoorOpen && (
                            // Rolled Up Top
                            <group position={[0, 1.3, -0.1]}>
                                <mesh rotation={[0, 0, Math.PI/2]}>
                                    <cylinderGeometry args={[0.1, 0.1, 1.2]} />
                                    <meshStandardMaterial
                                        color={pattern === 'KHAKI_OUTDOOR' ? '#9d8b6c' : (pattern === 'YELLOW_STARS' ? '#f0b90b' : (pattern === 'ORANGE' ? '#d35400' : '#bdc3c7'))}
                                        transparent
                                        opacity={tentOpacity}
                                    />
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
                         <meshStandardMaterial
                            map={texture}
                            color={pattern === 'ORANGE' ? '#e67e22' : 'white'}
                            transparent
                            opacity={tentOpacity}
                            side={THREE.DoubleSide}
                         />
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
                <group>
                    <pointLight position={[0, 1.25, 0]} intensity={1.6} distance={5} color="#ffe7b3" decay={2} />
                    <mesh position={[0, 1.25, 0]}>
                        <sphereGeometry args={[0.08, 16, 16]} />
                        <meshStandardMaterial color="#fff3c4" emissive="#ffe7b3" emissiveIntensity={1.2} />
                    </mesh>
                    <mesh position={[0, 1.35, 0]}>
                        <cylinderGeometry args={[0.05, 0.05, 0.08, 12]} />
                        <meshStandardMaterial color="#6c5c4c" />
                    </mesh>
                </group>
            )}

            {/* Rug */}
            <group position={[0, 0.02, 0]}>
                {rug === 'ETHNIC' && <mesh rotation={[-Math.PI/2, 0, 0]}><circleGeometry args={[1, 32]} /><meshStandardMaterial color="#8d6e63" /></mesh>}
                {rug === 'BLUE_FUR' && <mesh rotation={[-Math.PI/2, 0, 0]}><circleGeometry args={[1, 32]} /><meshStandardMaterial color="#0984e3" /></mesh>}
                {rug === 'SILVER' && <mesh rotation={[-Math.PI/2, 0, 0]}><planeGeometry args={[1.8, 1.8]} /><meshStandardMaterial color="#b2bec3" metalness={0.6} roughness={0.3} /></mesh>}
                {rug === 'VINTAGE' && <mesh rotation={[-Math.PI/2, 0, 0]}><planeGeometry args={[1.8, 1.8]} /><meshStandardMaterial color="#d63031" /></mesh>}
            </group>
            
        </group>
    );
};

const DraggableObject = ({ id, position, rotation, isSelected, onSelect, onMove, onInteract, isEditMode, greetingText, onCloseGreeting, children }: any) => {
    const [hovered, setHover] = useState(false);
    const [isDragging, setIsDragging] = useState(false);
    const plane = useMemo(() => new THREE.Plane(new THREE.Vector3(0, 1, 0), 0), []);
    const intersect = new THREE.Vector3();

    useCursor(hovered, isEditMode ? 'move' : 'pointer', 'auto');

    const handlePointerDown = (e: any) => {
        if (!isEditMode) {
            e.stopPropagation();
            if (onInteract) onInteract(id);
            return;
        }
        e.stopPropagation();
        if (onSelect) onSelect(id);
        setIsDragging(true);
        // @ts-ignore
        e.target.setPointerCapture(e.pointerId);
    };

    const handlePointerUp = (e: any) => {
        if (!isEditMode) return;
        e.stopPropagation();
        setIsDragging(false);
        // @ts-ignore
        e.target.releasePointerCapture(e.pointerId);
    };

    const handlePointerMove = (e: any) => {
        if (isEditMode && isDragging) {
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
            {greetingText && (
                <SpeechBubble
                    text={greetingText}
                    width={2.0}
                    fontSize={0.18}
                    maxLines={2}
                    onClose={onCloseGreeting}
                />
            )}
            {isEditMode && isSelected && (
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

const Pet = ({ pet, position, isSelected, onSelect, onMove, isEditMode, onInteract, greetingText, onCloseGreeting }: any) => {
    return (
        <DraggableObject
            id={pet.id}
            position={position ?? pet.position}
            rotation={pet.rotation}
            isSelected={isSelected}
            onSelect={onSelect}
            onMove={onMove}
            isEditMode={isEditMode}
            onInteract={onInteract}
            greetingText={greetingText}
            onCloseGreeting={onCloseGreeting}
        >
            {pet.type === 'Maltese' && <Maltese />}
            {pet.type === 'Poodle' && <QuadrupedAnimal color="white" ears="POINTY" tail="SHORT" />}
            {pet.type === 'Bichon' && <QuadrupedAnimal color="white" ears="ROUND" tail="CURLY" />}
            {pet.type === 'Shiba' && <QuadrupedAnimal color="#e67e22" ears="POINTY" tail="CURLY" />}
            {pet.type === 'CheeseCat' && <CatModel base="#f1c40f" spot="#e67e22" spots={false} />}
            {pet.type === 'SpottedCat' && <CatModel base="#bdc3c7" spot="#7f8c8d" spots />}
            {pet.type === 'Koala' && <KoalaModel />}
            {pet.type === 'Quokka' && <QuokkaModel />}
            {pet.type === 'Turtle' && <TurtleModel />}
            {pet.type === 'WhiteBird' && <BirdModel />}
        </DraggableObject>
    );
};

const MoveMarker = ({ position }: { position: [number, number, number] }) => {
    const ringRef = useRef<THREE.Mesh>(null);
    useFrame(({ clock }) => {
        if (!ringRef.current) return;
        const t = clock.elapsedTime;
        const scale = 1 + Math.sin(t * 4) * 0.15;
        ringRef.current.scale.set(scale, scale, scale);
        const mat = ringRef.current.material as THREE.MeshBasicMaterial;
        mat.opacity = 0.35 + Math.sin(t * 4) * 0.1;
    });

    return (
        <mesh ref={ringRef} position={[position[0], position[1] + 0.02, position[2]]} rotation={[-Math.PI / 2, 0, 0]}>
            <ringGeometry args={[0.2, 0.35, 32]} />
            <meshBasicMaterial color="white" transparent opacity={0.4} />
        </mesh>
    );
};

const SpeechBubble = ({ text, width = 2.2, fontSize = 0.18, maxLines = 2, onClose, maxScale = 1.2 }: { text: string; width?: number; fontSize?: number; maxLines?: number; onClose?: () => void; maxScale?: number }) => {
    const charsPerLine = Math.max(8, Math.floor(width / (fontSize * 0.6)));
    const maxChars = charsPerLine * maxLines;
    const displayText = text.length > maxChars ? `${text.slice(0, Math.max(0, maxChars - 1))}…` : text;
    const lineCount = Math.min(maxLines, Math.ceil(displayText.length / charsPerLine));
    const height = 0.28 + lineCount * (fontSize * 1.4);
    const groupRef = useRef<THREE.Group>(null);
    const baseDistanceRef = useRef<number | null>(null);
    const tempVec = useMemo(() => new THREE.Vector3(), []);
    const { camera } = useThree();

    useFrame(() => {
        if (!groupRef.current) return;
        const dist = camera.position.distanceTo(groupRef.current.getWorldPosition(tempVec));
        if (!baseDistanceRef.current) baseDistanceRef.current = dist;
        const scale = Math.min(maxScale, baseDistanceRef.current / Math.max(0.001, dist));
        groupRef.current.scale.setScalar(scale);
    });

    const handleClose = (e: any) => {
        e.stopPropagation();
        if (onClose) onClose();
    };

    return (
        <Billboard position={[0, 1.2, 0]}>
            <group ref={groupRef} onPointerDown={handleClose}>
                <RoundedBox args={[width, height, 0.04]} radius={0.15} smoothness={6}>
                    <meshBasicMaterial color="white" transparent opacity={0.9} />
                </RoundedBox>
                <group position={[0, -height / 2 - 0.08, 0]}>
                    <mesh position={[0, 0.02, 0]}>
                        <sphereGeometry args={[0.055, 16, 16]} />
                        <meshBasicMaterial color="white" transparent opacity={0.9} />
                    </mesh>
                    <mesh position={[0, -0.08, 0]}>
                        <sphereGeometry args={[0.035, 16, 16]} />
                        <meshBasicMaterial color="white" transparent opacity={0.9} />
                    </mesh>
                </group>
                <Text
                    position={[0, 0, 0.03]}
                    fontSize={fontSize}
                    color="#333"
                    maxWidth={width - 0.2}
                    lineHeight={1.2}
                    overflowWrap="break-word"
                    textAlign="center"
                    anchorX="center"
                    anchorY="middle"
                >
                    {displayText}
                </Text>
            </group>
        </Billboard>
    );
};

const ActionMenuButton = ({ label, width, height, onSelect }: { label: string; width: number; height: number; onSelect: () => void }) => {
    const [hovered, setHovered] = useState(false);
    useCursor(hovered, 'pointer', 'auto');

    return (
        <group
            onPointerOver={(e) => { e.stopPropagation(); setHovered(true); }}
            onPointerOut={() => setHovered(false)}
            onPointerDown={(e) => { e.stopPropagation(); onSelect(); }}
        >
            <RoundedBox args={[width, height, 0.02]} radius={0.08} smoothness={4}>
                <meshBasicMaterial color={hovered ? '#ffeaa7' : '#f3f4f6'} />
            </RoundedBox>
            <Text
                position={[0, 0, 0.03]}
                fontSize={0.16}
                color="#333"
                anchorX="center"
                anchorY="middle"
            >
                {label}
            </Text>
        </group>
    );
};

const ActionMenu = ({ position, options, yOffset = 0.8, maxScale = 1.2 }: { position: [number, number, number]; options: Array<{ label: string; onSelect: () => void }>; yOffset?: number; maxScale?: number }) => {
    const groupRef = useRef<THREE.Group>(null);
    const baseDistanceRef = useRef<number | null>(null);
    const tempVec = useMemo(() => new THREE.Vector3(), []);
    const { camera } = useThree();
    const rowHeight = 0.3;
    const padding = 0.12;
    const width = 1.8;
    const height = options.length * rowHeight + padding * 2;

    useFrame(() => {
        if (!groupRef.current) return;
        const dist = camera.position.distanceTo(groupRef.current.getWorldPosition(tempVec));
        if (!baseDistanceRef.current) baseDistanceRef.current = dist;
        const scale = Math.min(maxScale, baseDistanceRef.current / Math.max(0.001, dist));
        groupRef.current.scale.setScalar(scale);
    });

    return (
        <Billboard position={[position[0], position[1] + yOffset, position[2]]}>
            <group ref={groupRef} onPointerDown={(e) => e.stopPropagation()}>
                <RoundedBox args={[width, height, 0.04]} radius={0.12} smoothness={6}>
                    <meshBasicMaterial color="white" transparent opacity={0.95} />
                </RoundedBox>
                {options.map((option, index) => {
                    const y = height / 2 - padding - rowHeight / 2 - index * rowHeight;
                    return (
                        <group key={option.label} position={[0, y, 0.03]}>
                            <ActionMenuButton
                                label={option.label}
                                width={width - 0.2}
                                height={rowHeight - 0.06}
                                onSelect={option.onSelect}
                            />
                        </group>
                    );
                })}
            </group>
        </Billboard>
    );
};

const GameCanvas = ({ 
    gameState, 
    setGameState, 
    onRemoveItem, 
    onMoveItem, 
    onMovePet, 
    onMovePartner,
    onMoveTent,
    onRotateItem, 
    selectedItemId, 
    setSelectedItemId,
    isEditMode
}: any) => {
    
    // REMOVED showTentMenu logic (deleted state and UI)
    
    const playerRef = useRef<THREE.Group>(null);
    const controlsRef = useRef<any>(null);
    const waterTheme = gameState.waterTheme ?? WaterTheme.BLUE;
    const waterTextures = useMemo(() => createWaterTextures(waterTheme), [waterTheme]);
    const sandTextures = useMemo(() => createSandTextures(), []);
    const cloudSeeds = useMemo(() => [11, 23, 37, 59], []);

    const [bubble, setBubble] = useState<{ id: string; text: string; source: 'auto' | 'click' } | null>(null);
    const [actionMenu, setActionMenu] = useState<{
        id: string;
        type: 'sunbed' | 'picnic' | 'tent';
        position: [number, number, number];
        rotation?: [number, number, number];
    } | null>(null);
    const bubbleTimeoutRef = useRef<number | null>(null);
    const bubbleRef = useRef<{ id: string; text: string; source: 'auto' | 'click' } | null>(null);
    const [moveTarget, setMoveTarget] = useState<[number, number, number] | null>(null);
    const lastUserInteractRef = useRef(0);
    const lastAutoCategoryRef = useRef<'pet' | 'partner' | null>(null);
    const autoCandidatesRef = useRef<{ pets: PetState[]; partners: AvatarState[] }>({ pets: [], partners: [] });
    const petHomePositionsRef = useRef<Record<string, [number, number, number]>>({});
    const [isMobile, setIsMobile] = useState(() => {
        if (typeof window === 'undefined') return false;
        return window.innerWidth < 768;
    });
    const groundTapRef = useRef<{ x: number; y: number; moved: boolean; pointerId: number } | null>(null);
    const actionMenuOffsets = useMemo(() => ({
        sunbed: 0.9,
        picnic: 0.6,
        tent: 1.8
    }), []);
    const tableSurfaceDefs = useMemo(() => ({
        camping_table: { width: 1.2, depth: 0.8, topY: 0.54, padding: 0.12 },
        picnic_table_small: { width: 1.0, depth: 0.6, topY: 0.28, padding: 0.1 }
    }), []);

    const handleBackgroundClick = (e: any) => {
        setSelectedItemId(null);
        setActionMenu(null);
    };

    const clearBubble = useCallback(() => {
        setBubble(null);
        if (bubbleTimeoutRef.current) {
            window.clearTimeout(bubbleTimeoutRef.current);
            bubbleTimeoutRef.current = null;
        }
    }, []);

    const showBubble = useCallback((id: string, text: string, duration = 4000, source: 'auto' | 'click' = 'auto') => {
        setBubble({ id, text, source });
        if (bubbleTimeoutRef.current) {
            window.clearTimeout(bubbleTimeoutRef.current);
        }
        bubbleTimeoutRef.current = window.setTimeout(() => {
            setBubble(prev => (prev?.id === id ? null : prev));
        }, duration);
    }, []);

    useEffect(() => {
        bubbleRef.current = bubble;
    }, [bubble]);

    useEffect(() => {
        autoCandidatesRef.current = {
            pets: gameState.pets,
            partners: gameState.partners
        };
    }, [gameState.pets, gameState.partners]);

    useEffect(() => {
        const nextHomes = { ...petHomePositionsRef.current };
        gameState.pets.forEach(pet => {
            if (!nextHomes[pet.id] || isEditMode) {
                nextHomes[pet.id] = [pet.position[0], pet.position[1], pet.position[2]];
            }
        });
        petHomePositionsRef.current = nextHomes;
    }, [gameState.pets, isEditMode]);

    useEffect(() => {
        return () => {
            if (bubbleTimeoutRef.current) {
                window.clearTimeout(bubbleTimeoutRef.current);
            }
        };
    }, []);

    useEffect(() => {
        if (typeof window === 'undefined') return;
        const handleResize = () => {
            setIsMobile(window.innerWidth < 768);
        };
        handleResize();
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    useEffect(() => {
        if (isEditMode && moveTarget) {
            setMoveTarget(null);
        }
        if (isEditMode && bubbleRef.current) {
            clearBubble();
        }
        if (isEditMode && actionMenu) {
            setActionMenu(null);
        }
    }, [isEditMode, moveTarget, clearBubble]);

    const handlePartnerInteract = useCallback((partnerId: string) => {
        lastUserInteractRef.current = Date.now();
        setActionMenu(null);
        const text = GREETINGS[Math.floor(Math.random() * GREETINGS.length)];
        showBubble(partnerId, text, 3000, 'click');
    }, [showBubble]);

    const handlePetInteract = useCallback(async (pet: PetState) => {
        lastUserInteractRef.current = Date.now();
        setActionMenu(null);
        showBubble(pet.id, "…", 4000, 'click');
        try {
            const text = await generatePetThought(pet, gameState.weather, gameState.time);
            showBubble(pet.id, text || GREETINGS[Math.floor(Math.random() * GREETINGS.length)], 4000, 'click');
        } catch {
            showBubble(pet.id, GREETINGS[Math.floor(Math.random() * GREETINGS.length)], 4000, 'click');
        }
    }, [gameState.weather, gameState.time, showBubble]);

    useEffect(() => {
        if (isEditMode) return;
        let timeoutId: number | null = null;

        const schedule = () => {
            timeoutId = window.setTimeout(() => {
                if (isEditMode) {
                    schedule();
                    return;
                }
                if (bubbleRef.current) {
                    schedule();
                    return;
                }
                if (Date.now() - lastUserInteractRef.current < 5000) {
                    schedule();
                    return;
                }

                const { pets, partners } = autoCandidatesRef.current;
                const categories: Array<'pet' | 'partner'> = [];
                if (pets.length > 0) categories.push('pet');
                if (partners.length > 0) categories.push('partner');
                if (categories.length === 0) {
                    schedule();
                    return;
                }

                let selectable = categories.filter(c => c !== lastAutoCategoryRef.current);
                if (selectable.length === 0) selectable = categories;
                const category = selectable[Math.floor(Math.random() * selectable.length)];
                lastAutoCategoryRef.current = category;

                const targetList = category === 'pet' ? pets : partners;
                const target = targetList[Math.floor(Math.random() * targetList.length)];
                const text = GREETINGS[Math.floor(Math.random() * GREETINGS.length)];
                showBubble(target.id, text, 3000, 'auto');

                schedule();
            }, 120000);
        };

        schedule();

        return () => {
            if (timeoutId) window.clearTimeout(timeoutId);
        };
    }, [isEditMode, showBubble]);

    useEffect(() => {
        if (isEditMode) return;
        if (gameState.pets.length === 0) return;
        const radius = 2.2;
        const interval = window.setInterval(() => {
            if (isEditMode) return;
            setGameState(prev => {
                const nextPets = prev.pets.map(pet => {
                    const home = petHomePositionsRef.current[pet.id] || pet.position;
                    const angle = Math.random() * Math.PI * 2;
                    const dist = Math.random() * radius;
                    const x = home[0] + Math.cos(angle) * dist;
                    const z = home[2] + Math.sin(angle) * dist;
                    const target = new THREE.Vector3(x, 0, z);
                    if (target.length() > ISLAND_RADIUS - 1) target.setLength(ISLAND_RADIUS - 1);
                    const rotationY = Math.atan2(target.x - pet.position[0], target.z - pet.position[2]);
                    return {
                        ...pet,
                        position: [target.x, 0, target.z],
                        rotation: [0, rotationY, 0]
                    };
                });
                return { ...prev, pets: nextPets };
            });
        }, 60000);
        return () => window.clearInterval(interval);
    }, [gameState.pets.length, isEditMode, setGameState]);

    const handleGroundTap = (e: any) => {
        if (isEditMode) return;
        e.stopPropagation();
        const point = e.point as THREE.Vector3;
        const target = new THREE.Vector3(point.x, 0, point.z);
        if (target.length() > ISLAND_RADIUS - 1) target.setLength(ISLAND_RADIUS - 1);
        const x = Math.round(target.x * 2) / 2;
        const z = Math.round(target.z * 2) / 2;
        setSelectedItemId(null);
        setActionMenu(null);
        if (gameState.avatar.pose !== 'IDLE' || gameState.cameraMode === 'TENT_INTERIOR') {
            setGameState((prev: GameState) => ({
                ...prev,
                cameraMode: 'ISLAND',
                avatar: { ...prev.avatar, pose: 'IDLE' }
            }));
        }
        setMoveTarget([x, 0, z]);
    };

    const handleGroundPointerDown = (e: any) => {
        if (isEditMode) return;
        if (e.intersections && e.intersections[0] && e.intersections[0].object !== e.eventObject) {
            return;
        }
        groundTapRef.current = {
            x: e.clientX ?? 0,
            y: e.clientY ?? 0,
            moved: false,
            pointerId: e.pointerId ?? -1
        };
    };

    const handleGroundPointerMove = (e: any) => {
        const data = groundTapRef.current;
        if (!data || (e.pointerId ?? -1) !== data.pointerId) return;
        const dx = (e.clientX ?? 0) - data.x;
        const dy = (e.clientY ?? 0) - data.y;
        const threshold = e.pointerType === 'touch' ? 12 : 6;
        if (Math.hypot(dx, dy) > threshold) {
            data.moved = true;
        }
    };

    const handleGroundPointerUp = (e: any) => {
        if (isEditMode) return;
        const data = groundTapRef.current;
        groundTapRef.current = null;
        if (!data || data.moved) return;
        if (e.intersections && e.intersections[0] && e.intersections[0].object !== e.eventObject) {
            return;
        }
        handleGroundTap(e);
    };

    const getFoodSnapY = useCallback((x: number, z: number) => {
        for (const item of gameState.placedItems) {
            const def = (tableSurfaceDefs as any)[item.itemId];
            if (!def) continue;
            const dx = x - item.position[0];
            const dz = z - item.position[2];
            const angle = -((item.rotation && item.rotation[1]) || 0);
            const cos = Math.cos(angle);
            const sin = Math.sin(angle);
            const lx = dx * cos - dz * sin;
            const lz = dx * sin + dz * cos;
            if (Math.abs(lx) <= def.width / 2 + def.padding && Math.abs(lz) <= def.depth / 2 + def.padding) {
                return def.topY + 0.02;
            }
        }
        return 0;
    }, [gameState.placedItems, tableSurfaceDefs]);

    const handleItemDrag = useCallback((id: string, position: [number, number, number]) => {
        const item = gameState.placedItems.find(i => i.id === id);
        if (!item) return;
        if (item.category === ItemCategory.FOOD) {
            const y = getFoodSnapY(position[0], position[2]);
            onMoveItem(id, [position[0], y, position[2]]);
            return;
        }
        onMoveItem(id, [position[0], 0, position[2]]);
    }, [gameState.placedItems, getFoodSnapY, onMoveItem]);

    const openActionMenu = useCallback((payload: { id: string; type: 'sunbed' | 'picnic' | 'tent'; position: [number, number, number]; rotation?: [number, number, number] }) => {
        lastUserInteractRef.current = Date.now();
        setMoveTarget(null);
        setSelectedItemId(null);
        clearBubble();
        setActionMenu(payload);
    }, [clearBubble, setSelectedItemId]);

    const handleItemInteract = useCallback((item: GameItem) => {
        if (item.itemId === 'sunbed') {
            openActionMenu({ id: item.id, type: 'sunbed', position: item.position, rotation: item.rotation });
            return;
        }
        if (item.itemId === 'picnic_mat' || item.itemId === 'orange_mat') {
            openActionMenu({ id: item.id, type: 'picnic', position: item.position, rotation: item.rotation });
        }
    }, [openActionMenu]);

    const handleTentInteract = useCallback((tent: TentState) => {
        openActionMenu({ id: tent.id, type: 'tent', position: tent.position });
    }, [openActionMenu]);

    const applyActionPose = useCallback((pose: 'IDLE' | 'SIT' | 'LIE', position: [number, number, number], opts?: { openTent?: boolean; tentId?: string }) => {
        lastUserInteractRef.current = Date.now();
        setMoveTarget(null);
        setActionMenu(null);
        setSelectedItemId(null);
        setGameState((prev: GameState) => {
            const targetTent = opts?.tentId ? prev.tents.find(tent => tent.id === opts.tentId) : null;
            const nextTents = opts?.openTent && targetTent
                ? prev.tents.map(tent => tent.id === targetTent.id ? { ...tent, isDoorOpen: true } : tent)
                : prev.tents;
            const nextCameraMode = opts?.openTent ? 'TENT_INTERIOR' : 'ISLAND';
            const tentScale = targetTent ? getTentScale(targetTent.size) : 1;
            const poseOffset = pose === 'LIE' ? 0.95 : (pose === 'SIT' ? 0.6 : 0.45);
            const interiorOffset = poseOffset * tentScale;
            const targetPosition: [number, number, number] = opts?.openTent
                ? [targetTent?.position[0] ?? position[0], 0, (targetTent?.position[2] ?? position[2]) - interiorOffset]
                : [position[0], 0, position[2]];
            return {
                ...prev,
                tents: nextTents,
                cameraMode: nextCameraMode,
                avatar: {
                    ...prev.avatar,
                    position: targetPosition,
                    pose
                }
            };
        });
    }, [setGameState, setSelectedItemId]);

    const toggleItemState = (id: string) => {
        setGameState((prev: GameState) => ({
            ...prev,
            placedItems: prev.placedItems.map(item => 
                item.id === id ? { ...item, itemState: { ...item.itemState, isOpen: !item.itemState?.isOpen } } : item
            )
        }));
    };

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
    const isSand = gameState.floor === FloorType.SAND;
    const waterStyle = useMemo(() => {
        if (waterTheme === WaterTheme.EMERALD) {
            return {
                color: '#45d1bf',
                roughness: 0.35,
                metalness: 0.06,
                bumpScale: 0.085,
                displacementScale: 0.03,
                opacity: 0.72
            };
        }
        return {
            color: '#3a9ed6',
            roughness: 0.35,
            metalness: 0.1,
            bumpScale: 0.1,
            displacementScale: 0.04,
            opacity: 0.85
        };
    }, [waterTheme]);
    const obstacleData = useMemo(() => {
        const radiusMap: Record<string, number> = {
            tree_pine: 1.1,
            tree_round: 1.0,
            tree_zelkova: 1.1,
            tree_birch: 1.0,
            tree_palm: 0.9,
            tree_lemon: 0.9,
            mini_tree: 0.6,
            ev_car: 1.5,
            sunbed: 0.9,
            picnic_mat: 1.0,
            orange_mat: 0.9,
            camping_chair: 0.7,
            camping_table: 0.9,
            picnic_table_small: 0.8,
            campfire: 0.6,
            lantern: 0.4,
            wood_lamp: 0.6,
            candle: 0.3,
            flashlight: 0.3,
            pond: 1.1,
            teddy_bear: 0.4,
            books: 0.4,
            radio: 0.4,
            game_console: 0.4,
            laptop: 0.4,
            first_aid: 0.4,
            camping_box: 0.7,
            snowman: 0.7,
            snow_pile: 0.7,
            duck_float: 0.9,
            duck_feet: 0.6,
            coffee_cup: 0.3,
            marshmallow: 0.3,
            pot: 0.4,
            coffee_pot: 0.4
        };
        const items = gameState.placedItems
            .filter(item => item.category !== ItemCategory.FOOD)
            .map(item => ({
                position: item.position,
                radius: radiusMap[item.itemId] ?? 0.6
            }));
        const tents = gameState.tents.map(tent => ({
            position: tent.position,
            radius: getTentRadius(tent.size)
        }));
        return [
            ...items,
            ...tents
        ];
    }, [gameState.placedItems, gameState.tents]);
    const islandSideColor = useMemo(() => {
        const base = new THREE.Color(groundColor);
        const factor = isNight ? 0.88 : 0.75;
        base.multiplyScalar(factor);
        return `#${base.getHexString()}`;
    }, [groundColor, isNight]);
    const islandGeometry = useMemo(() => {
        const geometry = new THREE.CircleGeometry(ISLAND_RADIUS, 96);
        geometry.rotateX(-Math.PI / 2);
        const pos = geometry.attributes.position as THREE.BufferAttribute;
        for (let i = 0; i < pos.count; i++) {
            const x = pos.getX(i);
            const z = pos.getZ(i);
            const r = Math.sqrt(x * x + z * z);
            const t = Math.min(r / ISLAND_RADIUS, 1);
            const blend = THREE.MathUtils.smoothstep(t, ISLAND_CENTER_RADIUS, ISLAND_EDGE_RADIUS);
            const y = ISLAND_EDGE_Y_OFFSET * blend;
            pos.setY(i, y);
        }
        pos.needsUpdate = true;
        geometry.computeVertexNormals();
        return geometry;
    }, []);

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
    const actionMenuConfig = useMemo(() => {
        if (!actionMenu) return null;
        if (actionMenu.type === 'sunbed') {
            return {
                options: [
                    { label: '눕기', onSelect: () => applyActionPose('LIE', actionMenu.position) }
                ],
                yOffset: actionMenuOffsets.sunbed
            };
        }
        if (actionMenu.type === 'picnic') {
            return {
                options: [
                    { label: '앉기', onSelect: () => applyActionPose('SIT', actionMenu.position) },
                    { label: '눕기', onSelect: () => applyActionPose('LIE', actionMenu.position) }
                ],
                yOffset: actionMenuOffsets.picnic
            };
        }
        return {
            options: [
                { label: '들어가서 쉬기', onSelect: () => applyActionPose('LIE', actionMenu.position, { openTent: true, tentId: actionMenu.id }) }
            ],
            yOffset: actionMenuOffsets.tent
        };
    }, [actionMenu, actionMenuOffsets, applyActionPose]);

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
                    
                    {!isNight && gameState.weather !== WeatherType.RAINY && gameState.weather !== WeatherType.SUNNY && (
                       <>
                        <Cloud opacity={0.4} speed={0.1} bounds={[30, 2, 5]} segments={15} position={[10, 12, -10]} color="white" seed={cloudSeeds[0]} />
                        <Cloud opacity={0.3} speed={0.1} bounds={[30, 2, 5]} segments={15} position={[-10, 10, -5]} color="white" seed={cloudSeeds[1]} />
                        <Cloud opacity={0.3} speed={0.1} bounds={[20, 2, 5]} segments={10} position={[0, 15, 0]} color="white" seed={cloudSeeds[2]} />
                       </>
                    )}

                    {gameState.weather === WeatherType.RAINY && <Rain />}
                    {gameState.weather === WeatherType.SNOWY && <Snow />}

                    <mesh
                        position={[0, ISLAND_TOP_Y + ISLAND_EDGE_Y_OFFSET - ISLAND_HEIGHT / 2, 0]}
                        castShadow
                        receiveShadow
                    >
                        <cylinderGeometry args={[ISLAND_RADIUS * 1.01, ISLAND_RADIUS * 0.86, ISLAND_HEIGHT, 72, 1, true]} />
                        <meshStandardMaterial
                            color={islandSideColor}
                            roughness={0.9}
                            metalness={0.05}
                        />
                    </mesh>
                    <mesh 
                        receiveShadow 
                        position={[0, ISLAND_TOP_Y, 0]} 
                        onPointerDown={handleGroundPointerDown}
                        onPointerMove={handleGroundPointerMove}
                        onPointerUp={handleGroundPointerUp}
                    >
                        <primitive object={islandGeometry} attach="geometry" />
                        <meshStandardMaterial
                            color={groundColor}
                            map={isSand ? sandTextures.map : undefined}
                            bumpMap={isSand ? sandTextures.bump : undefined}
                            bumpScale={isSand ? 0.12 : 0}
                            roughness={isSand ? 0.9 : 0.6}
                            metalness={isSand ? 0 : 0.05}
                        />
                    </mesh>
                    <WaterPlane
                        textures={waterTextures}
                        color={waterStyle.color}
                        roughness={waterStyle.roughness}
                        metalness={waterStyle.metalness}
                        bumpScale={waterStyle.bumpScale}
                        displacementScale={waterStyle.displacementScale}
                        opacity={waterStyle.opacity}
                    />

                    {/* Grid only in edit mode */}
                    {isEditMode && (
                        <Grid position={[0, 0.01, 0]} args={[40, 40]} cellColor={isNight ? "#444" : "white"} sectionColor={isNight ? "#666" : "white"} fadeDistance={25} opacity={0.3} />
                    )}

                    {gameState.tents.map(tent => (
                        <DraggableObject
                            key={tent.id}
                            id={tent.id}
                            position={getGroundedPosition(tent.position)}
                            rotation={[0, 0, 0]}
                            isSelected={selectedItemId === tent.id}
                            onSelect={setSelectedItemId}
                            onMove={(id, pos) => onMoveTent(id, pos)}
                            onInteract={() => handleTentInteract(tent)}
                            isEditMode={isEditMode}
                        >
                            <TentMesh tent={tent} />
                        </DraggableObject>
                    ))}

                    <Player 
                        avatar={gameState.avatar} 
                        playerRef={playerRef}
                        moveTarget={isEditMode ? null : moveTarget}
                        setMoveTarget={setMoveTarget}
                        obstacles={obstacleData}
                        getGroundY={getIslandSurfaceY}
                    />

                    {gameState.partners.map(partner => (
                        <DraggableObject 
                            key={partner.id}
                            id={partner.id} 
                            position={getGroundedPosition(partner.position)} 
                            rotation={partner.rotation}
                            isSelected={selectedItemId === partner.id} 
                            onSelect={setSelectedItemId} 
                            onMove={(id, pos) => onMovePartner(id, pos)}
                            onInteract={() => handlePartnerInteract(partner.id)}
                            isEditMode={isEditMode}
                            greetingText={bubble?.id === partner.id ? bubble.text : null}
                            onCloseGreeting={clearBubble}
                        >
                            <Player 
                                avatar={partner} 
                                playerRef={{ current: null } as any} 
                                isPartner={true} 
                                getGroundY={getIslandSurfaceY}
                            />
                        </DraggableObject>
                    ))}

                    {gameState.placedItems.map(item => (
                        <DraggableObject 
                            key={item.id} 
                            id={item.id} 
                            position={getGroundedPosition(item.position, getItemGroundOffset(item.itemId))} 
                            rotation={item.rotation}
                            isSelected={selectedItemId === item.id} 
                            onSelect={setSelectedItemId} 
                            onMove={handleItemDrag}
                            onInteract={
                                item.itemId === 'sunbed' || item.itemId === 'picnic_mat' || item.itemId === 'orange_mat'
                                    ? () => handleItemInteract(item)
                                    : undefined
                            }
                            isEditMode={isEditMode}
                        >
                            {item.itemId === 'tree_pine' && <Tree type={0} />}
                            {item.itemId === 'tree_zelkova' && <Tree type={1} />}
                            {item.itemId === 'tree_round' && <Tree type={2} />}
                            {item.itemId === 'tree_birch' && <Tree type={3} />}
                            {item.itemId === 'tree_palm' && <Tree type={4} />}
                            {item.itemId === 'tree_lemon' && <Tree type={5} />}
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
                            {item.itemId === 'wood_lamp' && <WoodenStreetLamp />}
                            {item.itemId === 'candle' && <Candle />}
                            {item.itemId === 'flashlight' && <Flashlight />}
                            {item.itemId === 'camping_chair' && <CampingChair />}
                            {item.itemId === 'camping_table' && <CampingTable />}
                            {item.itemId === 'picnic_table_small' && <SmallPicnicTable />}
                            {item.itemId === 'teddy_bear' && <TeddyBear />}
                            {item.itemId === 'duck_float' && <DuckFloat />}
                            {item.itemId === 'duck_feet' && <DuckFeet />}
                            {item.itemId === 'pond' && <Pond />}
                            {item.itemId === 'pot' && <CookingPot />}
                            {item.itemId === 'coffee_pot' && <CoffeePot />}
                            {item.itemId === 'camping_burner' && <CampingBurner />}
                            {item.itemId === 'ramen_pot' && <RamenPot />}
                            {item.itemId === 'spoon_chopsticks' && <SpoonChopsticksSet />}
                            {item.itemId === 'choco_cookie' && <ChocoCookie />}
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
                            position={getGroundedPosition(pet.position, PET_GROUND_OFFSET)}
                            isSelected={selectedItemId === pet.id} 
                            onSelect={setSelectedItemId} 
                            onMove={onMovePet} 
                            isEditMode={isEditMode}
                            onInteract={() => handlePetInteract(pet)}
                            greetingText={bubble?.id === pet.id ? bubble.text : null}
                            onCloseGreeting={clearBubble}
                        />
                    ))}

                    {actionMenu && actionMenuConfig && (
                        <ActionMenu
                            position={getGroundedPosition(actionMenu.position)}
                            options={actionMenuConfig.options}
                            yOffset={actionMenuConfig.yOffset}
                        />
                    )}

                    {!isEditMode && moveTarget && <MoveMarker position={getGroundedPosition(moveTarget)} />}

                    <CameraController playerRef={playerRef} controlsRef={controlsRef} isEditMode={isEditMode} />
                    <OrbitControls 
                        ref={controlsRef} 
                        enablePan={false} 
                        enableRotate={!isEditMode}
                        enableZoom={true}
                        autoRotate={false}
                        rotateSpeed={isEditMode ? 0 : 1}
                        zoomSpeed={isEditMode ? 0.3 : 1}
                        maxPolarAngle={Math.PI / 2 - 0.1} 
                        minDistance={5} 
                        maxDistance={isMobile ? 30 : 24} 
                    />
                </Canvas>
            </KeyboardControls>
        </div>
    );
};

export default GameCanvas;
