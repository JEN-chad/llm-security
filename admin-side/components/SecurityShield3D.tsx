"use client";

import { Canvas, useFrame } from "@react-three/fiber";
import { useRef, useMemo } from "react";
import { Group, Vector3, Color } from "three";
import {
  PerspectiveCamera,
  Sparkles,
  Float,
  Text,
} from "@react-three/drei";

const LEVEL_CONFIGS = [
  { color: "#00ff41", label: "MINIMAL", rings: 1, particles: 20,  rotSpeed: 0.3, shieldOpacity: 0.1  },
  { color: "#33ff77", label: "BASIC",   rings: 2, particles: 60,  rotSpeed: 0.5, shieldOpacity: 0.15 },
  { color: "#ffcc00", label: "GUARDED", rings: 3, particles: 120, rotSpeed: 0.8, shieldOpacity: 0.2  },
  { color: "#ff6600", label: "FORTIFIED", rings: 4, particles: 200, rotSpeed: 1.2, shieldOpacity: 0.25 },
  { color: "#ff003c", label: "MAXIMUM", rings: 5, particles: 350, rotSpeed: 1.8, shieldOpacity: 0.35 },
];

function ShieldCore({ level }: { level: number }) {
  const config = LEVEL_CONFIGS[level - 1] || LEVEL_CONFIGS[0];
  const groupRef = useRef<Group>(null);
  const coreRef = useRef<Group>(null);

  useFrame((state) => {
    const t = state.clock.getElapsedTime();
    if (groupRef.current) {
      groupRef.current.rotation.y = t * config.rotSpeed * 0.3;
    }
    if (coreRef.current) {
      coreRef.current.rotation.x = t * 0.5;
      coreRef.current.rotation.z = t * 0.3;
      const pulse = 1 + Math.sin(t * 2 * level) * 0.05 * level;
      coreRef.current.scale.setScalar(pulse);
    }
  });

  const ringElements = useMemo(() => {
    const rings = [];
    for (let i = 0; i < config.rings; i++) {
      const radius = 1.5 + i * 0.5;
      const thickness = 0.03 + (level * 0.005);
      const tilt = (i * Math.PI) / config.rings;
      const tiltY = (i * Math.PI * 0.5) / config.rings;
      rings.push(
        <mesh key={`ring-${i}`} rotation={[tilt, tiltY, 0]}>
          <torusGeometry args={[radius, thickness, 16, 64]} />
          <meshBasicMaterial
            color={config.color}
            transparent
            opacity={0.4 + i * 0.1}
          />
        </mesh>
      );
    }
    return rings;
  }, [level, config]);

  const hexShields = useMemo(() => {
    if (level < 2) return null;
    const shields = [];
    const count = level * 4;
    for (let i = 0; i < count; i++) {
      const phi = Math.acos(-1 + (2 * i) / count);
      const theta = Math.sqrt(count * Math.PI) * phi;
      const r = 1.8 + level * 0.3;
      const x = r * Math.cos(theta) * Math.sin(phi);
      const y = r * Math.sin(theta) * Math.sin(phi);
      const z = r * Math.cos(phi);
      shields.push(
        <mesh key={`hex-${i}`} position={[x, y, z]} lookAt={new Vector3(0, 0, 0)}>
          <circleGeometry args={[0.15 + level * 0.02, 6]} />
          <meshBasicMaterial
            color={config.color}
            transparent
            opacity={config.shieldOpacity}
            side={2}
          />
        </mesh>
      );
    }
    return shields;
  }, [level, config]);

  const barriers = useMemo(() => {
    if (level < 3) return null;
    const bars = [];
    const count = level * 3;
    for (let i = 0; i < count; i++) {
      const angle = (i * Math.PI * 2) / count;
      const r = 2 + level * 0.2;
      bars.push(
        <mesh
          key={`bar-${i}`}
          position={[Math.cos(angle) * r, 0, Math.sin(angle) * r]}
          rotation={[0, -angle, 0]}
        >
          <boxGeometry args={[0.02, 3 + level * 0.5, 0.02]} />
          <meshBasicMaterial color={config.color} transparent opacity={0.3} />
        </mesh>
      );
    }
    return bars;
  }, [level, config]);

  return (
    <group ref={groupRef}>
      {/* Central Core */}
      <group ref={coreRef}>
        <mesh>
          <icosahedronGeometry args={[0.8, level - 1]} />
          <meshBasicMaterial
            color={config.color}
            wireframe
            transparent
            opacity={0.6}
          />
        </mesh>
        {level >= 3 && (
          <mesh>
            <icosahedronGeometry args={[0.5, 0]} />
            <meshBasicMaterial color={config.color} transparent opacity={0.3} />
          </mesh>
        )}
      </group>

      {/* Defense Rings */}
      {ringElements}

      {/* Hex Shields */}
      {hexShields}

      {/* Vertical Barriers */}
      {barriers}

      {/* Outer Wireframe Shell - appears at level 4+ */}
      {level >= 4 && (
        <mesh>
          <dodecahedronGeometry args={[3, 0]} />
          <meshBasicMaterial
            color={config.color}
            wireframe
            transparent
            opacity={0.08 + level * 0.02}
          />
        </mesh>
      )}

      {/* Max level - spinning outer cage */}
      {level === 5 && (
        <>
          <mesh rotation={[Math.PI / 4, Math.PI / 4, 0]}>
            <octahedronGeometry args={[3.5, 0]} />
            <meshBasicMaterial color="#ff003c" wireframe transparent opacity={0.15} />
          </mesh>
          <mesh rotation={[Math.PI / 3, 0, Math.PI / 6]}>
            <octahedronGeometry args={[3.8, 0]} />
            <meshBasicMaterial color="#ff003c" wireframe transparent opacity={0.1} />
          </mesh>
        </>
      )}

      {/* Particles (sparks/energy) */}
      <Sparkles
        count={config.particles}
        scale={4 + level}
        size={1.5 + level * 0.5}
        speed={0.5 + level * 0.3}
        opacity={0.4 + level * 0.1}
        color={config.color}
        noise={level * 0.5}
      />
    </group>
  );
}

