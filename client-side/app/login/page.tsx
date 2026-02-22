"use client";

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useTheme } from '@/contexts/ThemeContext';
import AnimatedBackground from '@/components/AnimatedBackground';
import AnimatedInput from '@/components/AnimatedInput';
import AnimatedButton from '@/components/AnimatedButton';
import ThemeToggle from '@/components/ThemeToggle';
import { ChevronLeft, Binary, Fingerprint, Activity, Ghost, Command, Wifi } from 'lucide-react';
import { motion } from 'framer-motion';
import { Users } from 'lucide-react';
import { User } from 'lucide-react';
import { KeyRound } from 'lucide-react';
import DecryptionText from '@/components/DecryptionText';

export default function LoginScreen() {
    const { theme, themeName } = useTheme();
    const router = useRouter();

    const [teamName, setTeamName] = useState('');
    const [member1, setMember1] = useState('');
    const [member2, setMember2] = useState('');
    const [code, setCode] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');

    const handleLogin = async () => {
        if (!teamName || !member1 || !member2 || !code) {
            setError("Please fill all fields");
            return;
        }

        setIsLoading(true);
        setError('');

        try {
            const res = await fetch('/api/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    team_name: teamName,
                    member1,
                    member2,
                    unique_id: code
                }),
            });

            const data = await res.json();

            if (!res.ok) {
                setError(data.message || "Login failed");
                setIsLoading(false);
                return;
            }

            // Store session info
            sessionStorage.setItem("unique_id", code);
            sessionStorage.setItem("team_name", teamName);
            sessionStorage.setItem("wallet_balance", data.wallet_balance);

            router.replace('/arena');

        } catch (err) {
            setError("Something went wrong");
        } finally {
            setIsLoading(false);
        }
    };

    return (
         <AnimatedBackground>
            <div className="flex-1 flex flex-col w-full">
                {/* Header */}
                <div className="flex flex-row justify-between items-center px-5 py-4 w-full">
                    <button onClick={() => router.back()} className="p-2 hover:opacity-70">
                        <ChevronLeft color={theme.text} size={24} />
                    </button>
                    <div className="flex items-center gap-3">
                        <Activity color={theme.primary} size={20} className="opacity-60" />
                        {themeName === 'hacker' ? (
                            <Ghost color={theme.primary} size={22} className="opacity-60" />
                        ) : (
                            <Command color={theme.primary} size={22} className="opacity-60" />
                        )}
                        <Wifi color={theme.primary} size={20} className="opacity-60" />
                        <ThemeToggle />
                    </div>
                </div>

                <div className="flex-1 flex flex-col justify-start items-center px-6 w-full pt-10">
                    <div className="w-full max-w-md">
                        <motion.div
                            className="mb-10 text-center md:text-left"
                            initial={{ scale: 0.8, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            transition={{ duration: 0.6 }}
                        >


                            <p
                                className="text-xl md:text-3xl font-black tracking-[0.4em] uppercase mb-4"
                                style={{
                                    color: theme.primary,
                                    textShadow: `0 0 15px ${theme.primary}40`
                                }}
                            >
                                <DecryptionText
                                    text={themeName === 'hacker' ? 'SYSTEM OVERRIDE' : 'ACCESS GRANTED'}
                                    speed={40}
                                    animateOnHover
                                    useOriginalColors
                                />
                            </p>
                            <h1 className="text-3xl font-extrabold mb-2" style={{ color: theme.text }}>
                                {themeName === 'hacker' ? 'Welcome Operative' : 'Access Terminal'}
                            </h1>
                            <p className="text-base font-semibold tracking-wide" style={{ color: theme.primary }}>
                                {themeName === 'hacker'
                                    ? 'Initializing node...'
                                    : 'Authenticate Team Credentials...'}
                            </p>
                        </motion.div>

                        <motion.div
                            className="flex flex-col gap-4"
                            initial={{ y: 30, opacity: 0 }}
                            animate={{ y: 0, opacity: 1 }}
                            transition={{ delay: 0.2, duration: 0.5 }}
                        >
                            <AnimatedInput
                                placeholder="Team Name"
                                value={teamName}
                                onChange={(e) => setTeamName(e.target.value)}
                                icon={<Users color={theme.textSecondary} size={20} />}
                            />

                            <AnimatedInput
                                placeholder="Team Member 1"
                                value={member1}
                                onChange={(e) => setMember1(e.target.value)}
                                icon={<User color={theme.textSecondary} size={20} />}
                            />

                            <AnimatedInput
                                placeholder="Team Member 2"
                                value={member2}
                                onChange={(e) => setMember2(e.target.value)}
                                icon={<User color={theme.textSecondary} size={20} />}
                            />

                            <AnimatedInput
                                placeholder="Enter the code"
                                value={code}
                                onChange={(e) => setCode(e.target.value)}
                                type="text"
                                icon={<KeyRound color={theme.textSecondary} size={20} />}
                            />

                            {error && (
                                <motion.div
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    className="text-sm text-center font-medium"
                                    style={{ color: theme.primary }}
                                >
                                    {error}
                                </motion.div>
                            )}

                            <AnimatedButton
                                title={themeName === 'hacker' ? 'Proceed' : 'Login'}
                                onClick={handleLogin}
                                isLoading={isLoading}
                                className="mt-2"
                            />
                        </motion.div>
                    </div>
                </div>
            </div>
        </AnimatedBackground>
    );
}
