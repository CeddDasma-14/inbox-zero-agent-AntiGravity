'use client';

import { useState, useEffect } from 'react';
import { RefreshCw, Play, Pause, Loader2 } from 'lucide-react';
import { useRouter } from 'next/navigation';

export default function AutoSweepToggle() {
    const [isEnabled, setIsEnabled] = useState(false);
    const [isProcessing, setIsProcessing] = useState(false);
    const [lastRun, setLastRun] = useState<Date | null>(null);
    const [countdown, setCountdown] = useState(60);
    const router = useRouter();

    useEffect(() => {
        let interval: NodeJS.Timeout;

        if (isEnabled) {
            interval = setInterval(() => {
                setCountdown((prev) => {
                    if (prev <= 1) {
                        triggerSweep();
                        return 60;
                    }
                    return prev - 1;
                });
            }, 1000);
        } else {
            setCountdown(60);
        }

        return () => clearInterval(interval);
    }, [isEnabled]);

    async function triggerSweep() {
        setIsProcessing(true);
        try {
            const res = await fetch('/api/agent/sweep', { method: 'POST' });
            const data = await res.json();
            if (data.success) {
                setLastRun(new Date());
                router.refresh();
            }
        } catch (err) {
            console.error('Auto-sweep failed:', err);
        } finally {
            setIsProcessing(false);
        }
    }

    return (
        <div className="glass-card p-6 mt-6 border-t border-white/5 bg-primary/5">
            <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                    <div className={`h-2 w-2 rounded-full ${isEnabled ? 'bg-green-500 animate-pulse' : 'bg-zinc-600'}`} />
                    <h3 className="text-sm font-semibold text-zinc-200">Autonomous Mode</h3>
                </div>
                <button
                    onClick={() => setIsEnabled(!isEnabled)}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none ${isEnabled ? 'bg-primary' : 'bg-zinc-700'
                        }`}
                >
                    <span
                        className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${isEnabled ? 'translate-x-6' : 'translate-x-1'
                            }`}
                    />
                </button>
            </div>

            <div className="space-y-3">
                <div className="flex justify-between text-xs">
                    <span className="text-zinc-400">Next Sync</span>
                    <span className="text-primary font-mono">{isEnabled ? `${countdown}s` : '--'}</span>
                </div>

                <div className="flex justify-between text-xs">
                    <span className="text-zinc-400">Status</span>
                    <span className="text-zinc-200 flex items-center gap-1">
                        {isProcessing ? (
                            <>
                                <Loader2 className="h-3 w-3 animate-spin" />
                                Scanning...
                            </>
                        ) : isEnabled ? (
                            'Active Monitoring'
                        ) : (
                            'Standby'
                        )}
                    </span>
                </div>

                {lastRun && (
                    <div className="flex justify-between text-xs">
                        <span className="text-zinc-400">Last Action</span>
                        <span className="text-zinc-500">{lastRun.toLocaleTimeString()}</span>
                    </div>
                )}
            </div>

            {isEnabled && (
                <p className="mt-4 text-[10px] text-zinc-500 italic text-center">
                    The agent is now monitoring your inbox every 60 seconds.
                </p>
            )}
        </div>
    );
}
