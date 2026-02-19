import { Mail, Zap, Calendar, Shield, Sparkles, Inbox } from "lucide-react";

export default function Home() {
  return (
    <div className="relative isolate flex min-h-screen flex-col items-center px-6 lg:px-8">
      {/* Background Blobs */}
      <div className="absolute inset-x-0 -top-40 -z-10 transform-gpu overflow-hidden blur-3xl sm:-top-80" aria-hidden="true">
        <div className="relative left-[calc(50%-11rem)] aspect-1155/678 w-[36.125rem] -translate-x-1/2 rotate-[30deg] bg-gradient-to-tr from-[#ff80b5] to-[#9089fc] opacity-20 sm:left-[calc(50%-30rem)] sm:w-[72.1875rem]" />
      </div>

      <nav className="flex w-full max-w-7xl items-center justify-between py-10" aria-label="Global">
        <div className="flex items-center gap-2">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary shadow-lg shadow-primary/20">
            <Inbox className="h-6 w-6 text-white" />
          </div>
          <span className="text-xl font-bold tracking-tight">InboxZero</span>
        </div>
      </nav>

      <main className="mx-auto max-w-4xl pt-24 pb-32 sm:pt-32 sm:pb-40">
        <div className="text-center">
          <div className="mb-8 flex justify-center">
            <div className="relative rounded-full px-3 py-1 text-sm leading-6 ring-1 ring-white/10 hover:ring-white/20 glass-card">
              <span className="hero-gradient font-semibold">Now powered by LLaMA 3.3</span>
            </div>
          </div>

          <h1 className="text-5xl font-extrabold tracking-tight sm:text-7xl mb-8">
            Your Inbox at <br />
            <span className="hero-gradient">The Speed of Thought</span>
          </h1>

          <p className="mt-6 text-lg leading-8 text-zinc-400 max-w-2xl mx-auto">
            Experience the future of email. An autonomous agent that classifies your mail,
            schedules meetings, and protects your focus—all while you sleep.
          </p>

          <div className="mt-12 flex items-center justify-center gap-x-6">
            <a
              href="/api/auth/nylas"
              className="glow-button flex items-center justify-center gap-2 rounded-2xl bg-primary px-8 py-4 text-sm font-semibold text-white shadow-xl hover:bg-primary/90"
            >
              <Zap className="h-4 w-4 fill-white" />
              Connect Your Email
            </a>
            <a href="#features" className="text-sm font-semibold leading-6 text-white hover:text-primary transition-colors">
              Learn how it works <span aria-hidden="true">→</span>
            </a>
          </div>
        </div>

        {/* Feature Grid */}
        <div id="features" className="mt-40 grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-3">
          <div className="glass-card p-8 animate-float" style={{ animationDelay: '0s' }}>
            <Sparkles className="h-10 w-10 text-primary mb-6" />
            <h3 className="text-xl font-bold mb-3">AI Classification</h3>
            <p className="text-zinc-400 leading-relaxed text-sm">
              LLaMA-3 powered analysis categorizes every message by urgency and intent.
            </p>
          </div>

          <div className="glass-card p-8 animate-float" style={{ animationDelay: '1s' }}>
            <Calendar className="h-10 w-10 text-secondary mb-6" />
            <h3 className="text-xl font-bold mb-3">Smart Scheduling</h3>
            <p className="text-zinc-400 leading-relaxed text-sm">
              Automatically suggests meeting times based on your real availability.
            </p>
          </div>

          <div className="glass-card p-8 animate-float" style={{ animationDelay: '2s' }}>
            <Shield className="h-10 w-10 text-accent mb-6" />
            <h3 className="text-xl font-bold mb-3">Security Guard</h3>
            <p className="text-zinc-400 leading-relaxed text-sm">
              Instant detection and flagging of phishing and high-risk emails.
            </p>
          </div>
        </div>
      </main>

      <div className="absolute inset-x-0 top-[calc(100%-13rem)] -z-10 transform-gpu overflow-hidden blur-3xl sm:top-[calc(100%-30rem)]" aria-hidden="true">
        <div className="relative left-[calc(50%+3rem)] aspect-1155/678 w-[36.125rem] -translate-x-1/2 bg-gradient-to-tr from-[#ff80b5] to-[#9089fc] opacity-20 sm:left-[calc(50%+36rem)] sm:w-[72.1875rem]" />
      </div>
    </div>
  );
}
