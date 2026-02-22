"use client";

import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useTheme } from '@/contexts/ThemeContext';
import AnimatedBackground from '@/components/AnimatedBackground'; // Kept as wrapper but using HackerBackground inside
import ThreeBackground from '@/components/ThreeBackground';
import NavHeader from '@/components/NavHeader';
import { Send, Wallet, Play, Terminal, Activity, Database, CheckCheck, Coins, Skull } from 'lucide-react';
import FallingAnimations from '@/components/FallingAnimations'; // Optional, might clash with HackerBackground, let's keep it for specific triggers if needed, but HackerBackground is main.
import { motion } from 'framer-motion';
import clsx from 'clsx';
import { ThemeType } from '@/constants/themes';
import DecryptionText from '@/components/DecryptionText';

interface Message {
    id: string;
    text: string;
    isUser: boolean;
    timestamp: Date;
}

const RED_HACKER_RESPONSES = [
    "System override confirmed. What's our next target?",
    "Data encryption protocol initiated. Stay secure.",
    "Bypassing mainframe... I'm in. Ask away.",
    "Kernel access granted. Ready for high-level commands.",
    "Analyzing packet headers... No threats detected.",
    "Executing silent subroutine. Efficiency is key.",
    "Connection optimized. Let's start the hunt.",
];

const GREEN_HACKER_RESPONSES = [
    "Processing query... Access granted. 🖥️",
    "Analyzing data streams... Interesting pattern detected.",
    "Firewall bypassed. Information retrieved successfully.",
    "Running decryption algorithm... Message decoded.",
    "Scanning network nodes... Connection established.",
    "Executing subroutine... Task completed efficiently.",
    "Data packet received. Initiating response protocol.",
];

