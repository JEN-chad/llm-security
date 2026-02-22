"use client";

import React, { useEffect, useRef } from 'react';
import { useTheme } from '@/contexts/ThemeContext';
import * as THREE from 'three';

export default function ThreeBackground() {
  const containerRef = useRef<HTMLDivElement>(null);
  const { theme, themeName } = useTheme();
  const frameRef = useRef<number>(0);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const W = window.innerWidth;
    const H = window.innerHeight;

    // ── Renderer ──────────────────────────────────────────
    const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
    renderer.setSize(W, H);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
    renderer.setClearColor(0x000000, 0);
    container.appendChild(renderer.domElement);

    // ── Scene & Camera ────────────────────────────────────
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(55, W / H, 0.1, 500);
    camera.position.set(0, 0, 60);

    // ── 300 soft floating dots ────────────────────────────
    const COUNT = 300;
    const positions = new Float32Array(COUNT * 3);
    const phases = new Float32Array(COUNT); // per-dot time offset

    for (let i = 0; i < COUNT; i++) {
      positions[i * 3]     = (Math.random() - 0.5) * 120;
      positions[i * 3 + 1] = (Math.random() - 0.5) * 80;
      positions[i * 3 + 2] = (Math.random() - 0.5) * 40;
      phases[i] = Math.random() * Math.PI * 2;
    }

    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));

    const color = new THREE.Color(theme.primary);
    const mat = new THREE.PointsMaterial({
      color,
      size: 0.55,
      transparent: true,
      opacity: themeName === 'hacker' ? 0.45 : 0.5,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });

    const points = new THREE.Points(geo, mat);
    scene.add(points);

    // ── Animate ───────────────────────────────────────────
    const posAttr = geo.getAttribute('position') as THREE.BufferAttribute;
    let t = 0;

    const animate = () => {
      t += 0.004; // very slow tick

      for (let i = 0; i < COUNT; i++) {
        // gentle vertical drift + sine bobbing
        const base = i * 3;
        (posAttr.array as Float32Array)[base + 1] +=
          Math.sin(t + phases[i]) * 0.012;
      }
      posAttr.needsUpdate = true;

      // extremely slow whole-cloud rotation
      points.rotation.y = t * 0.06;

      renderer.render(scene, camera);
      frameRef.current = requestAnimationFrame(animate);
    };

    animate();

    // ── Resize ────────────────────────────────────────────
    const onResize = () => {
      const w = window.innerWidth;
      const h = window.innerHeight;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };
    window.addEventListener('resize', onResize);

    return () => {
      cancelAnimationFrame(frameRef.current);
      window.removeEventListener('resize', onResize);
      renderer.dispose();
      geo.dispose();
      mat.dispose();
      if (container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement);
      }
    };
  }, [theme, themeName]);

  return (
    <div
      ref={containerRef}
      className="fixed inset-0 pointer-events-none z-0"
    />
  );
}
