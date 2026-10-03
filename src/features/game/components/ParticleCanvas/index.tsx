"use client";

import {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useRef,
} from "react";

export type ParticleCanvasHandle = {
  burst: (type: "EXCELLENT" | "GODLIKE", x?: number, y?: number) => void;
  clear: () => void;
};

type Particle = {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  color: string;
  alpha: number;
  decay: number;
  gravity: number;
  drag: number;
  shape: "circle" | "spark" | "ring";
  rotation?: number;
  vRot?: number;
  scaleX?: number;
};

const GODLIKE_COLORS = [
  "#ffd700", // Gold
  "#ffb700", // Amber
  "#ffffff", // White shine
  "#fff3a8", // Pale gold
  "#ff7b00", // Bright orange-gold
];

const EXCELLENT_COLORS = [
  "#ff64ff", // Neon pink
  "#bc13fe", // Electric purple
  "#00f3ff", // Cyan
  "#ffffff", // White
  "#e056fd", // Deep magenta
];

export const ParticleCanvas = forwardRef<ParticleCanvasHandle>((_, ref) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const particlesRef = useRef<Particle[]>([]);
  const animIdRef = useRef<number | null>(null);

  // Resize canvas to full window
  const updateSize = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const dpr = typeof window !== "undefined" ? window.devicePixelRatio || 1 : 1;
    canvas.width = window.innerWidth * dpr;
    canvas.height = window.innerHeight * dpr;
    const ctx = canvas.getContext("2d");
    if (ctx) {
      ctx.scale(dpr, dpr);
    }
  }, []);

  useEffect(() => {
    updateSize();
    window.addEventListener("resize", updateSize);
    return () => {
      window.removeEventListener("resize", updateSize);
      if (animIdRef.current) cancelAnimationFrame(animIdRef.current);
    };
  }, [updateSize]);

  // Main animation frame loop
  const loop = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.clearRect(0, 0, window.innerWidth, window.innerHeight);

    const particles = particlesRef.current;
    const aliveParticles: Particle[] = [];

    for (let i = 0; i < particles.length; i++) {
      const p = particles[i];
      p.x += p.vx;
      p.y += p.vy;
      p.vy += p.gravity;
      p.vx *= p.drag;
      p.vy *= p.drag;
      p.alpha -= p.decay;

      if (p.rotation !== undefined && p.vRot !== undefined) {
        p.rotation += p.vRot;
      }

      if (p.alpha > 0) {
        ctx.save();
        ctx.globalAlpha = Math.max(0, p.alpha);

        if (p.shape === "circle") {
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
          ctx.fillStyle = p.color;
          ctx.shadowBlur = p.size * 2;
          ctx.shadowColor = p.color;
          ctx.fill();
        } else if (p.shape === "spark") {
          ctx.translate(p.x, p.y);
          if (p.rotation !== undefined) ctx.rotate(p.rotation);
          ctx.scale(p.scaleX || 2, 1);
          ctx.beginPath();
          ctx.arc(0, 0, p.size, 0, Math.PI * 2);
          ctx.fillStyle = p.color;
          ctx.shadowBlur = p.size * 3;
          ctx.shadowColor = p.color;
          ctx.fill();
        } else if (p.shape === "ring") {
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
          ctx.strokeStyle = p.color;
          ctx.lineWidth = 2;
          ctx.shadowBlur = 10;
          ctx.shadowColor = p.color;
          ctx.stroke();
          p.size += 3;
        }

        ctx.restore();
        aliveParticles.push(p);
      }
    }

    particlesRef.current = aliveParticles;

    if (aliveParticles.length > 0) {
      animIdRef.current = requestAnimationFrame(loop);
    } else {
      animIdRef.current = null;
    }
  }, []);

  const burst = useCallback(
    (type: "EXCELLENT" | "GODLIKE", x?: number, y?: number) => {
      if (typeof window === "undefined") return;

      const originX = x ?? window.innerWidth / 2;
      const originY = y ?? window.innerHeight / 2;

      const colors = type === "GODLIKE" ? GODLIKE_COLORS : EXCELLENT_COLORS;
      const count = type === "GODLIKE" ? 80 : 45;
      const speedMultiplier = type === "GODLIKE" ? 1.5 : 1.1;

      const newParticles: Particle[] = [];

      // Add a shockwave ring
      newParticles.push({
        x: originX,
        y: originY,
        vx: 0,
        vy: 0,
        size: 10,
        color: colors[0],
        alpha: 0.9,
        decay: 0.04,
        gravity: 0,
        drag: 1,
        shape: "ring",
      });

      // Scatter particles
      for (let i = 0; i < count; i++) {
        const angle = Math.random() * Math.PI * 2;
        const speed = (Math.random() * 10 + 4) * speedMultiplier;
        const color = colors[Math.floor(Math.random() * colors.length)];
        const isSpark = Math.random() > 0.4;

        newParticles.push({
          x: originX,
          y: originY,
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed,
          size: isSpark ? Math.random() * 4 + 3 : Math.random() * 3 + 2,
          color,
          alpha: 1,
          decay: Math.random() * 0.02 + 0.015,
          gravity: 0.12,
          drag: 0.94,
          shape: isSpark ? "spark" : "circle",
          rotation: Math.random() * Math.PI * 2,
          vRot: (Math.random() - 0.5) * 0.3,
          scaleX: Math.random() * 2 + 1.5,
        });
      }

      particlesRef.current.push(...newParticles);

      if (!animIdRef.current) {
        animIdRef.current = requestAnimationFrame(loop);
      }
    },
    [loop],
  );

  const clear = useCallback(() => {
    particlesRef.current = [];
    if (animIdRef.current) {
      cancelAnimationFrame(animIdRef.current);
      animIdRef.current = null;
    }
    const canvas = canvasRef.current;
    if (canvas && typeof window !== "undefined") {
      const ctx = canvas.getContext("2d");
      if (ctx) {
        ctx.clearRect(0, 0, window.innerWidth, window.innerHeight);
      }
    }
  }, []);

  useImperativeHandle(ref, () => ({ burst, clear }), [burst, clear]);

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 pointer-events-none z-40 w-full h-full"
    />
  );
});

ParticleCanvas.displayName = "ParticleCanvas";
