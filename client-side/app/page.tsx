"use client";

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useTheme } from '@/contexts/ThemeContext';
import { useAuth } from '@/contexts/AuthContext';
import AnimatedBackground from '@/components/AnimatedBackground';
import NavHeader from '@/components/NavHeader';
import HeroSection from '@/components/HeroSection';
import AnimatedButton from '@/components/AnimatedButton';
import { motion, AnimatePresence } from 'framer-motion';

export default function LandingPage() {
    const { theme } = useTheme();
    const { isAuthenticated, isLoading } = useAuth();
    const router = useRouter();
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
        if (!isLoading && isAuthenticated) {
            router.replace('/chat');
        }
    }, [isAuthenticated, isLoading, router]);

    if (isLoading || !mounted) {
        return (
            <div
                className="flex flex-1 min-h-screen"
                style={{ backgroundColor: theme.background }}
            />
        );
    }

    return (
        <AnimatedBackground>
            <NavHeader showAuthButtons={true} />

            <main className="relative flex flex-col items-center w-full min-h-[100dvh] pt-14 pb-safe px-6 overflow-hidden">
                {/* Main Content / Hero - Centered vertically in available space */}
                <div className="flex-1 flex flex-col items-center justify-center w-full max-w-4xl">
                    <motion.div
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ duration: 0.8, ease: "easeOut" }}
                        className="w-full flex flex-col items-center justify-center"
                    >
                        <HeroSection />

                        {/* Enter Node Button - Moved here as requested */}
                        <div className="w-full max-w-sm mt-6 relative z-20">
                            <AnimatedButton
                                title="ENTER NODE"
                                variant="primary"
                                className="w-full py-3 text-sm font-black tracking-[0.2em] rounded-full"
                                style={{
                                    boxShadow: `0 0 30px ${theme.primary}66` // Dynamic shadow provided via style
                                }}
                                onClick={() => router.push('/login')}
                            />
                        </div>
                    </motion.div>
                </div>

                {/* Bottom Section: Footer pinned to bottom */}
                <motion.div
                    initial={{ opacity: 0, y: 50 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.5, duration: 0.8, ease: "easeOut" }}
                    className="w-full max-w-sm mt-auto mb-4 flex flex-col items-center gap-2 z-10 relative"
                >
                    {/* Footer Layout with 'N' Button */}
                    <div className="w-full flex items-center justify-between px-2 relative min-h-[40px]">
                        {/* N Button - Absolute Left */}
                        <div className="absolute left-0 bottom-1">
                            <div
                                className="w-10 h-10 rounded-full border border-white/20 flex items-center justify-center bg-black/40 backdrop-blur-md"
                            >
                                <span className="text-white font-mono text-xs">N</span>
                            </div>
                        </div>

                        {/* Centered Footer Text */}
                        <p className="w-full text-center font-mono text-[10px] uppercase tracking-[0.4em] text-white/30 whitespace-nowrap self-end pb-3">
                            SYMPOSIUM :: CHENNAI_NODE
                        </p>
                    </div>
                </motion.div>
            </main>
        </AnimatedBackground>
    );
}
