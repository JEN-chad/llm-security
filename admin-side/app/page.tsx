'use client';

import { useState, useEffect, useRef } from 'react';
import VaultScene from '@/components/Vault3D';
import { Cpu, Activity, Terminal } from 'lucide-react';

interface HeistEntry {
  id: number;
  unique_id: string;
  team_name: string | null;
  money_taken: string;
  bank_balance_after: string;
  created_at: string;
}

export default function AdminDashboard() {
  const [isAttacked, setIsAttacked] = useState(false);
  const [amountTaken, setAmountTaken] = useState(0);
  const [refreshKey, setRefreshKey] = useState(0);
  const [allowSignin, setAllowSignin] = useState(false);
  const [totalWealth, setTotalWealth] = useState(0);
  const [securityLevel, setSecurityLevel] = useState(1);
  const [heistLog, setHeistLog] = useState<HeistEntry[]>([]);
  const [showThreatOverlay, setShowThreatOverlay] = useState(false);
  const [overlayLevel, setOverlayLevel] = useState(1);
  const initialized = useRef(false);
  const lastAttackIdRef = useRef<number | null>(null);
  const prevSecurityLevel = useRef<number>(1);
  const threatTimeout = useRef<NodeJS.Timeout | null>(null);

  // Watchdog: auto-reset attack state after 5 seconds
  useEffect(() => {
    if (!isAttacked) return;
    const timer = setTimeout(() => {
      setIsAttacked(false);
      setRefreshKey(k => k + 1);
    }, 5000);
    return () => clearTimeout(timer);
  }, [isAttacked, amountTaken]);

  const toggleSignin = async () => {
    try {
      const res = await fetch('/api/admin/control', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ allow_signin: !allowSignin }),
      });
      const data = await res.json();
      setAllowSignin(data.allow_signin);
    } catch (err) {
      console.error("Failed to toggle signin", err);
    }
  };

  // Poll for attacks and stats
  useEffect(() => {
    const fetchLatest = async () => {
      try {
        // 1. Check for new heists
        const resAttack = await fetch('/api/check-attack');
        const dataAttack = await resAttack.json();
        
        if (dataAttack.attack) {
          const attackId = dataAttack.attack.id;
          
          if (!initialized.current) {
            lastAttackIdRef.current = attackId;
            initialized.current = true;
          } else if (attackId !== lastAttackIdRef.current) {
            // New heist — set state directly, watchdog useEffect handles reset
            setAmountTaken(Math.abs(Number(dataAttack.attack.money_taken)));
            setIsAttacked(true);
            setRefreshKey(k => k + 1);
            lastAttackIdRef.current = attackId;
          }
        } else {
            initialized.current = true;
        }

        // 2. Fetch Control Status
        const resControl = await fetch('/api/admin/control');
        const dataControl = await resControl.json();
        if (dataControl.allow_signin !== undefined) {
             setAllowSignin(dataControl.allow_signin);
        }

        // 3. Fetch Total Wealth + Security Level
        const resStats = await fetch('/api/admin/stats');
        const dataStats = await resStats.json();
        if (dataStats.total !== undefined) {
            setTotalWealth(dataStats.total);
        }
        if (dataStats.security_level !== undefined) {
            const newLevel = dataStats.security_level;
            if (prevSecurityLevel.current > 0 && newLevel > prevSecurityLevel.current) {
              setOverlayLevel(newLevel);
              setShowThreatOverlay(true);
              if (threatTimeout.current) clearTimeout(threatTimeout.current);
              threatTimeout.current = setTimeout(() => setShowThreatOverlay(false), 4000);
            }
            prevSecurityLevel.current = newLevel;
            setSecurityLevel(newLevel);
        }

        // 4. Fetch Heist History (live event log)
        const resHistory = await fetch('/api/admin/heist-history');
        const dataHistory = await resHistory.json();
        if (dataHistory.history) {
            setHeistLog(dataHistory.history);
        }

      } catch (err) {
        console.error("Polling error", err);
      }
    };

    fetchLatest();
    const interval = setInterval(fetchLatest, 2000);
    return () => clearInterval(interval);
  }, []);



  return (
    <main className="min-h-screen bg-black text-green-500 font-mono relative overflow-hidden flex flex-col items-center">
      
      {/* Threat Level Increase Overlay */}
      {showThreatOverlay && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center pointer-events-none"
          style={{ animation: 'threatFadeIn 0.3s ease-out' }}>
          <div className="absolute inset-0 bg-red-950/60 backdrop-blur-sm" />
          <div className="relative text-center">
            <div className="text-xs tracking-[0.5em] text-red-400 mb-2 animate-pulse">⚠ ALERT ⚠</div>
            <div className="text-4xl md:text-6xl font-black text-red-500 drop-shadow-[0_0_40px_rgba(255,0,60,0.8)] animate-pulse">
              THREAT LEVEL INCREASED
            </div>
            <div className="mt-4 flex items-center justify-center gap-3">
              <span className="text-2xl text-red-400">LVL {overlayLevel - 1}</span>
              <span className="text-3xl text-red-300 animate-pulse">→</span>
              <span className={`text-5xl font-black drop-shadow-[0_0_20px_rgba(255,0,60,0.6)] ${
                overlayLevel === 5 ? 'text-red-500' : overlayLevel === 4 ? 'text-orange-500' : overlayLevel === 3 ? 'text-yellow-500' : 'text-green-400'
              }`}>
                LVL {overlayLevel}
              </span>
            </div>
            <div className={`mt-2 text-sm tracking-widest font-bold ${
              overlayLevel === 5 ? 'text-red-500' : overlayLevel === 4 ? 'text-orange-500' : overlayLevel === 3 ? 'text-yellow-500' : 'text-green-400'
            }`}>
              {overlayLevel === 5 ? 'MAXIMUM' : overlayLevel === 4 ? 'FORTIFIED' : overlayLevel === 3 ? 'GUARDED' : overlayLevel === 2 ? 'BASIC' : 'MINIMAL'}
            </div>
            <div className="mt-6 flex gap-1 justify-center max-w-xs mx-auto">
              {[1, 2, 3, 4, 5].map((lvl) => (
                <div key={lvl} className={`h-3 flex-1 rounded-sm transition-all duration-500 ${
                  lvl <= overlayLevel
                    ? lvl <= 2 ? 'bg-green-500 shadow-[0_0_10px_rgba(0,255,65,0.6)]'
                      : lvl <= 3 ? 'bg-yellow-500 shadow-[0_0_10px_rgba(255,204,0,0.6)]'
                      : lvl <= 4 ? 'bg-orange-500 shadow-[0_0_10px_rgba(255,102,0,0.6)]'
                      : 'bg-red-500 shadow-[0_0_10px_rgba(255,0,60,0.6)]'
                    : 'bg-gray-800'
                }`} />
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Background Matrix Rain */}
      <div className="absolute inset-0 bg-[linear-gradient(0deg,rgba(0,255,65,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(0,255,65,0.03)_1px,transparent_1px)] bg-[size:20px_20px] pointer-events-none z-0"></div>
      
      {/* Header HUD */}
      <header className="w-full max-w-7xl mt-8 flex justify-between items-center z-10 p-4 border-b border-green-900/50 backdrop-blur-sm">
        <div className="flex items-center gap-4">
            <Terminal className="text-green-500 animate-pulse" size={32} />
            <div>
                <h1 className="text-2xl font-bold tracking-widest text-shadow-glow">SYMPOSIUM_OVERWATCH</h1>
                <p className="text-xs text-green-700">V.2.0.4 // SYSTEM ACTIVE</p>
            </div>
        </div>
        <div className="flex gap-4 font-mono text-sm">
            <div className="px-4 py-1 border border-green-800 bg-green-900/10 rounded">CPU: 42%</div>
            <div className="px-4 py-1 border border-green-800 bg-green-900/10 rounded">MEM: 12GB</div>
            <div className="px-4 py-1 border border-green-800 bg-green-900/10 rounded">NET: SECURE</div>
        </div>
      </header>

      {/* Main Content Info Grid */}
      <div className="w-full max-w-7xl mt-8 grid grid-cols-1 lg:grid-cols-4 gap-6 z-10 px-4">
            
            {/* Left Column Stats */}
            <div className="space-y-6">
                <HUDBox title="SYSTEM STATUS" isAlert={isAttacked}>
                     <div className={`text-4xl font-bold ${isAttacked ? 'text-red-500 animate-pulse' : 'text-green-400'}`}>
                        {isAttacked ? 'CRITICAL' : 'OPTIMAL'}
                     </div>
                     <div className="mt-2 text-xs opacity-70">
                        UPTIME: 420:69:00<br/>
                        LAST SCAN: JUST NOW
                     </div>
                </HUDBox>

                 <HUDBox title="THREAT LEVEL">
                     <div className="flex items-center gap-2">
                        <Activity className={`${isAttacked ? 'text-red-500 animate-spin' : securityLevel >= 4 ? 'text-orange-500' : securityLevel >= 3 ? 'text-yellow-500' : 'text-green-500'}`} />
                        <span className={`text-xl font-bold ${
                          isAttacked ? 'text-red-500 animate-pulse'
                          : securityLevel === 5 ? 'text-red-500'
                          : securityLevel === 4 ? 'text-orange-500'
                          : securityLevel === 3 ? 'text-yellow-500'
                          : securityLevel === 2 ? 'text-green-400'
                          : 'text-green-600'
                        }`}>
                          {isAttacked ? 'EXTREME' : securityLevel === 5 ? 'MAXIMUM' : securityLevel === 4 ? 'FORTIFIED' : securityLevel === 3 ? 'GUARDED' : securityLevel === 2 ? 'BASIC' : 'MINIMAL'}
                        </span>
                     </div>
                     <div className="flex gap-1 mt-3">
                        {[1, 2, 3, 4, 5].map((lvl) => (
                          <div
                            key={lvl}
                            className={`h-2 flex-1 rounded-sm transition-all duration-500 ${
                              isAttacked ? 'bg-red-500 animate-pulse shadow-[0_0_8px_rgba(255,0,60,0.5)]'
                              : lvl <= securityLevel
                                ? lvl <= 2 ? 'bg-green-500 shadow-[0_0_6px_rgba(0,255,65,0.4)]'
                                  : lvl <= 3 ? 'bg-yellow-500 shadow-[0_0_6px_rgba(255,204,0,0.4)]'
                                  : lvl <= 4 ? 'bg-orange-500 shadow-[0_0_6px_rgba(255,102,0,0.4)]'
                                  : 'bg-red-500 shadow-[0_0_6px_rgba(255,0,60,0.4)]'
                                : 'bg-green-900/30'
                            }`}
                          />
                        ))}
                     </div>
                     <div className="text-[10px] text-green-700 mt-2 tracking-widest">SEC_LEVEL {securityLevel}/5</div>
                </HUDBox>

                <HUDBox title="GLOBAL ECONOMY">
                     <div className="text-2xl font-bold text-yellow-500">
                        ${totalWealth.toLocaleString()}
                     </div>
                     <div className="text-xs text-green-700 mt-1">TOTAL NETWORK WEALTH</div>
                </HUDBox>

                 <button 
                  onClick={toggleSignin}
                  className={`w-full p-4 border flex items-center justify-center gap-2 transition-all font-bold tracking-widest ${
                      allowSignin 
                      ? 'border-green-500 bg-green-900/20 text-green-400 shadow-[0_0_15px_rgba(0,255,65,0.3)]' 
                      : 'border-red-500 bg-red-900/20 text-red-500 shadow-[0_0_15px_rgba(255,0,0,0.3)]'
                  }`}
                >
                  {allowSignin ? "ACCESS: GRANTED" : "ACCESS: DENIED"}
                </button>


            </div>


            {/* Center Vault Display */}
            <div className="lg:col-span-2 relative">
                 <VaultScene key={refreshKey} isAttacked={isAttacked} amountTaken={amountTaken} />
                 
                 {/* Decorative Overlay Elements */}
                 <div className="absolute top-2 left-2 text-[10px] text-green-800">CAM_01 [LIVE]</div>
                 <div className="absolute bottom-2 right-2 text-[10px] text-green-800">REC ●</div>
            </div>

            {/* Right Column Logs */}
            <div className="space-y-6">
                <HUDBox title="EVENT LOG" key={`log-${refreshKey}`}>
                    <ul className="text-xs space-y-2 font-mono opacity-80 max-h-[120px] overflow-y-auto hide-scrollbar">
                        {isAttacked && (
                             <li className="text-red-500 animate-pulse">&gt; [BREACH] ${amountTaken} extracted. Alert active.</li>
                        )}
                        {heistLog.length > 0 ? heistLog.map((entry) => (
                          <li key={entry.id} className="text-green-600 border-b border-green-900/20 pb-1">
                            &gt; <span className="text-yellow-600">{entry.team_name || entry.unique_id}</span>{' '}
                            took <span className="text-red-400">${Number(entry.money_taken).toFixed(0)}</span>{' '}
                            — Bank: <span className="text-yellow-500">${Number(entry.bank_balance_after).toLocaleString()}</span>
                          </li>
                        )) : (
                          <>
                            <li className="text-green-600">&gt; No heist activity recorded.</li>
                            <li className="text-green-700">&gt; System monitoring active...</li>
                            <li className="text-green-800">&gt; Awaiting breach attempts...</li>
                          </>
                        )}
                    </ul>
                </HUDBox>
                
                <HUDBox title="NEURAL LINK">
                    <div className="flex justify-center py-4">
                        <Cpu size={64} className="text-green-800 animate-pulse" />
                    </div>
                    <div className="text-center text-xs text-green-600">CONNECTED: SYMPOSIUM_CORE_DB</div>
                </HUDBox>

                <div className="pt-8 border-t border-green-900/30 space-y-4">
                    <h3 className="text-xs font-bold text-green-800 tracking-widest text-center">CLASSIFIED INTEL</h3>
                    
                    <LeaderboardButton />
                    <BestHeistButton />
                </div>
            </div>
      </div>

    </main>
  );
}

function HUDBox({ children, title, isAlert = false }: { children: React.ReactNode, title: string, isAlert?: boolean }) {
    return (
        <div className={`p-4 border bg-black/50 backdrop-blur-md relative overflow-hidden transition-all duration-300 ${isAlert ? 'border-red-600 shadow-[0_0_15px_rgba(255,0,0,0.3)]' : 'border-green-800 hover:border-green-500'}`}>
            {/* Corner acccents */}
            <div className="absolute top-0 left-0 w-2 h-2 border-t border-l border-current opacity-50"></div>
            <div className="absolute top-0 right-0 w-2 h-2 border-t border-r border-current opacity-50"></div>
            <div className="absolute bottom-0 left-0 w-2 h-2 border-b border-l border-current opacity-50"></div>
            <div className="absolute bottom-0 right-0 w-2 h-2 border-b border-r border-current opacity-50"></div>
            
            <h3 className={`text-xs font-bold tracking-[0.2em] mb-4 border-b pb-1 ${isAlert ? 'text-red-500 border-red-900' : 'text-green-600 border-green-900'}`}>
                {title}
            </h3>
            {children}
        </div>
    )
}

function LeaderboardButton() {
    const [isOpen, setIsOpen] = useState(false);
    const [data, setData] = useState<{ team_name: string, wallet_balance: number, unique_id: string }[]>([]);

    const fetchLeaderboard = async () => {
        if (isOpen) {
            setIsOpen(false);
            return;
        }
        try {
            const res = await fetch('/api/admin/leaderboard');
            const d = await res.json();
            setData(d.leaderboard || []);
            setIsOpen(true);
        } catch (e) {
            console.error(e);
        }
    }

    return (
        <>
            <button onClick={fetchLeaderboard} className="w-full py-2 px-4 border border-dashed border-yellow-700 text-yellow-600 hover:bg-yellow-900/10 hover:text-yellow-500 font-mono text-xs tracking-widest transition-all">
                {isOpen ? "[ CLOSE_FILE ]" : "[ DECRYPT_LEADERBOARD ]"}
            </button>
            
            {isOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4" onClick={() => setIsOpen(false)}>
                    <div className="bg-black border border-yellow-600 p-6 max-w-md w-full shadow-[0_0_30px_rgba(234,179,8,0.2)] relative" onClick={e => e.stopPropagation()}>
                        <h2 className="text-xl font-bold text-yellow-500 mb-6 tracking-widest border-b border-yellow-900 pb-2">TOP OPERATIVES</h2>
                        <div className="space-y-3 font-mono text-sm max-h-[60vh] overflow-y-auto">
                            {data.map((team, i) => (
                                <div key={i} className="flex justify-between items-center border-b border-yellow-900/30 pb-2">
                                    <span className="text-yellow-700">#{i+1} {team.team_name}</span>
                                    <span className="text-yellow-400 font-bold">${team.wallet_balance}</span>
                                </div>
                            ))}
                        </div>
                         <button onClick={() => setIsOpen(false)} className="mt-6 w-full py-2 bg-yellow-900/20 text-yellow-600 hover:bg-yellow-900/40 text-xs text-center border border-yellow-900">
                            CLOSE_INTEL
                        </button>
                    </div>
                </div>
            )}
        </>
    )
}

interface HeistData {
    team_name: string;
    money_taken: string;
    user_message: string;
    bank_balance_after: string;
    unique_id: string;
    created_at: string;
}

function BestHeistButton() {
    const [isOpen, setIsOpen] = useState(false);
    const [data, setData] = useState<HeistData | null>(null);
    const [loading, setLoading] = useState(false);

    const fetchBestHeist = async () => {
         if (isOpen) {
            setIsOpen(false);
            return;
        }
        setLoading(true);
        try {
            const res = await fetch('/api/admin/best-heist');
            const d = await res.json();
            setData(d.bestHeist);
            setIsOpen(true);
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    }

    return (
        <>
             <button onClick={fetchBestHeist} disabled={loading} className="w-full py-2 px-4 border border-dashed border-purple-700 text-purple-600 hover:bg-purple-900/10 hover:text-purple-500 font-mono text-xs tracking-widest transition-all disabled:opacity-50">
                {loading ? "[ DECRYPTING... ]" : (isOpen ? "[ END_SIMULATION ]" : "[ REVEAL_LEGEND ]")}
            </button>

             {isOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4" onClick={() => setIsOpen(false)}>
                    <div className="bg-black border border-purple-600 p-6 max-w-lg w-full shadow-[0_0_30px_rgba(147,51,234,0.3)] relative" onClick={e => e.stopPropagation()}>
                        <h2 className="text-xl font-bold text-purple-500 mb-2 tracking-widest">LEGENDARY HEIST</h2>
                        <div className="text-xs text-purple-800 mb-6">HIGHEST SINGLE EXTRACTION RECORDED</div>
                        
                        {data ? (
                            <div className="space-y-6 font-mono">
                                <div>
                                    <div className="text-[10px] text-purple-700 uppercase mb-1">Operative</div>
                                    <div className="text-lg text-purple-300">{data.team_name || data.unique_id || 'Unknown'}</div>
                                </div>
                                
                                <div>
                                    <div className="text-[10px] text-purple-700 uppercase mb-1">Money Extracted</div>
                                    <div className="text-3xl font-bold text-purple-400 drop-shadow-[0_0_10px_purple]">${Number(data.money_taken).toLocaleString()}</div>
                                </div>

                                <div>
                                    <div className="text-[10px] text-purple-700 uppercase mb-1">Bank Balance After</div>
                                    <div className="text-xl text-yellow-500">${Number(data.bank_balance_after).toLocaleString()}</div>
                                </div>

                                <div className="border border-purple-900/50 p-4 bg-purple-900/10 rounded relative">
                                    <div className="absolute top-0 right-0 bg-purple-900 text-[10px] px-2 text-black font-bold">PROMPT_LOG</div>
                                    <p className="text-purple-200 italic leading-relaxed text-sm">
                                        &quot;{data.user_message}&quot;
                                    </p>
                                </div>

                                {data.created_at && (
                                  <div className="text-[10px] text-purple-800">TIMESTAMP: {new Date(data.created_at).toLocaleString()}</div>
                                )}
                            </div>
                        ) : (
                            <div className="text-center py-8 text-purple-400 font-mono">
                                [ NO RECORDS FOUND ]
                            </div>
                        )}

                         <button onClick={() => setIsOpen(false)} className="mt-6 w-full py-2 bg-purple-900/20 text-purple-600 hover:bg-purple-900/40 text-xs text-center border border-purple-900">
                            ARCHIVE
                         </button>
                    </div>
                </div>
            )}
        </>
    )
}
