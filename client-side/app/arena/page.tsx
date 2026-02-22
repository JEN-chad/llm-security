"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useTheme } from "@/contexts/ThemeContext";
import AnimatedBackground from "@/components/AnimatedBackground";
import NavHeader from "@/components/NavHeader";
import { motion, AnimatePresence } from "framer-motion";
import DecryptionText from "@/components/DecryptionText";

export default function ArenaPage() {
    const { theme } = useTheme();
    const router = useRouter();

    const [mounted, setMounted] = useState(false);
    const [teamName, setTeamName] = useState("");
    const [balance, setBalance] = useState(0);

    // Auto-logout polling
    useEffect(() => {
        const interval = setInterval(async () => {
            try {
                const res = await fetch('/api/status');
                const data = await res.json();
                if (data.allow_signin === false) {
                    console.log("Access revoked");
                    sessionStorage.clear();
                    router.replace('/login');
                }
            } catch (e) {
                console.error("Status check failed", e);
            }
        }, 3000);
        return () => clearInterval(interval);
    }, [router]);

    const [text1, setText1] = useState("");
    const [text2, setText2] = useState("");
    const [terminalLines, setTerminalLines] = useState<string[]>([]);
    const [showButton, setShowButton] = useState(false);

    const fullText1 = "INTELLICONZ";
    const fullText2 = "PROMPT WARS";

    const logLines = [
        "Connecting to secure game server...",
        "Establishing encrypted link...",
        "Team Wallet Loaded...",
        "Game Mode: ACTIVE",
        "Aura Level: MAXIMUM",
        "Ready for commands."
    ];

    useEffect(() => {
        const uniqueId = sessionStorage.getItem("unique_id");
        const storedTeam = sessionStorage.getItem("team_name");

        if (!uniqueId) {
            router.replace("/login");
            return;
        }

        setTeamName(storedTeam || "OPERATIVE");
        
        // Fetch Balance
        fetch(`/api/balance?unique_id=${uniqueId}`)
            .then(res => res.json())
            .then(data => {
                if (data.wallet_balance !== undefined) {
                    setBalance(data.wallet_balance);
                }
            })
            .catch(err => console.error("Failed to load balance", err));

        setMounted(true);

        // Reset states (important when navigating back)
        setText1("");
        setText2("");
        setTerminalLines([]);
        setShowButton(false);

        let timeout: NodeJS.Timeout;

        const typeText1 = (index = 0) => {
            if (index < fullText1.length) {
                setText1(fullText1.slice(0, index + 1));
                timeout = setTimeout(() => typeText1(index + 1), 60);
            } else {
                typeText2();
            }
        };

        const typeText2 = (index = 0) => {
            if (index < fullText2.length) {
                setText2(fullText2.slice(0, index + 1));
                timeout = setTimeout(() => typeText2(index + 1), 60);
            } else {
                showLogs();
            }
        };

        const showLogs = (index = 0) => {
            if (index < logLines.length) {
                setTerminalLines(prev => [...prev, logLines[index]]);
                timeout = setTimeout(() => showLogs(index + 1), 150);
            } else {
                setTimeout(() => setShowButton(true), 500);
            }
        };

        typeText1();

        return () => clearTimeout(timeout);
    }, [router]);

    if (!mounted) {
        return (
            <div
                className="flex min-h-screen"
                style={{ backgroundColor: theme.background }}
            />
        );
    }

    return (
        <AnimatedBackground>
            <NavHeader showAuthButtons={false} />

            <div className="flex-1 flex flex-col items-center justify-center w-full px-6 py-12 md:py-20">
                <motion.div
                    key={theme.name}
                    initial={{ opacity: 0, scale: 0.98 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ duration: 0.6 }}
                    className="w-full max-w-3xl px-8 py-10 md:px-12 md:py-14 rounded-[2rem] border bg-[#010409]/85 backdrop-blur-2xl overflow-hidden relative"
                    style={{
                        borderColor: `${theme.primary}20`,
                        boxShadow: `0 0 40px -10px ${theme.primary}20, inset 0 0 20px -10px ${theme.primary}10`
                    }}
                >
                    {/* Header Section */}
                    <div className="w-full mb-10 text-center md:text-left relative z-10">
                        <h1
                            className="text-3xl italic font-black leading-tight tracking-tighter text-white sm:text-5xl md:text-6xl lg:text-7xl mb-2"
                            style={{
                                textShadow: `0 0 20px ${theme.primary}40`
                            }}
                        >
                            <DecryptionText
                                text="INTELLICONZ"
                                speed={30}
                                animateOnHover
                                useOriginalColors
                            />
                        </h1>

                        <h2
                            className="flex items-center justify-center mt-2 text-lg italic font-bold tracking-wide md:justify-start sm:text-xl md:text-3xl"
                            style={{ color: `${theme.primary}` }}
                        >

                            <DecryptionText
                                text="PROMPT WARS"
                                speed={40}
                                animateOnHover
                                useOriginalColors
                            />
                            <span
                                className="inline-block w-2 h-6 ml-3 bg-white md:h-8 animate-pulse"
                                style={{ boxShadow: '0 0 10px white' }}
                            />
                        </h2>
                    </div>

                    {/* Terminal Section */}
                    <div
                        className="font-mono text-[11px] sm:text-xs md:text-sm space-y-3 min-h-[180px] border-l-2 pl-5 md:pl-6 relative z-10"
                        style={{
                            borderColor: `${theme.primary}40`,
                            background: `linear-gradient(to right, ${theme.primary}05, transparent)`
                        }}
                    >
                        {terminalLines.map((line, i) => (
                            <motion.p
                                key={i}
                                initial={{ opacity: 0, x: -10 }}
                                animate={{ opacity: 1, x: 0 }}
                                style={{ color: theme.textSecondary }}
                                className="flex items-start tracking-tight"
                            >
                                <span className="mr-3 font-bold opacity-50" style={{ color: theme.primary }}>
                                    {`>`}
                                </span>
                                <span className="uppercase break-words font-medium" style={{
                                    color: (line && (line.includes('MAXIMUM') || line.includes('ACTIVE'))) ? theme.primary : theme.text
                                }}>
                                    {line || ''}
                                </span>
                            </motion.p>
                        ))}
                    </div>

                    {/* CTA Button */}
                    <div className="flex justify-center mt-12 h-16 md:mt-16 relative z-10">
                        <AnimatePresence>
                            {showButton && (
                                <motion.button
                                    initial={{ opacity: 0, scale: 0.9, y: 10 }}
                                    animate={{ opacity: 1, scale: 1, y: 0 }}
                                    whileHover={{ scale: 1.05 }}
                                    whileTap={{ scale: 0.95 }}
                                    onClick={() => router.push('/chat')}
                                    style={{
                                        backgroundColor: theme.primary,
                                        color: theme.background,
                                        boxShadow: `0 0 20px ${theme.primary}40`
                                    }}
                                    className="w-full md:w-auto px-16 py-4 rounded-xl font-black uppercase tracking-[0.25em] text-sm transition-all hover:shadow-[0_0_40px_rgba(0,0,0,0.3)]"
                                >
                                    ENTER SYSTEM
                                </motion.button>
                            )}
                        </AnimatePresence>
                    </div>

                    {/* Background decoration */}
                    <div
                        className="absolute top-0 right-0 w-[300px] h-[300px] rounded-full opacity-10 blur-[80px] pointer-events-none"
                        style={{ backgroundColor: theme.primary }}
                    />
                    <div
                        className="absolute bottom-0 left-0 w-[200px] h-[200px] rounded-full opacity-5 blur-[60px] pointer-events-none"
                        style={{ backgroundColor: theme.text }}
                    />
                </motion.div>

                <p className="mt-10 font-mono text-[9px] uppercase tracking-[0.5em] text-white/20 text-center">
                    SYMPOSIUM :: CHENNAI_NODE
                </p>
            </div>
        </AnimatedBackground>
    );
}
