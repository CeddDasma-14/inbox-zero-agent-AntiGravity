import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { nylas } from '@/lib/nylas';
import { Inbox, CheckCircle, Clock, AlertTriangle, Shield, Calendar, LogOut, Mail } from 'lucide-react';

export default async function Dashboard() {
    const cookieStore = await cookies();
    const grantId = cookieStore.get('nylas_grant_id')?.value;

    if (!grantId) {
        redirect('/');
    }

    // Fetch some recent messages to show it's working
    let messages: any[] = [];
    try {
        const response = await nylas.messages.list({
            identifier: grantId,
            queryParams: { limit: 5 },
        });
        messages = response.data;
    } catch (err) {
        console.error('Failed to fetch messages:', err);
    }

    return (
        <div className="min-h-screen p-8 max-w-7xl mx-auto">
            <header className="flex justify-between items-center mb-12">
                <div className="flex items-center gap-3">
                    <div className="h-12 w-12 bg-primary rounded-2xl flex items-center justify-center shadow-lg shadow-primary/20">
                        <Inbox className="text-white h-7 w-7" />
                    </div>
                    <div>
                        <h1 className="text-2xl font-bold">Agent Dashboard</h1>
                        <p className="text-zinc-400 text-sm">Active & Monitoring</p>
                    </div>
                </div>
                <form action="/api/auth/logout" method="POST">
                    <button className="flex items-center gap-2 text-zinc-400 hover:text-white transition-colors">
                        <LogOut className="h-4 w-4" />
                        Sign Out
                    </button>
                </form>
            </header>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Status Panel */}
                <div className="lg:col-span-1 space-y-6">
                    <div className="glass-card p-6">
                        <h2 className="text-lg font-bold mb-4 flex items-center gap-2">
                            <CheckCircle className="text-green-500 h-5 w-5" />
                            Agent Status
                        </h2>
                        <div className="space-y-4">
                            <div className="flex justify-between items-center py-2 border-b border-white/5">
                                <span className="text-zinc-400">Mode</span>
                                <span className="text-primary font-medium">Autonomous</span>
                            </div>
                            <div className="flex justify-between items-center py-2 border-b border-white/5">
                                <span className="text-zinc-400">Integrations</span>
                                <div className="flex gap-2">
                                    <div className="bg-indigo-500/20 p-1 rounded">
                                        <Calendar className="h-3 w-3 text-indigo-400" />
                                    </div>
                                    <div className="bg-blue-500/20 p-1 rounded">
                                        <Shield className="h-3 w-3 text-blue-400" />
                                    </div>
                                </div>
                            </div>
                        </div>
                        <button className="w-full mt-6 glow-button bg-primary py-3 rounded-xl font-semibold text-sm">
                            Trigger Manual Sweep
                        </button>
                    </div>

                    <div className="glass-card p-6">
                        <h3 className="text-sm font-bold text-zinc-500 uppercase tracking-widest mb-4">Focus Statistics</h3>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="p-4 bg-white/5 rounded-2xl">
                                <p className="text-2xl font-bold">24</p>
                                <p className="text-xs text-zinc-400">Classified</p>
                            </div>
                            <div className="p-4 bg-white/5 rounded-2xl">
                                <p className="text-2xl font-bold">12</p>
                                <p className="text-xs text-zinc-400">Filtered</p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Recent Activity */}
                <div className="lg:col-span-2 space-y-6">
                    <div className="glass-card p-6">
                        <h2 className="text-lg font-bold mb-6 flex items-center gap-2">
                            <Clock className="text-secondary h-5 w-5" />
                            Recent Inbox Activity
                        </h2>
                        <div className="space-y-4">
                            {messages.length > 0 ? messages.map((msg) => (
                                <div key={msg.id} className="p-4 bg-white/5 hover:bg-white/10 transition-colors rounded-2xl flex items-start justify-between border border-white/5">
                                    <div className="flex gap-4">
                                        <div className="h-10 w-10 flex-shrink-0 bg-primary/20 rounded-full flex items-center justify-center">
                                            <Mail className="h-5 w-5 text-primary" />
                                        </div>
                                        <div>
                                            <h4 className="font-semibold text-sm line-clamp-1">{msg.subject || '(No Subject)'}</h4>
                                            <p className="text-xs text-zinc-500 mt-1">{msg.snippet?.substring(0, 60)}...</p>
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <span className="text-[10px] px-2 py-1 bg-white/5 rounded-lg text-zinc-400">SCANNING</span>
                                    </div>
                                </div>
                            )) : (
                                <div className="text-center py-12 text-zinc-500">
                                    <Inbox className="h-12 w-12 mx-auto mb-4 opacity-20" />
                                    <p>No messages found or syncing in progress...</p>
                                </div>
                            )}
                        </div>
                    </div>

                    <div className="glass-card p-6 border-l-4 border-l-yellow-500/50">
                        <div className="flex items-start gap-4">
                            <AlertTriangle className="text-yellow-500 h-6 w-6 mt-1" />
                            <div>
                                <h3 className="font-bold">Pending Actions in TODO.md</h3>
                                <p className="text-sm text-zinc-400 mt-1">Review the generated markdown file for critical items requiring your attention.</p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
