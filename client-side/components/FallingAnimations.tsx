"use client";

import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { DollarSign, Coins } from 'lucide-react';

interface FallingAnimationsProps {
    trigger: boolean;
    color?: string;
}

interface Particle {
    id: number;
    x: number;
    delay: number;
    duration: number;
    size: number;
    rotate: number;
    type: 'dollar' | 'coin';
}

export default function FallingAnimations({ trigger, color = '#FFD700' }: FallingAnimationsProps) {
    const [particles, setParticles] = useState<Particle[]>([]);

    useEffect(() => {
        if (trigger) {
            const newParticles: Particle[] = Array.from({ length: 40 }).map((_, i) => {
                const isLeft = Math.random() > 0.5;
                const baseSideX = isLeft ? Math.random() * 25 : 75 + Math.random() * 25;
                return {
                    id: Date.now() + i,
                    x: baseSideX,
                    delay: Math.random() * 0.8,
                    duration: 2.5 + Math.random() * 2.5,
                    size: 14 + Math.random() * 16,
                    rotate: Math.random() * 720,
                    type: Math.random() > 0.4 ? 'dollar' : 'coin',
                };
            });
            setParticles(prev => [...prev, ...newParticles]);

            // Cleanup particles after animation
            const timer = setTimeout(() => {
                setParticles(prev => prev.filter(p => !newParticles.find(np => np.id === p.id)));
            }, 5000);

            return () => clearTimeout(timer);
        }
    }, [trigger]);

    return (
        <div className="absolute inset-0 pointer-events-none overflow-hidden z-0">
            <AnimatePresence>
                {particles.map((p) => (
                    <motion.div
                        key={p.id}
                        initial={{ y: -50, left: `${p.x}%`, opacity: 0, rotate: 0 }}
                        animate={{
                            y: '110vh',
                            x: p.x < 50 ? [0, 20] : [0, -20],
                            opacity: [0, 1, 1, 0],
                            rotate: p.rotate + 360,
                        }}
                        exit={{ opacity: 0 }}
                        transition={{
                            duration: p.duration,
                            delay: p.delay,
                            ease: "linear"
                        }}
                        className="absolute"
                        style={{ color }}
                    >
                        {p.type === 'dollar' ? (
                            <DollarSign size={p.size} />
                        ) : (
                            <Coins size={p.size} />
                        )}
                    </motion.div>
                ))}
            </AnimatePresence>
        </div>
    );
}
