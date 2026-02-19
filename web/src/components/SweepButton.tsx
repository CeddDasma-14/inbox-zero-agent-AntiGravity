'use client';

import { useState } from 'react';
import { Zap, Loader2 } from 'lucide-react';
import { useRouter } from 'next/navigation';

export default function SweepButton() {
    const [isPending, setIsPending] = useState(false);
    const router = useRouter();

    async function handleSweep() {
        setIsPending(true);
        try {
            const res = await fetch('/api/agent/sweep', { method: 'POST' });
            const data = await res.json();
            if (data.success) {
                router.refresh(); // Refresh the server component data
            }
        } catch (err) {
            console.error('Sweep failed:', err);
        } finally {
            setIsPending(false);
        }
    }

    return (
        <button
            onClick={handleSweep}
            disabled={isPending}
            className={`w-full mt-6 glow-button bg-primary py-3 rounded-xl font-semibold text-sm flex items-center justify-center gap-2 ${isPending ? 'opacity-70 cursor-not-allowed' : ''
                }`}
        >
            {isPending ? (
                <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Analyzing Inbox...
                </>
            ) : (
                <>
                    <Zap className="h-4 w-4 fill-white" />
                    Trigger Manual Sweep
                </>
            )}
        </button>
    );
}
