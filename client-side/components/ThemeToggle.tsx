"use client";

import React from 'react';
import { useTheme } from '@/contexts/ThemeContext';
import { Ghost, Command, Activity } from 'lucide-react';
import { motion } from 'framer-motion';

export default function ThemeToggle() {
  const { theme, themeName, toggleTheme, isTransitioning } = useTheme();

  return (
    <motion.button
      onClick={toggleTheme}
      className="relative w-[52px] h-[52px] rounded-full border-2 flex items-center justify-center shadow-lg focus:outline-none"
      style={{
        backgroundColor: theme.surface,
        borderColor: theme.primary,
        boxShadow: `0 0 12px ${theme.primary}40`, // 40 is hex for ~25% alpha
      }}
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.95 }}
      animate={{
        rotate: isTransitioning ? 360 : 0,
      }}
      transition={{
        rotate: { duration: 0.3, ease: "easeInOut" }
      }}
    >
      <motion.div
        animate={{ opacity: isTransitioning ? 0 : 1 }}
        transition={{ duration: 0.15 }}
      >
        {themeName === 'hacker' ? (
          <Ghost color={theme.primary} size={22} />
        ) : (
          <Command color={theme.primary} size={22} />
        )}
      </motion.div>

      <div
        className="absolute bottom-[-2px] right-[-2px] w-[18px] h-[18px] rounded-full flex items-center justify-center p-[2px]"
        style={{ backgroundColor: theme.primary }}
      >
        <Activity color={theme.buttonText} size={10} fill={theme.buttonText} />
      </div>
    </motion.button>
  );
}
