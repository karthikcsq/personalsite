'use client';

import { useRef, useEffect } from 'react';

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
}

export default function ParticleBackground() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Optimized particle system with reduced particle count and better performance
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d', { alpha: true, desynchronized: true });
    if (!ctx) return;

    // Use device pixel ratio for crisp rendering
    const dpr = window.devicePixelRatio || 1;
    const resize = () => {
      canvas.width = window.innerWidth * dpr;
      canvas.height = window.innerHeight * dpr;
      canvas.style.width = `${window.innerWidth}px`;
      canvas.style.height = `${window.innerHeight}px`;
      ctx.scale(dpr, dpr);
    };
    resize();

    let resizeTimeout: NodeJS.Timeout;
    const handleResize = () => {
      clearTimeout(resizeTimeout);
      resizeTimeout = setTimeout(resize, 100);
    };
    window.addEventListener('resize', handleResize);

    // Increased particle count for futuristic effect
    const particleCount = Math.min(100, Math.floor(window.innerWidth / 15));
    const particles: Particle[] = [];
    for (let i = 0; i < particleCount; i++) {
      particles.push({
        x: Math.random() * window.innerWidth,
        y: Math.random() * window.innerHeight,
        vx: (Math.random() - 0.5) * 0.6, // Moderate speed
        vy: (Math.random() - 0.5) * 0.6, // Moderate speed
        size: Math.random() * 2 + 1
      });
    }

    // Optimized animation loop with requestAnimationFrame throttling
    let animationId: number;
    let lastTime = 0;
    const fps = 60;
    const interval = 1000 / fps;

    const animate = (currentTime: number) => {
      animationId = requestAnimationFrame(animate);

      const deltaTime = currentTime - lastTime;
      if (deltaTime < interval) return;
      lastTime = currentTime - (deltaTime % interval);

      ctx.clearRect(0, 0, window.innerWidth, window.innerHeight);

      // Batch drawing operations with dark blue color
      ctx.fillStyle = 'rgba(59, 130, 246, 0.7)'; // Blue-500 with opacity
      particles.forEach((particle) => {
        // Update position
        particle.x += particle.vx;
        particle.y += particle.vy;

        // Bounce off edges
        if (particle.x < 0 || particle.x > window.innerWidth) particle.vx *= -1;
        if (particle.y < 0 || particle.y > window.innerHeight) particle.vy *= -1;

        // Draw particle
        ctx.beginPath();
        ctx.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2);
        ctx.fill();
      });

      // Draw connections (optimized to only check nearby particles)
      const connectionDistance = 200;
      for (let i = 0; i < particles.length; i++) {
        const particle = particles[i];
        for (let j = i + 1; j < particles.length; j++) {
          const other = particles[j];
          const dx = particle.x - other.x;
          const dy = particle.y - other.y;

          // Quick distance check before sqrt
          const distSq = dx * dx + dy * dy;
          if (distSq < connectionDistance * connectionDistance) {
            const distance = Math.sqrt(distSq);
            ctx.strokeStyle = `rgba(59, 130, 246, ${0.5 * (1 - distance / connectionDistance)})`; // Blue connections
            ctx.lineWidth = 1.0;
            ctx.beginPath();
            ctx.moveTo(particle.x, particle.y);
            ctx.lineTo(other.x, other.y);
            ctx.stroke();
          }
        }
      }
    };

    animationId = requestAnimationFrame(animate);

    return () => {
      window.removeEventListener('resize', handleResize);
      clearTimeout(resizeTimeout);
      cancelAnimationFrame(animationId);
    };
  }, []);

  return (
    <>
      {/* Background gradient */}
      <div className="fixed inset-0 bg-gradient-to-br from-gray-950 via-blue-950 to-gray-950" style={{ zIndex: 0 }} />

      {/* Particle Canvas */}
      <canvas
        ref={canvasRef}
        className="fixed inset-0 pointer-events-none"
        style={{ zIndex: 1 }}
      />

      {/* Refined grid pattern */}
      <div className="fixed inset-0 opacity-[0.03]"
        style={{
          backgroundImage: `radial-gradient(circle at 1px 1px, white 1px, transparent 0)`,
          backgroundSize: '50px 50px',
          zIndex: 2
        }}
      />
    </>
  );
}