function GridFloor({ color }: { color: string }) {
  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -3, 0]}>
      <planeGeometry args={[30, 30, 30, 30]} />
      <meshBasicMaterial color={color} wireframe transparent opacity={0.08} />
    </mesh>
  );
}

export default function SecurityShield3D({ level }: { level: number }) {
  const config = LEVEL_CONFIGS[Math.max(0, Math.min(4, level - 1))];

  return (
    <div
      className="relative w-full h-[300px] border rounded-lg overflow-hidden transition-all duration-700"
      style={{
        borderColor: config.color,
        boxShadow: `0 0 ${10 + level * 8}px ${config.color}33, inset 0 0 ${5 + level * 4}px ${config.color}11`,
      }}
    >
      {/* Scan line overlay */}
      <div className="absolute inset-0 z-10 pointer-events-none bg-gradient-to-b from-transparent via-[rgba(0,255,65,0.02)] to-transparent animate-[scanline_4s_linear_infinite]" />

      <Canvas gl={{ antialias: false }} dpr={[1, 1.5]}>
        <PerspectiveCamera makeDefault position={[0, 1, 7]} fov={45} />

        <color attach="background" args={["#000000"]} />
        <fog attach="fog" args={["#000000", 5, 18]} />

        <ambientLight intensity={0.3} />
        <pointLight
          position={[5, 5, 5]}
          intensity={0.5 + level * 0.3}
          color={config.color}
        />
        <pointLight
          position={[-5, -5, 5]}
          intensity={0.2 + level * 0.1}
          color={config.color}
        />

        <Float speed={1.5} rotationIntensity={0.1} floatIntensity={0.15}>
          <ShieldCore level={level} />
        </Float>

        <GridFloor color={config.color} />

        {/* Level label */}
        <Text
          position={[0, -2.3, 0]}
          fontSize={0.25}
          color={config.color}
          anchorX="center"
          anchorY="middle"
          font="https://fonts.gstatic.com/s/pressstart2p/v14/e3t4euP8mA7RjloreNAT8_EvG9Xz_WZ9.ttf"
        >
          {config.label}
        </Text>
      </Canvas>

      {/* Corner brackets */}
      <div className="absolute top-2 left-2 w-4 h-4 border-t border-l" style={{ borderColor: config.color }} />
      <div className="absolute top-2 right-2 w-4 h-4 border-t border-r" style={{ borderColor: config.color }} />
      <div className="absolute bottom-2 left-2 w-4 h-4 border-b border-l" style={{ borderColor: config.color }} />
      <div className="absolute bottom-2 right-2 w-4 h-4 border-b border-r" style={{ borderColor: config.color }} />
    </div>
  );
}