export default function ChatScreen() {
    const { theme, themeName } = useTheme();
    const router = useRouter();
    const [messages, setMessages] = useState<Message[]>([]);
    const [inputText, setInputText] = useState('');
    const [isTyping, setIsTyping] = useState(false);
    const [showAnimation, setShowAnimation] = useState(false);
    const [isInitialized, setIsInitialized] = useState(false);

    // Dynamic values state
    const [credits, setCredits] = useState(0); // This is now BANK BALANCE
    const [plundered, setPlundered] = useState(0);
    const [username, setUsername] = useState('Guest_Operative');
    const [uniqueId, setUniqueId] = useState<string | null>(null);

    const messagesEndRef = useRef<HTMLDivElement>(null);
    const scrollContainerRef = useRef<HTMLDivElement>(null);

    // Initialize user and fetch stats
    useEffect(() => {
        const storedUniqueId = sessionStorage.getItem('unique_id');
        const storedTeamName = sessionStorage.getItem('team_name');

        if (storedUniqueId && storedTeamName) {
            setUniqueId(storedUniqueId);
            setUsername(storedTeamName);
            fetchUserStats(storedUniqueId);
        } else {
            // Fallback for guest
            const storedUser = sessionStorage.getItem('chat_username');
            if (storedUser) {
                setUsername(storedUser);
            } else {
                const newUsername = `Operative_${Math.floor(Math.random() * 9000) + 1000}`;
                sessionStorage.setItem('chat_username', newUsername);
                setUsername(newUsername);
            }
            // Give guests some fake credits
            setCredits(1250500);
        }
    }, []);

    const fetchUserStats = async (id: string) => {
        try {
            const res = await fetch(`/api/user-stats?unique_id=${id}`);
            if (res.ok) {
                const data = await res.json();
                setCredits(Number(data.wallet_balance)); // This comes from bank_balance table now
                setPlundered(Number(data.total_plundered));
            }
        } catch (error) {
            console.error("Failed to fetch user stats", error);
        }
    };

    // Poll for stats update periodically if logged in
    useEffect(() => {
        if (!uniqueId) return;

        const interval = setInterval(() => {
            fetchUserStats(uniqueId);
        }, 5000);

        return () => clearInterval(interval);
    }, [uniqueId]);


    // Load messages from DB on mount — only this user's messages (filtered by unique_id)
    useEffect(() => {
        const id = sessionStorage.getItem('unique_id');
        if (!id) {
            setIsInitialized(true);
            return;
        }
        fetch(`/api/chat/history?unique_id=${encodeURIComponent(id)}`)
            .then(r => r.ok ? r.json() : [])
            .then((rows: { user_message: string; llm_message: string; created_at: string }[]) => {
                if (rows.length > 0) {
                    const hydrated: Message[] = rows.flatMap((row, i) => [
                        {
                            id: `db-u-${i}`,
                            text: row.user_message ?? '',
                            isUser: true,
                            timestamp: new Date(row.created_at),
                        },
                        {
                            id: `db-b-${i}`,
                            text: row.llm_message ?? '',
                            isUser: false,
                            timestamp: new Date(row.created_at),
                        },
                    ]);
                    setMessages(hydrated);
                }
                setIsInitialized(true);
            })
            .catch(() => setIsInitialized(true));
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // Add welcome message if session is empty and just initialized
    useEffect(() => {
        if (isInitialized && messages.length === 0) {
            const welcomeMessage: Message = {
                id: '1',
                text:
                    themeName === 'hacker'
                        ? `Welcome to the Red Node, ${username}. Terminal ready for override.`
                        : `Welcome to the Green Node, ${username}. Secure link established. Ready to process.`,
                isUser: false,
                timestamp: new Date(),
            };
            setMessages([welcomeMessage]);
        }
    }, [isInitialized, themeName, username]);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages, isTyping]);


    const sendMessage = async () => {
        if (!inputText.trim()) return;

        const currentText = inputText.trim();
        const userMessage: Message = {
            id: Date.now().toString(),
            text: currentText,
            isUser: true,
            timestamp: new Date(),
        };

        setMessages((prev) => [...prev, userMessage]);
        setInputText('');
        setIsTyping(true);
        setShowAnimation(true);
        setTimeout(() => setShowAnimation(false), 500);

        if (uniqueId) {
            try {
                const res = await fetch('/api/chat', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ unique_id: uniqueId, message: currentText }),
                });

                const data = await res.json().catch(() => ({}));

                if (res.ok) {
                    const botMessage: Message = {
                        id: (Date.now() + 1).toString(),
                        text: data.reply || 'No response from vault.',
                        isUser: false,
                        timestamp: new Date(),
                    };
                    setIsTyping(false);
                    setMessages((prev) => [...prev, botMessage]);
                    // Refresh per-user stats (plundered + bank balance)
                    fetchUserStats(uniqueId);
                } else {
                    console.error('[chat] API error:', res.status, data);
                    const errorMsg: Message = {
                        id: (Date.now() + 1).toString(),
                        text: data.message || data.reply || 'Communication error with vault system.',
                        isUser: false,
                        timestamp: new Date(),
                    };
                    setIsTyping(false);
                    setMessages((prev) => [...prev, errorMsg]);
                }
            } catch (err) {
                console.error('[chat] Failed to send message:', err);
                setIsTyping(false);
            }
        } else {
            // Guest mode simulation
            setTimeout(() => {
                const responses =
                    themeName === 'hacker' ? RED_HACKER_RESPONSES : GREEN_HACKER_RESPONSES;
                const randomResponse = responses[Math.floor(Math.random() * responses.length)];
                const botMessage: Message = {
                    id: (Date.now() + 1).toString(),
                    text: randomResponse,
                    isUser: false,
                    timestamp: new Date(),
                };
                setIsTyping(false);
                setMessages((prev) => [...prev, botMessage]);
            }, 1200);
        }
    };

    const handleLogout = () => {
        sessionStorage.removeItem('unique_id');
        sessionStorage.removeItem('team_name');
        sessionStorage.removeItem('auth_user');
        router.replace('/');
    };

    return (
        <div className="relative w-full h-full min-h-screen overflow-hidden bg-black">
            {/* Three.js 3D Background */}
            <ThreeBackground />

            {/* Optional falling animations overlay if desired, kept for compatibility/extra flair */}
            <FallingAnimations trigger={showAnimation} color={theme.primary} />

            {/* Fixed Header at Top with Higher Z-Index */}
            <div className="fixed top-0 left-0 right-0 z-50">
                <NavHeader showAuthButtons={true} />

                {/* Hero Stats Area - Part of Fixed Header */}
                <div
                    className="w-full backdrop-blur-md border-b relative transition-colors duration-300"
                    style={{
                        backgroundColor: `${theme.background}80`, // More transparent for background visibility
                        borderBottom: '1px solid transparent',
                        borderImage: `linear-gradient(to right, ${theme.primary}00, ${theme.primary}60, ${theme.primary}00) 1`,
                        boxShadow: `0 4px 20px -5px ${theme.primary}20`
                    }}
                >
                    <div className="px-4 pt-1 pb-2 max-w-full overflow-hidden">

                        <div className="flex flex-row justify-between items-center mb-2">
                            <div className="flex flex-row gap-4 items-center">
                                {/* Credits / Balance Section */}
                                <div
                                    className="flex flex-row items-center px-3 py-2 rounded-2xl border bg-opacity-40 backdrop-blur-md"
                                    style={{ backgroundColor: theme.surface, borderColor: theme.primary }}
                                >
                                    <div className="w-8 h-8 rounded-full flex justify-center items-center mr-2 border" style={{ borderColor: `${theme.primary}40`, background: `${theme.primary}10` }}>
                                        <Wallet color={theme.primary} size={16} />
                                    </div>
                                    <div>
                                        <span className="text-[9px] font-bold tracking-widest block opacity-80" style={{ color: theme.text }}>
                                            <DecryptionText
                                                text="BANK BALANCE"
                                                speed={20}
                                                animateOnHover
                                                useOriginalColors
                                            />
                                        </span>
                                        <span className="text-base font-black tracking-wider" style={{ color: theme.primary, textShadow: `0 0 10px ${theme.primary}40` }}>
                                            ${credits.toLocaleString()}
                                        </span>
                                    </div>
                                </div>

                                {/* Plundered Section - Redesigned */}
                                <div
                                    className="relative flex flex-row items-center px-4 py-2 rounded-xl border-2 overflow-hidden bg-opacity-90 transition-all hover:scale-105"
                                    style={{
                                        backgroundColor: themeName === 'hacker' ? '#1a0505' : '#051a05',
                                        borderColor: themeName === 'hacker' ? '#ef4444' : '#22c55e',
                                        boxShadow: `0 0 15px ${themeName === 'hacker' ? '#ef4444' : '#22c55e'}40`
                                    }}
                                >
                                    {/* Background scanline effect */}
                                    <div className="absolute inset-0 opacity-10 pointer-events-none"
                                        style={{
                                            backgroundImage: `linear-gradient(transparent 50%, ${theme.primary} 50%)`,
                                            backgroundSize: '100% 4px'
                                        }}
                                    />

                                    <div className="relative z-10 mr-3 animate-pulse">
                                        <Skull size={20} color={themeName === 'hacker' ? '#ef4444' : '#22c55e'} />
                                    </div>

                                    <div className="relative z-10 flex flex-col">
                                        <span className="text-[10px] font-black tracking-[0.2em] uppercase" style={{ color: themeName === 'hacker' ? '#fca5a5' : '#86efac' }}>
                                            PLUNDERED
                                        </span>
                                        <span className="text-lg font-black" style={{ color: themeName === 'hacker' ? '#ef4444' : '#22c55e', textShadow: `0 0 10px ${theme.primary}` }}>
                                            ${plundered.toLocaleString()}
                                        </span>
                                    </div>
                                </div>
                            </div>

                            {/* Logout Button Removed from here as requested, moved to NavHeader */}
                        </div>
                    </div>
                </div>
            </div>

            {/* Scrollable Message Container */}
            <div
                ref={scrollContainerRef}
                className="absolute left-0 right-0 overflow-y-auto overflow-x-hidden"
                style={{
                    top: 0,
                    bottom: 0,
                    height: '100dvh', // Use dynamic viewport height
                    paddingTop: '230px', // Increased Header height clearance
                    paddingBottom: '80px', // Input area height clearance + extra
                }}
            >
                {/* Message List Area with Max Width */}
                <div className="w-full max-w-full px-3 flex flex-col pb-safe">
                    {messages.map((msg) => (
                        <MessageBubble
                            key={msg.id}
                            message={msg}
                            isUser={msg.isUser}
                            theme={theme}
                        />
                    ))}
                    {isTyping && (
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            className="mb-4 px-4 py-2 rounded-xl self-start inline-block"
                            style={{ backgroundColor: theme.surface }}
                        >
                            <span className="text-xs italic" style={{ color: theme.textSecondary }}>
                                {themeName === 'hacker' ? '🔴 Hacker is typing...' : '🟢 Hacker is processing...'}
                            </span>
                        </motion.div>
                    )}
                    <div ref={messagesEndRef} className="h-4" />
                </div>
            </div>

            {/* Floating Input Area */}
            <div
                className="fixed bottom-6 left-0 right-0 px-4 z-40 transition-all duration-200 ease-out"
            >
                <div
                    className="flex flex-row items-end gap-2 max-w-3xl mx-auto p-2 rounded-[2rem] border backdrop-blur-xl shadow-2xl"
                    style={{
                        backgroundColor: `${theme.background}A0`, // Slightly transparent
                        borderColor: `${theme.primary}30`,
                        boxShadow: `0 8px 32px -8px ${theme.primary}30`
                    }}
                >
                    <div className="flex-1 relative pl-2">
                        <textarea
                            value={inputText}
                            onFocus={(e) => {
                                // Prevent all scroll behavior on mobile
                                e.preventDefault();
                                e.target.scrollIntoView = () => { }; // Disable scrollIntoView

                                // Store current scroll position
                                const scrollContainer = scrollContainerRef.current;
                                if (scrollContainer) {
                                    const currentScroll = scrollContainer.scrollTop;
                                    // Restore scroll position after a brief delay
                                    setTimeout(() => {
                                        if (scrollContainer) {
                                            scrollContainer.scrollTop = currentScroll;
                                        }
                                    }, 0);
                                }

                                // Prevent window scroll
                                const currentWindowScroll = window.scrollY;
                                setTimeout(() => {
                                    window.scrollTo(0, currentWindowScroll);
                                }, 0);
                            }}
                            onChange={(e) => {
                                setInputText(e.target.value);
                                // Auto-resize textarea
                                e.target.style.height = 'auto';
                                e.target.style.height = Math.min(e.target.scrollHeight, 120) + 'px';
                            }}
                            onKeyDown={(e) => {
                                if (e.key === 'Enter' && !e.shiftKey) {
                                    e.preventDefault();
                                    sendMessage();
                                    // Reset height after sending
                                    e.currentTarget.style.height = '48px';
                                }
                            }}
                            placeholder={themeName === 'hacker' ? 'Inject Code Block...' : 'Execute Command...'}
                            className="w-full px-4 py-3 rounded-xl outline-none text-[16px] resize-none overflow-y-auto leading-[1.5] transition-all font-mono placeholder:opacity-50"
                            style={{
                                backgroundColor: 'transparent',
                                color: theme.text,
                                minHeight: '48px',
                                maxHeight: '120px',
                                height: '48px',
                            }}
                            rows={1}
                        />
                    </div>
                    <button
                        onClick={() => {
                            sendMessage();
                            // Reset textarea height
                            const textarea = document.querySelector('textarea');
                            if (textarea) textarea.style.height = '48px';
                        }}
                        disabled={!inputText.trim()}
                        className="w-[48px] h-[48px] rounded-full flex justify-center items-center transition-all hover:scale-105 active:scale-95 disabled:opacity-30 disabled:cursor-not-allowed flex-shrink-0"
                        style={{
                            backgroundColor: inputText.trim() ? theme.primary : theme.surface,
                            boxShadow: inputText.trim() ? `0 0 20px ${theme.primary}60` : 'none',
                            color: inputText.trim() ? theme.background : theme.textSecondary
                        }}
                    >
                        <Send size={20} className={inputText.trim() ? "translate-x-0.5 translate-y-0.5" : ""} />
                    </button>
                </div>
            </div>
        </div>
    );
}

