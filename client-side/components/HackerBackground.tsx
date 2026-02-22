"use client";

import React, { useEffect, useRef } from 'react';
import { useTheme } from '@/contexts/ThemeContext';

export default function HackerBackground() {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const { theme, themeName } = useTheme();

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        let width = window.innerWidth;
        let height = window.innerHeight;
        canvas.width = width;
        canvas.height = height;

        const columns = Math.floor(width / 20);
        const drops: number[] = [];
        for (let i = 0; i < columns; i++) {
            drops[i] = 1;
        }

        const characters = "0123456789ABCDEFXGITHUB_HACK_NODE_SYSTEM_FAILURE_ENCRYPT_DECRYPT";
        const charArray = characters.split("");

        let animationFrameId: number;

        const draw = () => {
            // Semi-transparent black to create trail effect
            ctx.fillStyle = `${theme.background}10`; // Very transparent
            ctx.fillRect(0, 0, width, height);

            ctx.fillStyle = themeName === 'hacker' ? '#EF4444' : '#22C55E'; // Red or Green based on theme
            ctx.font = "14px monospace";

            for (let i = 0; i < drops.length; i++) {
                const text = charArray[Math.floor(Math.random() * charArray.length)];
                ctx.fillText(text, i * 20, drops[i] * 20);

                // Reset drop or move it down
                if (drops[i] * 20 > height && Math.random() > 0.975) {
                    drops[i] = 0;
                }
                drops[i]++;
            }
            animationFrameId = requestAnimationFrame(draw);
        };

        const handleResize = () => {
             width = window.innerWidth;
             height = window.innerHeight;
             canvas.width = width;
             canvas.height = height;
        };

        window.addEventListener('resize', handleResize);
        draw();

        return () => {
            window.removeEventListener('resize', handleResize);
            cancelAnimationFrame(animationFrameId);
        };
    }, [theme, themeName]);

    return (
        <canvas
            ref={canvasRef}
            className="fixed top-0 left-0 w-full h-full pointer-events-none z-0 opacity-20"
        />
    );
}
