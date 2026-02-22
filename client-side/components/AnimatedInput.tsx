"use client";

import React, { useState } from 'react';
import { useTheme } from '@/contexts/ThemeContext';
import { motion } from 'framer-motion';

interface AnimatedInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  icon?: React.ReactNode;
}

export default function AnimatedInput({
  icon,
  className,
  onFocus,
  onBlur,
  ...props
}: AnimatedInputProps) {
  const { theme } = useTheme();
  const [isFocused, setIsFocused] = useState(false);

  return (
    <div className={`relative mb-4 ${className}`}>
      <div className="absolute left-4 top-1/2 -translate-y-1/2 z-10">
        {icon}
      </div>
      <motion.input
        {...props as any}
        className="w-full h-[52px] rounded-xl pl-12 pr-4 outline-none transition-all duration-300 border"
        style={{
          backgroundColor: theme.inputBg,
          color: theme.text,
          borderColor: isFocused ? theme.inputBorder : 'transparent'
        }}
        onFocus={(e) => {
          setIsFocused(true);
          onFocus?.(e);
        }}
        onBlur={(e) => {
          setIsFocused(false);
          onBlur?.(e);
        }}
        animate={{
          borderColor: isFocused ? theme.inputBorder : 'rgba(0,0,0,0)',
          boxShadow: isFocused ? `0 0 10px ${theme.inputBorder}40` : 'none',
        }}
      />
    </div>
  );
}
