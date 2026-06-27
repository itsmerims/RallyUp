import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { MapControls } from '@react-three/drei';
import { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { SkillTier } from '../types';

interface PlayerData {
  id: string;
  name: string;
  tier: SkillTier;
}

interface CourtData {
  id: string;
  status: 'VACANT' | 'OCCUPIED' | 'FINISHING';
  name: string;
  teamA?: PlayerData[];
  teamB?: PlayerData[];
}

interface CourtSceneProps {
  courts: CourtData[];
}

function PlayerModel({ position, tier, name }: { position: [number, number, number]; tier: SkillTier; name: string }) {
  const getTierColor = (t: SkillTier) => {
    switch (t) {
      case 'BEGINNER': return '#64748b'; // Slate/Gray
      case 'LOW_INTERMEDIATE': return '#3b82f6'; // Blue
      case 'INTERMEDIATE': return '#10b981'; // Emerald/Green
      case 'ADVANCED': return '#a855f7'; // Purple
      default: return '#cbd5e1';
    }
  };

  const color = getTierColor(tier);

  return (
    <group position={position}>
      {/* Body: cylinder representing a stylized avatar torso */}
      <mesh castShadow position={[0, 0.35, 0]}>
        <cylinderGeometry args={[0.14, 0.18, 0.7, 12]} />
        <meshStandardMaterial color={color} roughness={0.3} metalness={0.1} />
      </mesh>
      {/* Head: sphere */}
      <mesh castShadow position={[0, 0.8, 0]}>
        <sphereGeometry args={[0.13, 12, 12]} />
        <meshStandardMaterial color={color} roughness={0.3} metalness={0.1} />
      </mesh>
      {/* Small floating halo/ring for skill tier identity */}
      <mesh position={[0, 0.98, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <ringGeometry args={[0.07, 0.12, 12]} />
        <meshBasicMaterial color={color} side={THREE.DoubleSide} />
      </mesh>
    </group>
  );
}

function CourtModel({ 
  position, 
  status, 
  name,
  teamA = [],
  teamB = [],
  isLightMode = false,
}: { 
  position: [number, number, number], 
  status: string, 
  name: string,
  teamA?: PlayerData[],
  teamB?: PlayerData[],
  isLightMode?: boolean,
}) {
  const meshRef = useRef<THREE.Group>(null);
  const glowRef = useRef<THREE.Mesh>(null);
  
  const getColors = () => {
    switch(status) {
      case 'VACANT': return { base: '#10b981', glow: '#059669', emissive: '#34d399' }; // Green
      case 'OCCUPIED': return { base: '#f43f5e', glow: '#e11d48', emissive: '#fb7185' }; // Neon Pink/Red
      case 'FINISHING': return { base: '#f59e0b', glow: '#d97706', emissive: '#fbbf24' }; // Amber
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
          color={isLightMode ? '#f8fafc' : '#0f172a'} 
          roughness={0.8}
          metalness={0.2}
          emissive={colors.emissive}
          emissiveIntensity={isLightMode ? 0.25 : 0.1}
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
          color={isLightMode ? '#64748b' : '#cbd5e1'} 
          transparent 
          opacity={isLightMode ? 0.15 : 0.3} 
          wireframe 
          emissive="#ffffff"
          emissiveIntensity={isLightMode ? 0.1 : 0.2}
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
      <pointLight position={[0, 2, 0]} color={colors.emissive} intensity={status === 'OCCUPIED' ? 1.8 : 1.2} distance={6} />

      {/* Render Players on Court if not Vacant */}
      {status !== 'VACANT' && (
        <>
          {/* Team A Players (stands on negative Z half of the court) */}
          {teamA.map((player, idx) => {
            const xOffset = teamA.length === 1 ? 0 : idx === 0 ? -0.8 : 0.8;
            return (
              <PlayerModel 
                key={`${player.id}-${idx}`} 
                position={[xOffset, 0.1, -1.8]} 
                tier={player.tier} 
                name={player.name} 
              />
            );
          })}
          
          {/* Team B Players (stands on positive Z half of the court) */}
          {teamB.map((player, idx) => {
            const xOffset = teamB.length === 1 ? 0 : idx === 0 ? -0.8 : 0.8;
            return (
              <PlayerModel 
                key={`${player.id}-${idx}`} 
                position={[xOffset, 0.1, 1.8]} 
                tier={player.tier} 
                name={player.name} 
              />
            );
          })}
        </>
      )}
    </group>
  );
}

function SceneTheme() {
  const { scene } = useThree();

  useEffect(() => {
    const isLight = document.documentElement.classList.contains('theme-light');
    if (isLight) {
      scene.background = new THREE.Color('#e2e8f0');
    } else {
      scene.background = new THREE.Color('#020617');
    }
  }, [scene]);

  return null;
}

export default function CourtScene({ courts }: CourtSceneProps) {
  const isLightMode = typeof document !== 'undefined' && document.documentElement.classList.contains('theme-light');

  return (
    <div className={`w-full h-48 md:h-64 lg:h-80 relative overflow-hidden rounded-2xl border shadow-2xl mb-6 ${
      isLightMode ? 'bg-slate-200 border-slate-300 shadow-slate-300/50' : 'bg-slate-950 border-slate-800 shadow-slate-950/50'
    }`}>
      <Canvas shadows={{ type: THREE.PCFShadowMap }} camera={{ position: [0, 8, 12], fov: 45 }}>
        <SceneTheme />
        <MapControls 
          enableDamping 
          dampingFactor={0.05}
          maxPolarAngle={Math.PI / 2.2} 
          minPolarAngle={Math.PI / 6}
          minDistance={5}
          maxDistance={30}
        />
        {isLightMode ? (
          <fog attach="fog" args={['#e2e8f0', 10, 35]} />
        ) : (
          <fog attach="fog" args={['#020617', 10, 35]} />
        )}
        <ambientLight intensity={isLightMode ? 0.6 : 0.4} />
        <directionalLight position={[10, 15, -5]} intensity={isLightMode ? 1.2 : 1} castShadow shadow-mapSize={[1024, 1024]} />
        
        <group position={[0, 0, -2]}>
          {courts.map((court, index) => {
            const xPos = (index - (courts.length - 1) / 2) * 5;
            return (
              <CourtModel 
                key={court.id} 
                position={[xPos, 0, 0]} 
                status={court.status} 
                name={court.name} 
                teamA={court.teamA}
                teamB={court.teamB}
                isLightMode={isLightMode}
              />
            );
          })}
        </group>
      </Canvas>
      
      {/* Legend Overlay */}
      <div className={`absolute bottom-4 left-4 border rounded-xl p-3 flex flex-col gap-2 z-10 backdrop-blur-sm shadow-xl pointer-events-auto ${
        isLightMode ? 'bg-white/95 border-slate-200 shadow-slate-200/50' : 'bg-slate-900/95 border-slate-800/80'
      }`}>
        <span className={`text-[10px] font-black uppercase tracking-wider ${isLightMode ? 'text-slate-500' : 'text-slate-400'}`}>Player Legend (Skill Tier)</span>
        <div className="grid grid-cols-2 gap-x-4 gap-y-1.5">
          {[
            { color: '#64748b', label: 'Beginner' },
            { color: '#3b82f6', label: 'Low Inter' },
            { color: '#10b981', label: 'Intermediate' },
            { color: '#a855f7', label: 'Advanced' },
          ].map((item) => (
            <div key={item.label} className="flex items-center gap-1.5">
              <span className={`w-2.5 h-2.5 rounded-full`} style={{ backgroundColor: item.color, boxShadow: `0 0 8px ${item.color}80` }}></span>
              <span className={`text-[9px] font-bold uppercase tracking-tight ${isLightMode ? 'text-slate-600' : 'text-slate-300'}`}>{item.label}</span>
            </div>
          ))}
        </div>
      </div>

      <div className={`absolute inset-0 pointer-events-none ${
        isLightMode ? 'bg-gradient-to-t from-slate-200 via-transparent to-slate-200/20' : 'bg-gradient-to-t from-slate-950 via-transparent to-slate-950/20'
      }`} />
    </div>
  );
}
