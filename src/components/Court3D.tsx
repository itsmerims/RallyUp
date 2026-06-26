import { Canvas, useFrame } from '@react-three/fiber';
import { useAppStore } from '../store';
import { useRef, useMemo } from 'react';
import * as THREE from 'three';

function CourtModel({ position, status, name }: { position: [number, number, number], status: string, name: string }) {
  const meshRef = useRef<THREE.Group>(null);
  const glowRef = useRef<THREE.Mesh>(null);
  
  const getColors = () => {
    switch(status) {
      case 'Available': return { base: '#10b981', glow: '#059669', emissive: '#34d399' }; // Green
      case 'Occupied': return { base: '#f43f5e', glow: '#e11d48', emissive: '#fb7185' }; // Neon Pink/Red
      case 'Finishing Soon': return { base: '#f59e0b', glow: '#d97706', emissive: '#fbbf24' }; // Amber
      default: return { base: '#334155', glow: '#1e293b', emissive: '#475569' };
    }
  };

  const colors = getColors();

  // Subtle floating animation for the glow effect
  useFrame((state) => {
    if (glowRef.current && glowRef.current.material) {
      (glowRef.current.material as THREE.Material).opacity = 0.4 + Math.sin(state.clock.elapsedTime * 2) * 0.1;
    }
  });

  return (
    <group position={position} ref={meshRef}>
      {/* Main Court Surface */}
      <mesh position={[0, 0, 0]} receiveShadow castShadow>
        <boxGeometry args={[4, 0.2, 8]} />
        <meshStandardMaterial 
          color="#0f172a" 
          roughness={0.8}
          metalness={0.2}
          emissive={colors.emissive}
          emissiveIntensity={0.1}
        />
      </mesh>
      
      {/* Outer Border Glowing Line */}
      <mesh position={[0, 0.11, 0]}>
        <boxGeometry args={[3.8, 0.02, 7.8]} />
        <meshStandardMaterial 
          color={colors.base} 
          emissive={colors.emissive} 
          emissiveIntensity={1.5} 
          wireframe
        />
      </mesh>

      {/* Center Net */}
      <mesh position={[0, 0.5, 0]}>
        <boxGeometry args={[4.2, 0.8, 0.05]} />
        <meshStandardMaterial 
          color="#cbd5e1" 
          transparent 
          opacity={0.3} 
          wireframe 
          emissive="#ffffff"
          emissiveIntensity={0.2}
        />
      </mesh>

      {/* Animated Floor Glow */}
      <mesh ref={glowRef} position={[0, -0.1, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[5.5, 9.5]} />
        <meshBasicMaterial 
          color={colors.glow} 
          transparent 
          opacity={0.4} 
          depthWrite={false}
        />
      </mesh>
      
      {/* Status Light casting light onto surrounding */}
      <pointLight position={[0, 2, 0]} color={colors.emissive} intensity={status === 'Occupied' ? 1.8 : 1.2} distance={6} />
    </group>
  );
}

export default function Court3D() {
  const courts = useAppStore(state => state.courts);

  return (
    <div className="w-full h-48 md:h-64 lg:h-80 bg-slate-950 relative overflow-hidden rounded-2xl border border-slate-800 shadow-2xl shadow-slate-950/50 mb-6">
      <Canvas shadows camera={{ position: [0, 8, 12], fov: 45 }}>
        <fog attach="fog" args={['#020617', 10, 25]} />
        <ambientLight intensity={0.4} />
        <directionalLight position={[10, 15, -5]} intensity={1} castShadow shadow-mapSize={[1024, 1024]} />
        
        <group position={[0, 0, -2]}>
          {courts.map((court, index) => {
            const xPos = (index - 1.5) * 5;
            return (
              <CourtModel 
                key={`${court.id}-${index}`} 
                position={[xPos, 0, 0]} 
                status={court.status} 
                name={court.name} 
              />
            );
          })}
        </group>
      </Canvas>
      <div className="absolute inset-0 pointer-events-none bg-gradient-to-t from-slate-950 via-transparent to-slate-950/20" />
    </div>
  );
}
