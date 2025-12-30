'use client';

import { useRef, useEffect } from 'react';

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  gridX: number;
  gridY: number;
}

// Spatial grid for O(n) connection checks instead of O(n²)
class SpatialGrid {
  private cellSize: number;
  private grid: Map<string, Particle[]>;
  private width: number;
  private height: number;

  constructor(cellSize: number, width: number, height: number) {
    this.cellSize = cellSize;
    this.grid = new Map();
    this.width = width;
    this.height = height;
  }

  clear() {
    this.grid.clear();
  }

  getCellKey(x: number, y: number): string {
    const cellX = Math.floor(x / this.cellSize);
    const cellY = Math.floor(y / this.cellSize);
    return `${cellX},${cellY}`;
  }

  insert(particle: Particle) {
    const key = this.getCellKey(particle.x, particle.y);
    particle.gridX = Math.floor(particle.x / this.cellSize);
    particle.gridY = Math.floor(particle.y / this.cellSize);

    if (!this.grid.has(key)) {
      this.grid.set(key, []);
    }
    this.grid.get(key)!.push(particle);
  }

  getNearby(particle: Particle): Particle[] {
    const nearby: Particle[] = [];
    const cellX = particle.gridX;
    const cellY = particle.gridY;

    // Check this cell and 8 surrounding cells
    for (let dx = -1; dx <= 1; dx++) {
      for (let dy = -1; dy <= 1; dy++) {
        const key = `${cellX + dx},${cellY + dy}`;
        const particles = this.grid.get(key);
        if (particles) {
          nearby.push(...particles);
        }
      }
    }
    return nearby;
  }
}

