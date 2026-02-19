import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { nylas } from '@/lib/nylas';
import { Inbox, CheckCircle, Clock, AlertTriangle, Shield, Calendar, LogOut, Mail, ChevronLeft, ChevronRight } from 'lucide-react';
import SweepButton from '@/components/SweepButton';
import AutoSweepToggle from '@/components/AutoSweepToggle';
import Link from 'next/link';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default async function Dashboard({ searchParams }: { searchParams: Promise<{ page_token?: string }> }) {
    const { page_token } = await searchParams;
    const cookieStore = await cookies();
    const grantId = cookieStore.get('nylas_grant_id')?.value;

    if (!grantId) {
        redirect('/');
    }

    // Fetch messages with pagination
    let messages: any[] = [];
    let nextCursor: string | null = null;
    try {
        const response = await nylas.messages.list({
            identifier: grantId,
            queryParams: {
                limit: 10,
                pageToken: page_token
            },
        });
        messages = response.data;
        nextCursor = response.nextCursor || null;
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
                <div className="flex items-center gap-6">
                    {/* Pagination Controls */}
                    <div className="flex items-center gap-2 bg-white/5 px-3 py-1.5 rounded-xl border border-white/5">
                        <span className="text-xs text-zinc-500 mr-2">Pagination</span>
                        <Link
                            href="/dashboard"
                            className={`p-1 hover:bg-white/10 rounded-lg transition-colors ${!page_token ? 'opacity-30 pointer-events-none' : ''}`}
                        >
                            <ChevronLeft className="h-4 w-4" />
                        </Link>
                        <Link
                            href={`/dashboard?page_token=${nextCursor}`}
                            className={`p-1 hover:bg-white/10 rounded-lg transition-colors ${!nextCursor ? 'opacity-30 pointer-events-none' : ''}`}
                        >
                            <ChevronRight className="h-4 w-4" />
                        </Link>
                    </div>

                    <form action="/api/auth/logout" method="POST">
                        <button className="flex items-center gap-2 text-zinc-400 hover:text-white transition-colors">
                            <LogOut className="h-4 w-4" />
                            Sign Out
                        </button>
                    </form>
                </div>
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

                        <SweepButton />
                        <AutoSweepToggle />
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
                                <div key={msg.id} className="group relative p-4 bg-white/5 hover:bg-white/10 transition-all rounded-2xl flex items-start justify-between border border-white/5">
                                    <div className="flex gap-4">
                                        <div className="h-10 w-10 flex-shrink-0 bg-primary/20 rounded-full flex items-center justify-center">
                                            <Mail className="h-5 w-5 text-primary" />
                                        </div>
                                        <div>
                                            <h4 className="font-semibold text-sm line-clamp-1">{msg.subject || '(No Subject)'}</h4>
                                            <p className="text-xs text-zinc-500 mt-1">{msg.snippet?.substring(0, 80)}...</p>
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <span className="text-[10px] px-2 py-1 bg-white/5 rounded-lg text-zinc-400">SCANNING</span>
                                    </div>

                                    {/* Hover Preview Tooltip */}
                                    <div className="absolute left-0 top-full mt-2 w-full glass-card p-4 z-50 opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity shadow-2xl border-primary/20">
                                        <p className="text-xs text-zinc-300 leading-relaxed">
                                            {msg.snippet || 'No preview available'}
                                        </p>
                                        {msg.body && (
                                            <div className="mt-2 pt-2 border-t border-white/5 text-[10px] text-zinc-500 italic">
                                                Snippet preview powered by AI Agent
                                            </div>
                                        )}
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

