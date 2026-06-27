import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import gsap from 'gsap';
import { Sparkles, ArrowRight, Loader2 } from 'lucide-react';
import { motion } from 'motion/react';

interface SplashScreenProps {
  onFinish: () => void;
}

export default function SplashScreen({ onFinish }: SplashScreenProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const titleRef = useRef<HTMLHeadingElement>(null);
  const subtitleRef = useRef<HTMLParagraphElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const textContainerRef = useRef<HTMLDivElement>(null);
  
  const [loading, setLoading] = useState(true);
  const [countdown, setCountdown] = useState(4);

  useEffect(() => {
    if (!canvasRef.current || !containerRef.current) return;

    // --- THREE.JS SCENE SETUP ---
    const width = containerRef.current.clientWidth;
    const height = containerRef.current.clientHeight;

    const scene = new THREE.Scene();
    
    const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 100);
    camera.position.z = 6.5;

    const renderer = new THREE.WebGLRenderer({
      canvas: canvasRef.current,
      antialias: true,
      alpha: true,
    });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

    // --- LIGHTS ---
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
    scene.add(ambientLight);

    const mainLight = new THREE.DirectionalLight(0xffffff, 1.8);
    mainLight.position.set(5, 5, 5);
    scene.add(mainLight);

    const redLight = new THREE.PointLight(0xef4444, 3, 10);
    redLight.position.set(-3, -2, 2);
    scene.add(redLight);

    const emeraldLight = new THREE.PointLight(0x10b981, 2, 10);
    emeraldLight.position.set(3, 2, 2);
    scene.add(emeraldLight);

    // --- 3D GEOMETRY CREATION ---
    const logoGroup = new THREE.Group();

    // 1. Red rounded box card
    const rectShape = new THREE.Shape();
    const cWidth = 2.0;
    const cHeight = 2.0;
    const radius = 0.45;
    const x = -cWidth / 2;
    const y = -cHeight / 2;

    rectShape.moveTo(x + radius, y);
    rectShape.lineTo(x + cWidth - radius, y);
    rectShape.quadraticCurveTo(x + cWidth, y, x + cWidth, y + radius);
    rectShape.lineTo(x + cWidth, y + cHeight - radius);
    rectShape.quadraticCurveTo(x + cWidth, y + cHeight, x + cWidth - radius, y + cHeight);
    rectShape.lineTo(x + radius, y + cHeight);
    rectShape.quadraticCurveTo(x, y + cHeight, x, y + cHeight - radius);
    rectShape.lineTo(x, y + radius);
    rectShape.quadraticCurveTo(x, y, x + radius, y);

    const extrudeSettings = {
      depth: 0.2,
      bevelEnabled: true,
      bevelSegments: 8,
      steps: 1,
      bevelSize: 0.06,
      bevelThickness: 0.06,
    };

    const cardGeometry = new THREE.ExtrudeGeometry(rectShape, extrudeSettings);
    // Center geometry properly
    cardGeometry.center();

    const cardMaterial = new THREE.MeshPhysicalMaterial({
      color: 0xef4444, // Red-500
      roughness: 0.15,
      metalness: 0.1,
      clearcoat: 1.0,
      clearcoatRoughness: 0.1,
      shadowSide: THREE.DoubleSide,
    });

    const cardMesh = new THREE.Mesh(cardGeometry, cardMaterial);
    logoGroup.add(cardMesh);

    // 2. White shuttlecock / arrow shape
    const shuttleShape = new THREE.Shape();
    shuttleShape.moveTo(0, 0.65); // Top apex
    shuttleShape.lineTo(0.55, -0.5); // Bottom right
    shuttleShape.lineTo(0, -0.25); // Inner notch
    shuttleShape.lineTo(-0.55, -0.5); // Bottom left
    shuttleShape.closePath();

    const shuttleExtrudeSettings = {
      depth: 0.1,
      bevelEnabled: true,
      bevelSegments: 5,
      steps: 1,
      bevelSize: 0.02,
      bevelThickness: 0.02,
    };

    const shuttleGeometry = new THREE.ExtrudeGeometry(shuttleShape, shuttleExtrudeSettings);
    shuttleGeometry.center();

    const shuttleMaterial = new THREE.MeshPhysicalMaterial({
      color: 0xffffff,
      roughness: 0.1,
      metalness: 0.1,
      clearcoat: 0.8,
    });

    const shuttleMesh = new THREE.Mesh(shuttleGeometry, shuttleMaterial);
    // Offset slightly forward on Z so it rests cleanly on top of the card
    shuttleMesh.position.z = 0.16;
    logoGroup.add(shuttleMesh);

    scene.add(logoGroup);

    // 3. Floating particle dust
    const particleCount = 150;
    const particleGeometry = new THREE.BufferGeometry();
    const positions = new Float32Array(particleCount * 3);
    const speeds = new Float32Array(particleCount);

    for (let i = 0; i < particleCount * 3; i += 3) {
      positions[i] = (Math.random() - 0.5) * 8;
      positions[i + 1] = (Math.random() - 0.5) * 8;
      positions[i + 2] = (Math.random() - 0.5) * 6;
      speeds[i / 3] = 0.1 + Math.random() * 0.3;
    }

    particleGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    const particleMaterial = new THREE.PointsMaterial({
      color: 0xef4444,
      size: 0.035,
      transparent: true,
      opacity: 0.4,
      blending: THREE.AdditiveBlending,
    });

    const particles = new THREE.Points(particleGeometry, particleMaterial);
    scene.add(particles);

    // Initial scale and rotation state for entrance animation
    logoGroup.scale.set(0, 0, 0);
    logoGroup.rotation.set(Math.PI * 2, Math.PI * 3, 0);

    setLoading(false);

    // --- GSAP INTRO ANIMATION ---
    const tl = gsap.timeline();

    // 1. Zoom and rotate the 3D Logo beautifully
    tl.to(logoGroup.scale, {
      x: 1,
      y: 1,
      z: 1,
      duration: 1.8,
      ease: 'elastic.out(1, 0.75)',
    }, 0.2);

    tl.to(logoGroup.rotation, {
      x: 0.15, // Sleek forward tilt
      y: -0.25, // Sleek angle tilt
      z: 0,
      duration: 2.2,
      ease: 'power3.out',
    }, 0.2);

    // 2. Animate text and UI elements
    if (textContainerRef.current) {
      tl.fromTo(textContainerRef.current, 
        { opacity: 0, y: 30 },
        { opacity: 1, y: 0, duration: 1.2, ease: 'power3.out' },
        0.6
      );
    }

    if (titleRef.current) {
      const titleChars = titleRef.current.querySelectorAll('.char');
      tl.fromTo(titleChars,
        { opacity: 0, y: 20, scale: 0.8 },
        { opacity: 1, y: 0, scale: 1, duration: 0.8, stagger: 0.05, ease: 'back.out(1.7)' },
        0.8
      );
    }

    if (subtitleRef.current) {
      tl.fromTo(subtitleRef.current,
        { opacity: 0, y: 15 },
        { opacity: 1, y: 0, duration: 1.0, ease: 'power2.out' },
        1.3
      );
    }

    if (buttonRef.current) {
      tl.fromTo(buttonRef.current,
        { opacity: 0, scale: 0.9 },
        { opacity: 1, scale: 1, duration: 0.8, ease: 'power3.out' },
        1.6
      );
    }

    // --- INTERACTIVE MOUSE ROTATION ---
    let mouseX = 0;
    let mouseY = 0;
    let targetX = 0;
    let targetY = 0;

    const handleMouseMove = (event: MouseEvent) => {
      mouseX = (event.clientX / window.innerWidth - 0.5) * 0.6;
      mouseY = (event.clientY / window.innerHeight - 0.5) * 0.6;
    };

    window.addEventListener('mousemove', handleMouseMove);

    // --- ANIMATION LOOP ---
    const startTime = performance.now();
    let animationFrameId: number;

    const animate = () => {
      animationFrameId = requestAnimationFrame(animate);

      const elapsedTime = (performance.now() - startTime) / 1000;

      // Ambient floating motion
      logoGroup.position.y = Math.sin(elapsedTime * 1.5) * 0.12;
      logoGroup.position.x = Math.cos(elapsedTime * 0.8) * 0.05;

      // Smooth mouse lag tracking
      targetX += (mouseX - targetX) * 0.08;
      targetY += (mouseY - targetY) * 0.08;

      logoGroup.rotation.y = -0.25 + targetX * 1.5;
      logoGroup.rotation.x = 0.15 - targetY * 1.5;

      // Spin particles
      particles.rotation.y = elapsedTime * 0.03;
      particles.rotation.x = elapsedTime * 0.01;

      // Animate individual points in particles slightly
      const positionsArr = particles.geometry.attributes.position.array as Float32Array;
      for (let i = 0; i < particleCount; i++) {
        const index = i * 3 + 1; // Y axis
        positionsArr[index] -= speeds[i] * 0.01;
        if (positionsArr[index] < -4) {
          positionsArr[index] = 4;
        }
      }
      particles.geometry.attributes.position.needsUpdate = true;

      renderer.render(scene, camera);
    };

    animate();

    // --- HANDLE WINDOW RESIZE ---
    const handleResize = () => {
      if (!containerRef.current || !canvasRef.current) return;
      const w = containerRef.current.clientWidth;
      const h = containerRef.current.clientHeight;

      camera.aspect = w / h;
      camera.updateProjectionMatrix();

      renderer.setSize(w, h);
    };

    window.addEventListener('resize', handleResize);

    // Cleanups
    return () => {
      cancelAnimationFrame(animationFrameId);
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('resize', handleResize);
      renderer.dispose();
    };
  }, []);

  // --- AUTO COUNTDOWN TO LAUNCH APP ---
  useEffect(() => {
    if (countdown <= 0) {
      handleExit();
      return;
    }

    const timer = setTimeout(() => {
      setCountdown(prev => prev - 1);
    }, 1000);

    return () => clearTimeout(timer);
  }, [countdown]);

  const handleExit = () => {
    // Fade out elements beautifully with GSAP before unmounting
    gsap.to(containerRef.current, {
      opacity: 0,
      scale: 1.05,
      duration: 0.8,
      ease: 'power3.inOut',
      onComplete: () => {
        onFinish();
      }
    });
  };

  const titleText = "RALLYUP";

  return (
    <motion.div
      ref={containerRef}
      exit={{ opacity: 0, scale: 0.95 }}
      transition={{ duration: 0.6, ease: 'easeInOut' }}
      className="fixed inset-0 bg-slate-950 z-50 flex flex-col items-center justify-center overflow-hidden"
    >
      {/* Background gradients */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_40%,rgba(239,68,68,0.08),transparent_50%)] pointer-events-none"></div>
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_80%,rgba(16,185,129,0.04),transparent_60%)] pointer-events-none"></div>

      {/* Grid pattern overlay */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(255,255,255,0.01)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.01)_1px,transparent_1px)] bg-[size:40px_40px] pointer-events-none"></div>

      {/* THREE.JS WebGL Canvas */}
      <div className="w-full h-[50vh] md:h-[55vh] relative flex items-center justify-center">
        {loading && (
          <div className="absolute flex flex-col items-center gap-3">
            <Loader2 className="w-8 h-8 text-red-500 animate-spin" />
            <span className="text-[10px] font-mono uppercase text-slate-500 tracking-widest">Constructing Court...</span>
          </div>
        )}
        <canvas ref={canvasRef} className="w-full h-full block touch-none z-10" />
      </div>

      {/* Text Context and Staggered Letters */}
      <div 
        ref={textContainerRef}
        className="relative z-20 flex flex-col items-center px-6 text-center max-w-lg -mt-8 md:-mt-4"
      >
        <h2 
          ref={titleRef}
          className="text-4xl md:text-6xl font-black italic tracking-tight text-white mb-2 select-none flex items-center gap-0.5 justify-center"
        >
          {titleText.split("").map((char, index) => (
            <span 
              key={index} 
              className="char inline-block"
              style={{ transformOrigin: 'bottom center' }}
            >
              {char}
            </span>
          ))}
        </h2>

        <p 
          ref={subtitleRef}
          className="text-slate-400 text-xs md:text-sm font-medium tracking-wide leading-relaxed max-w-sm mb-8"
        >
          Interactive Court Controller & Smart Matchmaker for Professional Badminton Clubs
        </p>

        <button
          ref={buttonRef}
          onClick={handleExit}
          className="group h-12 bg-red-500 hover:bg-red-400 text-[#ffffff] font-black text-xs uppercase tracking-widest px-8 rounded-2xl transition-all duration-300 shadow-xl shadow-red-500/15 hover:shadow-red-500/30 active:scale-95 flex items-center gap-2.5"
        >
          <span>Enter Application</span>
          <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
        </button>

        {/* Countdown footer indicator */}
        <div className="mt-8 flex items-center gap-2 text-[10px] font-mono text-slate-500 uppercase tracking-widest">
          <Sparkles className="w-3.5 h-3.5 text-emerald-500 animate-pulse" />
          <span>Auto launching in {countdown}s...</span>
        </div>
      </div>
    </motion.div>
  );
}
