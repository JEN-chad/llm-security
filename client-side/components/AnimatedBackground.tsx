"use client";

import React from 'react';
import { useTheme } from '@/contexts/ThemeContext';
import { motion } from 'framer-motion';
import ThreeBackground from './ThreeBackground';

export default function AnimatedBackground({ children }: { children: React.ReactNode }) {
  const { theme, themeName } = useTheme();

  return (
    <div className="relative min-h-screen overflow-hidden" style={{ backgroundColor: theme.background }}>
      {/* Three.js 3D Background */}
      <ThreeBackground />

      {/* Gradient overlay for depth */}
      <div
        className="absolute inset-0 pointer-events-none z-[1]"
        style={{
          background: `radial-gradient(circle at 50% 50%, ${themeName === 'hacker' ? 'rgba(230, 36, 41, 0.06)' : 'rgba(0, 255, 65, 0.04)'} 0%, transparent 70%), 
                     linear-gradient(to bottom right, ${theme.background}CC, transparent, ${theme.background}CC)`
        }}
      />

      {/* CRT Scan Line — green theme only */}
      {themeName === 'terminal' && (
        <motion.div
          className="absolute left-0 right-0 h-[2px] opacity-20 pointer-events-none z-[2]"
          style={{
            background: `linear-gradient(to bottom, transparent, ${theme.primary}, transparent)`,
            boxShadow: `0 0 12px ${theme.primary}`
          }}
          initial={{ top: "-5%" }}
          animate={{ top: "105%" }}
          transition={{
            duration: 5,
            repeat: Infinity,
            ease: "linear"
          }}
        />
      )}

      {/* Content Wrapper */}
      <motion.div
        className="relative z-10 w-full min-h-screen flex flex-col"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.8 }}
      >
        {children}
      </motion.div>
    </div>
  );
}

