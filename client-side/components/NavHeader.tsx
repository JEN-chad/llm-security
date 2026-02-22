"use client";

import React from 'react';
import { useRouter } from 'next/navigation';
import { useTheme } from '@/contexts/ThemeContext';
import { useAuth } from '@/contexts/AuthContext';
import ThemeToggle from './ThemeToggle';
import { Cpu, Terminal, Scan, Wifi, HardDrive, Globe, Sword, Bomb, Target, Ghost, Command, Power } from 'lucide-react';

interface NavHeaderProps {
  showAuthButtons?: boolean;
}

export default function NavHeader({
  showAuthButtons = true,
}: NavHeaderProps) {
  const { theme, themeName } = useTheme();
  const { isAuthenticated, logout } = useAuth();
  const router = useRouter();

  return (
    <div
      className="sticky top-0 z-50 flex flex-row justify-between items-center w-full px-4 md:px-12 py-2 md:py-3 border-b backdrop-blur-xl"
      style={{
        borderBottomColor: `${theme.primary}20`,
        backgroundColor: `${theme.background}90`
      }}
    >
      {/* Start: Logo & Brand */}
      <div className="flex-shrink-0 flex justify-start min-w-[100px] md:flex-1">
        <div className="flex flex-row items-center gap-2 md:gap-5">
          <div
            className="w-10 h-10 md:w-12 md:h-12 rounded-xl border flex justify-center items-center"
            style={{ backgroundColor: theme.surface, borderColor: `${theme.primary}40` }}
          >
            {themeName === 'hacker' ? (
              <Ghost color={theme.primary} size={22} />
            ) : (
              <Command color={theme.primary} size={22} />
            )}
          </div>
          <div className="flex flex-col">
            <h1 className="text-xs md:text-xl font-black tracking-[0.15em] whitespace-nowrap" style={{ color: theme.text }}>
              {themeName === 'hacker' ? 'Error 404' : 'Hacker'}
            </h1>
            <span className="text-[10px] md:text-[11px] font-bold tracking-[0.1em] flex items-center gap-2 -mt-1 opacity-60" style={{ color: theme.primary }}>
              {themeName === 'hacker' ? 'TERMINAL' : 'WORKSTATION'}
              <div className="flex items-center gap-2 ml-2 border-l pl-2" style={{ borderColor: `${theme.primary}40` }}>
                {themeName === 'terminal' ? (
                  <>
                    <Scan size={10} className="animate-pulse" />
                    <Wifi size={10} />
                    <HardDrive size={10} />
                    <Globe size={10} />
                  </>
                ) : (
                  <div className="flex items-center gap-5 ml-2 border-l pl-2" style={{ borderColor: `${theme.primary}40` }}>
                    <Sword size={10} />
                    <Bomb size={10} />
                    <Target size={10} />
                  </div>
                )}
              </div>
            </span>
          </div>
        </div>
      </div>

      {/* Mid: Spacer */}
      <div className="flex-1" />

      {/* End: Actions (Logout & Theme) */}
      <div className="flex-shrink-0 flex justify-end items-center gap-3 md:gap-4 md:flex-1">
        {isAuthenticated && (
          <button
            onClick={() => { logout(); router.push('/'); }}
            className="flex flex-row items-center gap-1.5 px-3 py-2 md:px-4 md:py-2 rounded-lg border hover:bg-opacity-80 transition-all text-[11px] md:text-[13px] font-semibold group"
            style={{
              backgroundColor: theme.surface,
              borderColor: theme.surfaceLight,
              color: theme.textSecondary
            }}
          >
            <Power className="group-hover:text-red-500 transition-colors" color={theme.primary} size={16} />
            <span className="hidden md:inline group-hover:text-red-500 transition-colors">Logout</span>
          </button>
        )}
        <ThemeToggle />
      </div>
    </div>
  );
}
