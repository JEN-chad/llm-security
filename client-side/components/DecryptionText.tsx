"use client";

import React, { useEffect, useState, useRef } from 'react';
import { useTheme } from '@/contexts/ThemeContext';

interface DecryptionTextProps {
    text: string;
    speed?: number;
    className?: string;
    animateOnHover?: boolean;
    revealDirection?: 'start' | 'end' | 'random';
    maxIterations?: number;
    useOriginalColors?: boolean;
}

const CHARACTERS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*()_+-=[]{}|;:,.<>?';

export default function DecryptionText({
    text,
    speed = 30,
    className = "",
    animateOnHover = false,
    revealDirection = 'random',
    maxIterations = 10, // Default scramble factor
    useOriginalColors = false
}: DecryptionTextProps) {
    const [displayText, setDisplayText] = useState(text);
    const { theme } = useTheme();
    const intervalRef = useRef<NodeJS.Timeout | null>(null);
    const isHovering = useRef(false);

    const animate = () => {
        let iteration = 0;

        if (intervalRef.current) clearInterval(intervalRef.current);

        intervalRef.current = setInterval(() => {
            setDisplayText(prev =>
                text.split("").map((char, index) => {
                    if (index < iteration) {
                        return text[index];
                    }
                    return CHARACTERS[Math.floor(Math.random() * CHARACTERS.length)];
                }).join("")
            );

            if (iteration >= text.length) {
                if (intervalRef.current) clearInterval(intervalRef.current);
            }

            // Controls the reveal speed relative to scramble speed
            // Lower number = closer to 0 = longer scramble time per character
            iteration += 1 / (maxIterations / 2);
        }, speed);
    };

    useEffect(() => {
        animate();
        return () => {
            if (intervalRef.current) clearInterval(intervalRef.current);
        };
    }, [text]);

    const handleMouseEnter = () => {
        if (animateOnHover) {
            animate();
        }
    };

    return (
        <span
            className={`font-mono ${className}`}
            onMouseEnter={handleMouseEnter}
            style={{ color: useOriginalColors ? undefined : theme.primary }}
        >
            {displayText}
        </span>
    );
}