export default function ParticleBackground() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number | undefined>(undefined);
  const particlesRef = useRef<Particle[]>([]);
  const spatialGridRef = useRef<SpatialGrid | null>(null);
  const isVisibleRef = useRef(true);
  const lastTimeRef = useRef(0);
  const fpsRef = useRef(60);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d', {
      alpha: true,
      desynchronized: true,
      willReadFrequently: false
    });
    if (!ctx) return;

    // Performance-aware particle count
    const getParticleCount = () => {
      const area = window.innerWidth * window.innerHeight;
      const isMobile = window.innerWidth < 768;
      const baseCount = isMobile ? 70 : 100;
      return Math.min(baseCount, Math.floor(area / 20000));
    };

    // Use device pixel ratio for crisp rendering
    const dpr = Math.min(window.devicePixelRatio || 1, 2); // Cap at 2x for performance

    const resize = () => {
      const w = window.innerWidth;
      const h = window.innerHeight;

      canvas.width = w * dpr;
      canvas.height = h * dpr;
      canvas.style.width = `${w}px`;
      canvas.style.height = `${h}px`;
      ctx.scale(dpr, dpr);

      // Reinitialize particles on resize
      initParticles();
    };

    const initParticles = () => {
      const particleCount = getParticleCount();
      const w = window.innerWidth;
      const h = window.innerHeight;

      particlesRef.current = [];
      for (let i = 0; i < particleCount; i++) {
        particlesRef.current.push({
          x: Math.random() * w,
          y: Math.random() * h,
          vx: (Math.random() - 0.5) * 0.5,
          vy: (Math.random() - 0.5) * 0.5,
          size: Math.random() * 1.5 + 0.8,
          gridX: 0,
          gridY: 0
        });
      }

      // Initialize spatial grid with cell size = half connection distance
      // This ensures smooth transitions when particles cross cell boundaries
      spatialGridRef.current = new SpatialGrid(100, w, h);
    };

    resize();

    // Debounced resize handler
    let resizeTimeout: NodeJS.Timeout;
    const handleResize = () => {
      clearTimeout(resizeTimeout);
      resizeTimeout = setTimeout(resize, 150);
    };
    window.addEventListener('resize', handleResize, { passive: true });

    // Visibility API to pause when tab is hidden
    const handleVisibilityChange = () => {
      isVisibleRef.current = !document.hidden;
      if (isVisibleRef.current) {
        lastTimeRef.current = performance.now();
        animationRef.current = requestAnimationFrame(animate);
      } else {
        if (animationRef.current) {
          cancelAnimationFrame(animationRef.current);
        }
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);

    // Pre-calculate colors to avoid string allocation
    const particleColor = 'rgba(255, 255, 255, 0.8)';
    const baseConnectionColor = 'rgba(255, 255, 255, ';

    // Connection distance
    const connectionDistance = 200;
    const connectionDistanceSq = connectionDistance * connectionDistance;

    const animate = (currentTime: number) => {
      if (!isVisibleRef.current) return;

      animationRef.current = requestAnimationFrame(animate);

      // Frame rate limiting
      const deltaTime = currentTime - lastTimeRef.current;
      const interval = 1000 / fpsRef.current;

      if (deltaTime < interval) return;
      lastTimeRef.current = currentTime - (deltaTime % interval);

      const w = window.innerWidth;
      const h = window.innerHeight;

      // Clear canvas once
      ctx.clearRect(0, 0, w, h);

      // Update spatial grid
      const grid = spatialGridRef.current!;
      grid.clear();

      const particles = particlesRef.current;

      // Update and insert into grid
      ctx.fillStyle = particleColor;
      ctx.beginPath();

      for (let i = 0; i < particles.length; i++) {
        const p = particles[i];

        // Update position
        p.x += p.vx;
        p.y += p.vy;

        // Bounce off edges with proper bounds checking
        if (p.x <= p.size) {
          p.x = p.size;
          p.vx = Math.abs(p.vx);
        } else if (p.x >= w - p.size) {
          p.x = w - p.size;
          p.vx = -Math.abs(p.vx);
        }

        if (p.y <= p.size) {
          p.y = p.size;
          p.vy = Math.abs(p.vy);
        } else if (p.y >= h - p.size) {
          p.y = h - p.size;
          p.vy = -Math.abs(p.vy);
        }

        // Add to grid
        grid.insert(p);

        // Batch draw particles
        ctx.moveTo(p.x + p.size, p.y);
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      }

      ctx.fill();

      // Draw connections using spatial grid (O(n) instead of O(n²))
      ctx.lineWidth = 1;

      const drawnConnections = new Set<string>();

      for (let i = 0; i < particles.length; i++) {
        const p = particles[i];
        const nearby = grid.getNearby(p);

        for (let j = 0; j < nearby.length; j++) {
          const other = nearby[j];
          if (p === other) continue;

          // Create unique connection ID to avoid drawing twice
          const connectionId = p.x < other.x ? `${p.x},${p.y}-${other.x},${other.y}` : `${other.x},${other.y}-${p.x},${p.y}`;
          if (drawnConnections.has(connectionId)) continue;

          const dx = p.x - other.x;
          const dy = p.y - other.y;
          const distSq = dx * dx + dy * dy;

          if (distSq < connectionDistanceSq) {
            const distance = Math.sqrt(distSq);
            const opacity = 0.6 * (1 - distance / connectionDistance);

            ctx.strokeStyle = baseConnectionColor + opacity + ')';
            ctx.beginPath();
            ctx.moveTo(p.x, p.y);
            ctx.lineTo(other.x, other.y);
            ctx.stroke();

            drawnConnections.add(connectionId);
          }
        }
      }
    };

    // Start animation
    lastTimeRef.current = performance.now();
    animationRef.current = requestAnimationFrame(animate);

    return () => {
      window.removeEventListener('resize', handleResize);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      clearTimeout(resizeTimeout);
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, []);

  return (
    <>
      {/* Background - pure black */}
      <div
        className="fixed inset-0 bg-black"
        style={{ zIndex: 0, willChange: 'auto' }}
      />

      {/* Particle Canvas */}
      <canvas
        ref={canvasRef}
        className="fixed inset-0 pointer-events-none"
        style={{ zIndex: 1, willChange: 'transform' }}
      />

      {/* Optimized grid pattern with GPU acceleration - more visible on black */}
      <div
        className="fixed inset-0 opacity-[0.08]"
        style={{
          backgroundImage: `radial-gradient(circle at 1px 1px, white 1px, transparent 0)`,
          backgroundSize: '50px 50px',
          zIndex: 2,
          willChange: 'auto',
          transform: 'translateZ(0)', // GPU acceleration
          backfaceVisibility: 'hidden'
        }}
      />
    </>
  );
}
