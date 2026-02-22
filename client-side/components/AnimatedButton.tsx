"use client";

import React from 'react';
import { useTheme } from '@/contexts/ThemeContext';
import { motion } from 'framer-motion';
import { Loader2 } from 'lucide-react';
import clsx from 'clsx';

interface AnimatedButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  title: string;
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost';
  isLoading?: boolean;
  className?: string;
}

export default function AnimatedButton({
  title,
  variant = 'primary',
  isLoading = false,
  className,
  disabled,
  ...props
}: AnimatedButtonProps) {
  const { theme } = useTheme();

  const getBaseStyles = () => {
    switch (variant) {
      case 'primary':
        return {
          backgroundColor: theme.buttonBg,
          color: theme.buttonText,
          border: `1px solid ${theme.buttonBorder}`,
          boxShadow: `0 0 15px ${theme.primary}40`,
        };
      case 'secondary':
        return {
          backgroundColor: theme.surfaceLight,
          color: theme.text,
          border: `1px solid ${theme.surfaceLight}`,
        };
      case 'outline':
        return {
          backgroundColor: 'transparent',
          color: theme.text,
          border: `1px solid ${theme.primary}60`,
        };
      case 'ghost':
        return {
          backgroundColor: 'transparent',
          color: theme.textSecondary,
          border: 'none',
        };
    }
  };

  const styles = getBaseStyles();

  return (
    <motion.button
      whileHover={{ scale: 1.02, boxShadow: `0 0 20px ${theme.primary}60` }}
      whileTap={{ scale: 0.95 }}
      disabled={disabled || isLoading}
      className={clsx(
        "w-full py-4 px-6 rounded-2xl flex flex-row items-center justify-center font-bold text-xs uppercase tracking-[0.2em]",
        disabled && "opacity-50 cursor-not-allowed",
        className
      )}
      style={styles as any}
      {...props as any}
    >
      {isLoading ? (
        <Loader2 className="animate-spin mr-3" size={18} />
      ) : null}
      <span className="relative z-10">
        {title}
      </span>
    </motion.button>
  );
}
