"use client";

import React, { useEffect, useState } from 'react';
import { useTheme } from '@/contexts/ThemeContext';
import { motion, useAnimation } from 'framer-motion';
import DecryptionText from './DecryptionText';

export default function HeroSection() {
  const { theme, themeName } = useTheme();
  const glitchControls = useAnimation();

  // Trigger glitch effect on theme change
  useEffect(() => {
    const triggerGlitch = async () => {
      await glitchControls.start({
        x: [0, -5, 5, -5, 5, 0],
        transition: { duration: 0.2, ease: "linear" }
      });
    };
    triggerGlitch();
  }, [themeName, glitchControls]);

  return (
     <div className="flex flex-col items-center mb-4">
      {/* Hero Image Container */}
      <motion.div
        animate={glitchControls}
        className="mb-8 mt-2 relative"
      >
        {/* Scale & Rotate animation on mount, plus continuous Float/Rocking */}
        <motion.div
          initial={{ scale: 0.8, opacity: 0, rotate: -5 }}
          animate={{
            scale: 1,
            opacity: 1,
            rotate: [0, 2, 0, -2, 0], // Rocking/Subtle Rotation
            y: [0, -15, 0], // Float
          }}
          transition={{
            scale: { duration: 0.6, type: "spring", stiffness: 100 },
            opacity: { duration: 0.4 },
            rotate: { duration: 5, repeat: Infinity, ease: "easeInOut" },
            y: { duration: 4, repeat: Infinity, ease: "easeInOut" }
          }}
          className="relative"
        >
          {/* Outer Glow Orb (Pulsing) */}
          <motion.div
            className="w-80 h-80 rounded-full absolute -top-12 -left-12 blur-3xl z-0"
            style={{ backgroundColor: theme.primary }}
            animate={{
              opacity: [0.1, 0.25, 0.1],
              scale: [0.9, 1.1, 0.9],
            }}
            transition={{
              duration: 4,
              repeat: Infinity,
              ease: "easeInOut"
            }}
          />

          <img
            src={theme.heroImage}
            alt="Hero"
            className="w-56 h-56 md:w-72 md:h-72 rounded-[40px] object-cover border-2 relative z-10 shadow-2xl"
            style={{
              borderColor: `${theme.primary}50`,
              boxShadow: `0 0 50px ${theme.primary}30`
            }}
          />
        </motion.div>
      </motion.div>

      {/* Text Content */}
      <motion.div
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.3, duration: 0.6 }}
        className="text-center px-4"
      >
        <div className="relative inline-block mb-2">
          <motion.h1
            className="text-6xl sm:text-7xl md:text-9xl font-black tracking-tighter leading-none relative z-10 whitespace-nowrap"
            style={{
              color: '#FFFFFF',
              textShadow: `0 0 30px ${theme.primary}50`,
            }}
            animate={{
              scale: [1, 1.02, 1],
            }}
            transition={{
              duration: 4,
              repeat: Infinity,
              ease: "easeInOut"
            }}
          >
            <DecryptionText
              text={themeName === 'hacker' ? 'ERROR 404' : 'HACKER'}
              speed={40}
              maxIterations={20}
              className="relative z-10"
              useOriginalColors
            />
          </motion.h1>
        </div>

        {/* Separator Bar */}
        <div
          className="h-1.5 w-16 mx-auto mb-4 rounded-full"
          style={{
            backgroundColor: theme.primary,
            boxShadow: `0 0 15px ${theme.primary}CC` // Dynamic glow
          }}
        />

        <p
          className="text-lg md:text-2xl font-bold tracking-[0.4em] uppercase mb-4"
          style={{
            color: theme.primary,
            textShadow: `0 0 20px ${theme.primary}60`
          }}
        >
          <DecryptionText
            text={themeName === 'hacker' ? 'SYSTEM BREACH' : 'MATRIX ONLINE'}
            speed={30}
            useOriginalColors
          />
        </p>

        <p
          className="text-sm md:text-base font-medium opacity-80 max-w-[280px] md:max-w-lg mx-auto leading-relaxed"
          style={{ color: '#E0E0E0' }}
        >
          {themeName === 'hacker'
            ? 'Page not found... or is it? The system has been breached.'
            : 'Welcome to the matrix. Hack the system, control the grid.'}
        </p>
      </motion.div>
    </div>
  );
}
