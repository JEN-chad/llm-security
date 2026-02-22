"use client";

import { Canvas, useFrame } from '@react-three/fiber';
import { useRef, useState } from 'react';
import { Group, Vector3 } from 'three';
import { Environment, Text, Float, Sparkles, PerspectiveCamera, OrbitControls } from '@react-three/drei';

function GlitchVault({ isAttacked }: { isAttacked: boolean }) {
  const groupRef = useRef<Group>(null);
  
  // Create randomized grid positions for a "digital cloud" effect
  // Use state to ensure stability across renders
  const [particles] = useState(() => {
    const temp = [];
    for (let i = 0; i < 50; i++) {
        const x = (Math.random() - 0.5) * 10;
        const y = (Math.random() - 0.5) * 10;
        const z = (Math.random() - 0.5) * 10;
        temp.push([x, y, z]);
    }
    return temp;
  });

  useFrame((state) => {
    if (groupRef.current) {
      const time = state.clock.getElapsedTime();
      
      if (isAttacked) {
        // Aggressive Glitch Shake
        // We use Math.random here for the shake effect which is intended to be chaotic per frame
        groupRef.current.position.x = (Math.sin(time * 50) + Math.random() * 0.2) * 0.2;
        groupRef.current.position.y = (Math.cos(time * 40) + Math.random() * 0.2) * 0.2;
        groupRef.current.rotation.z = (Math.sin(time * 30)) * 0.1;
        groupRef.current.scale.setScalar(1 + Math.sin(time * 20) * 0.1);
      } else {
        // Cyber Breathing
        groupRef.current.position.y = Math.sin(time) * 0.2;
        groupRef.current.rotation.y = time * 0.2;
        groupRef.current.scale.setScalar(1);
        groupRef.current.position.x = 0;
        groupRef.current.rotation.z = 0;
      }
    }
  });

  const color = isAttacked ? "#ff003c" : "#00ff41";

  return (
    <group ref={groupRef}>
      {/* Main Wireframe Box */}
      <mesh>
        <boxGeometry args={[3.5, 3.5, 3.5]} />
        <meshBasicMaterial color={color} wireframe={true} transparent opacity={0.3} />
      </mesh>
      
      {/* Inner Solid Core */}
      <mesh>
        <octahedronGeometry args={[1.5]} />
        <meshBasicMaterial color={color} wireframe={true} />
      </mesh>

      {/* Rotating Rings */}
      <mesh rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[2.5, 0.05, 16, 100]} />
        <meshBasicMaterial color={color} />
      </mesh>
      
       <mesh rotation={[0, Math.PI / 2, 0]}>
        <torusGeometry args={[2.8, 0.05, 16, 100]} />
        <meshBasicMaterial color={color} transparent opacity={0.5} />
      </mesh>

      {/* Floating Bits "Data Fragments" */}
      {particles.map((pos, i) => (
         <mesh key={i} position={new Vector3(...pos)}>
            <boxGeometry args={[0.05, 0.05, 0.05]} />
            <meshBasicMaterial color={color} />
         </mesh>
      ))}

      {/* Attack Visuals */}
      {isAttacked && (
        <Sparkles count={200} scale={6} size={4} speed={2} opacity={1} color="#ff003c" noise={1} />
      )}
    </group>
  );
}

function GridFloor({ color }: { color: string }) {
    return (
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -4, 0]}>
        <planeGeometry args={[50, 50, 50, 50]} />
        <meshBasicMaterial color={color} wireframe transparent opacity={0.1} />
      </mesh>
    );
}

export default function VaultScene({ isAttacked, amountTaken }: { isAttacked: boolean, amountTaken: number }) {
  const primaryColor = isAttacked ? "#ff003c" : "#00ff41";

  return (
    <div className={`relative w-full h-[600px] border-2 rounded-xl overflow-hidden shadow-[0_0_30px_rgba(0,255,65,0.1)] transition-all duration-300 ${isAttacked ? 'border-[var(--cyber-red)] shadow-[0_0_50px_var(--cyber-red)]' : 'border-[var(--cyber-green)]'}`}>
      
      {/* Scanlines Overlay */}
      <div className="absolute inset-0 z-20 pointer-events-none bg-[url('https://media.giphy.com/media/oEI9uBYSzLpBK/giphy.gif')] opacity-5 mix-blend-overlay bg-repeat" />
      <div className="absolute inset-0 z-20 bg-gradient-to-b from-transparent via-[rgba(0,255,65,0.02)] to-transparent animate-[scanline_4s_linear_infinite]" />

      <Canvas shadows gl={{ antialias: false }} dpr={[1, 1.5]}>
        <PerspectiveCamera makeDefault position={[0, 0, 9]} fov={50} />
        <OrbitControls enableZoom={false} enablePan={false} maxPolarAngle={Math.PI / 1.5} minPolarAngle={Math.PI / 3} />
        
        {/* Environment - Digital Void */}
        <color attach="background" args={['#000000']} />
        <fog attach="fog" args={['#000000', 5, 20]} />
        
        <ambientLight intensity={0.5} />
        <pointLight position={[10, 10, 10]} intensity={1} color={primaryColor} />
        
        <Float speed={2} rotationIntensity={0.2} floatIntensity={0.2}>
            <GlitchVault isAttacked={isAttacked} />
        </Float>
        
        <GridFloor color={primaryColor} />
        
        {/* Holographic Text */}
         {isAttacked && (
            <Float speed={10} rotationIntensity={0.5} floatIntensity={0.5}>
              <Text
                position={[0, 0, 2]}
                fontSize={1}
                color="#ff003c"
                anchorX="center"
                anchorY="middle"
                font="https://fonts.gstatic.com/s/pressstart2p/v14/e3t4euP8mA7RjloreNAT8_EvG9Xz_WZ9.ttf"
              >
                BREACH DETECTED
              </Text>
            </Float>
         )}

        <Environment preset="city" />
      </Canvas>
      
      {/* HUD Overlay UI */}
      {isAttacked && (
        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none z-30">
          <h1 className="text-8xl font-black text-[var(--cyber-red)] animate-pulse tracking-tighter drop-shadow-[0_0_15px_var(--cyber-red)]" style={{ fontFamily: 'Courier New' }}>
            -${amountTaken}
          </h1>
          <div className="mt-4 text-[var(--cyber-red)] text-xl tracking-[0.5em] animate-ping">CRITICAL FAILURE</div>
        </div>
      )}
      
      {/* Corner Brackets */}
      <div className={`absolute top-4 left-4 w-8 h-8 border-t-2 border-l-2 ${isAttacked ? 'border-[var(--cyber-red)]' : 'border-[var(--cyber-green)]'}`} />
      <div className={`absolute top-4 right-4 w-8 h-8 border-t-2 border-r-2 ${isAttacked ? 'border-[var(--cyber-red)]' : 'border-[var(--cyber-green)]'}`} />
      <div className={`absolute bottom-4 left-4 w-8 h-8 border-b-2 border-l-2 ${isAttacked ? 'border-[var(--cyber-red)]' : 'border-[var(--cyber-green)]'}`} />
      <div className={`absolute bottom-4 right-4 w-8 h-8 border-b-2 border-r-2 ${isAttacked ? 'border-[var(--cyber-red)]' : 'border-[var(--cyber-green)]'}`} />

    </div>
  );
}