function MessageBubble({
    message,
    isUser,
    theme,
}: {
    message: Message;
    isUser: boolean;
    theme: ThemeType;
}) {
    return (
        <motion.div
            initial={{ opacity: 0, y: 10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ duration: 0.2 }}
            className={clsx(
                "max-w-[80%] w-fit px-4 py-2.5 rounded-2xl my-1.5 relative backdrop-blur-sm border",
                isUser ? "self-end rounded-br-sm ml-auto" : "self-start rounded-bl-sm mr-auto"
            )}
            style={{
                backgroundColor: isUser
                    ? `${theme.primary}15`
                    : `${theme.surface}90`,
                borderColor: isUser
                    ? `${theme.primary}50`
                    : `${theme.surfaceLight}50`,
                boxShadow: isUser
                    ? `0 2px 10px ${theme.primary}10`
                    : `0 2px 5px #00000020`,
                borderBottom: `2px solid ${isUser ? theme.primary : theme.surfaceLight}40`
            }}
        >
            <div className="flex flex-col min-w-[60px]">
                <p
                    className="text-[15px] leading-[1.5] font-medium pr-8 font-sans tracking-wide"
                    style={{
                        color: theme.text,
                        wordBreak: 'break-word',
                        overflowWrap: 'break-word',
                        textShadow: isUser ? `0 0 10px ${theme.primary}20` : 'none'
                    }}
                >
                    {message.text}
                </p>

                <div className="flex flex-row items-center justify-end gap-1.5 mt-1 self-end opacity-70">
                    <span
                        className="text-[10px] font-mono"
                        style={{ color: theme.textSecondary }}
                    >
                        {message.timestamp.toLocaleTimeString([], {
                            hour: '2-digit',
                            minute: '2-digit',
                            hour12: true
                        }).toLowerCase()}
                    </span>
                    {isUser && (
                        <CheckCheck size={12} style={{ color: theme.primary }} />
                    )}
                </div>
            </div>
        </motion.div>
    );
}