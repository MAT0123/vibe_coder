"use client"

import { useRouter } from "next/navigation"
import { Sparkles, Code, Bot, Zap, Play, ArrowRight, Laptop, Cpu, Layers, Globe } from "lucide-react"

export default function LandingPage() {
  const router = useRouter()

  const handleCTA = (mode?: string) => {
    if (mode === "register") {
      router.push("/login?mode=register")
    } else {
      router.push("/login")
    }
  }

  const PRESETS = [
    {
      title: "Digital Clock",
      desc: "Interactive neo-brutalist widgets with alarm functions and custom themes.",
      color: "from-pink-500 to-rose-500"
    },
    {
      title: "Kanban Board",
      desc: "Drag-and-drop Kanban Board with state persistence in localStorage.",
      color: "from-violet-500 to-indigo-500"
    },
    {
      title: "Synth Keyboard",
      desc: "Web audio music synthesizer with multiple waveform selectors and delay sliders.",
      color: "from-cyan-500 to-blue-500"
    },
    {
      title: "Crypto Dashboard",
      desc: "Mock trading charts, real-time looking transaction feeds, and search filters.",
      color: "from-emerald-500 to-teal-500"
    }
  ]

  return (
    <div className="min-h-screen bg-[#030712] text-slate-100 flex flex-col font-sans selection:bg-violet-500/20 overflow-x-hidden relative">
      
      {/* Background Decorative Glows */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none z-0" aria-hidden="true">
        <div className="absolute top-[-10%] left-[5%] w-[50vw] h-[50vw] rounded-full bg-indigo-500/10 blur-[120px]" />
        <div className="absolute top-[20%] right-[-5%] w-[45vw] h-[45vw] rounded-full bg-violet-600/10 blur-[130px]" />
        <div className="absolute bottom-[10%] left-[-10%] w-[60vw] h-[60vw] rounded-full bg-purple-500/5 blur-[150px]" />
        {/* Subtle grid pattern */}
        <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.015)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.015)_1px,transparent_1px)] bg-[size:40px_40px]" />
      </div>

      {/* Top Navbar */}
      <header className="relative z-10 w-full border-b border-white/[0.06] bg-[#030712]/50 backdrop-blur-md px-6 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center space-x-3 cursor-pointer" onClick={() => router.push("/")}>
            <div className="w-9 h-9 bg-gradient-to-tr from-violet-600 to-indigo-600 rounded-xl flex items-center justify-center shadow-[0_0_20px_rgba(124,58,237,0.3)]">
              <Sparkles className="w-5 h-5 text-white animate-pulse" />
            </div>
            <span className="text-lg font-bold tracking-tight bg-gradient-to-r from-white to-slate-200 bg-clip-text text-transparent">
              Vibe <span className="text-violet-400">Coder</span>
            </span>
          </div>

          <div className="flex items-center space-x-4">
            <button
              onClick={() => handleCTA("login")}
              className="text-sm font-medium text-slate-300 hover:text-white transition-colors px-3 py-1.5"
            >
              Sign In
            </button>
            <button
              onClick={() => handleCTA("register")}
              className="text-sm font-semibold text-white bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 px-4 py-2 rounded-xl border border-white/[0.08] shadow-[0_4px_20px_rgba(124,58,237,0.2)] hover:shadow-[0_4px_25px_rgba(124,58,237,0.35)] transition-all hover:-translate-y-[1px]"
            >
              Get Started
            </button>
          </div>
        </div>
      </header>

      {/* Main Hero Section */}
      <main className="relative z-10 flex-grow max-w-7xl mx-auto px-6 pt-20 pb-24 flex flex-col items-center text-center">
        
        {/* Floating gradient badge */}
        <div className="inline-flex items-center space-x-2 bg-violet-500/10 border border-violet-500/20 rounded-full px-4.5 py-1.5 text-xs font-semibold text-violet-300 mb-8 animate-fade-in shadow-[inset_0_1px_0_rgba(255,255,255,0.05)]">
          <Bot className="w-3.5 h-3.5" />
          <span>Next-Generation AI Web Builder</span>
        </div>

        {/* Hero Title */}
        <h1 className="text-4xl sm:text-6xl font-extrabold tracking-tight max-w-4xl leading-[1.15] mb-6">
          Build, Edit, and Run Web Apps{" "}
          <span className="bg-gradient-to-r from-violet-400 via-fuchsia-400 to-indigo-400 bg-clip-text text-transparent">
            with AI instantly
          </span>
        </h1>

        {/* Hero Subtitle */}
        <p className="text-base sm:text-xl text-slate-400 max-w-2xl leading-relaxed mb-10">
          Vibe Coder turns your ideas into production-ready web interfaces. Leverage standard or advanced reasoning models like <span className="text-slate-200 font-semibold">GPT-5</span> and <span className="text-slate-200 font-semibold">o3-mini</span> with inline syntax editing, logs inspect, and live preview rendering.
        </p>

        {/* CTA Buttons */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-16">
          <button
            onClick={() => handleCTA("register")}
            className="w-full sm:w-auto inline-flex items-center justify-center space-x-2 bg-gradient-to-r from-violet-600 via-indigo-600 to-purple-650 text-white font-semibold px-8 py-4 rounded-2xl shadow-[0_8px_30px_rgb(99,102,241,0.3)] hover:shadow-[0_8px_35px_rgb(99,102,241,0.5)] transition-all duration-300 hover:scale-[1.02] border border-white/10 group"
          >
            <span>Start Building for Free</span>
            <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
          </button>
          <a
            href="#features"
            className="w-full sm:w-auto inline-flex items-center justify-center space-x-2 bg-white/[0.04] hover:bg-white/[0.08] text-slate-300 hover:text-white font-semibold px-8 py-4 rounded-2xl border border-white/[0.08] transition-all"
          >
            <span>Explore Features</span>
          </a>
        </div>

        {/* App Frame Concept Mockup */}
        <div className="w-full max-w-5xl rounded-2xl border border-white/[0.08] bg-[#0c101f]/70 p-2 sm:p-3 shadow-[0_20px_50px_rgba(0,0,0,0.5)] backdrop-blur-md mb-24 relative overflow-hidden group">
          <div className="absolute inset-0 bg-gradient-to-t from-[#0c101f] via-transparent to-transparent pointer-events-none z-10" />
          
          {/* Header Controls */}
          <div className="flex items-center justify-between border-b border-white/[0.05] pb-3 mb-3 px-3">
            <div className="flex items-center space-x-2">
              <span className="w-3 h-3 rounded-full bg-rose-500/70" />
              <span className="w-3 h-3 rounded-full bg-amber-500/70" />
              <span className="w-3 h-3 rounded-full bg-emerald-500/70" />
            </div>
            <div className="text-xs text-slate-500 font-medium font-mono">vibe-coder-app-builder</div>
            <div className="w-16" />
          </div>

          {/* Dummy Layout Structure */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 h-[280px] sm:h-[400px]">
            {/* Sidebar Prompt Panel */}
            <div className="border border-white/[0.05] rounded-xl bg-slate-950/40 p-4 flex flex-col justify-between text-left">
              <div>
                <div className="w-1/2 h-3 bg-slate-700/40 rounded-md mb-4" />
                <div className="space-y-2.5">
                  <div className="w-full h-3 bg-slate-800/40 rounded-md" />
                  <div className="w-full h-3 bg-slate-800/40 rounded-md" />
                  <div className="w-4/5 h-3 bg-slate-800/40 rounded-md" />
                </div>
              </div>
              <div className="flex items-center justify-between mt-4">
                <div className="w-1/3 h-6 bg-violet-650/40 rounded-md" />
                <div className="w-8 h-8 rounded-lg bg-indigo-650/50 flex items-center justify-center">
                  <Play className="w-3 h-3 text-violet-300" />
                </div>
              </div>
            </div>

            {/* Main Preview Screen */}
            <div className="md:col-span-2 border border-white/[0.05] rounded-xl bg-slate-900/10 flex flex-col overflow-hidden relative">
              <div className="border-b border-white/[0.05] p-2 flex items-center justify-between bg-slate-950/20">
                <div className="w-24 h-3 bg-slate-800/40 rounded-md" />
                <div className="flex space-x-1">
                  <div className="w-5 h-5 rounded bg-slate-800/30" />
                  <div className="w-5 h-5 rounded bg-slate-800/30" />
                </div>
              </div>
              
              {/* Dummy app rendered screen */}
              <div className="flex-grow flex items-center justify-center p-6 bg-gradient-to-tr from-indigo-950/10 to-violet-950/20">
                <div className="text-center flex flex-col items-center">
                  <div className="w-12 h-12 bg-gradient-to-tr from-violet-500 to-indigo-500 rounded-full flex items-center justify-center mb-3 shadow-[0_0_15px_rgba(124,58,237,0.3)]">
                    <Code className="w-6 h-6 text-white" />
                  </div>
                  <div className="w-32 h-4 bg-slate-700/30 rounded-md mb-2" />
                  <div className="w-48 h-3 bg-slate-800/30 rounded-md" />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Core Value Pillars / Features */}
        <section id="features" className="w-full py-16 border-t border-white/[0.06] text-left">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="group border border-white/[0.05] bg-slate-900/20 hover:bg-slate-900/40 hover:border-white/10 p-6 rounded-2xl transition-all duration-300 hover:translate-y-[-4px] hover:shadow-[0_8px_30px_rgb(99,102,241,0.15)]">
              <div className="w-12 h-12 bg-violet-500/10 border border-violet-500/20 text-violet-400 rounded-xl flex items-center justify-center mb-5 transition-transform group-hover:scale-110">
                <Laptop className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-bold mb-2 text-white">Instant Sandbox Preview</h3>
              <p className="text-sm text-slate-400 leading-relaxed">
                Compile and run generated HTML, CSS, and React component code within a sandboxed frame with real-time reload.
              </p>
            </div>

            <div className="group border border-white/[0.05] bg-slate-900/20 hover:bg-slate-900/40 hover:border-white/10 p-6 rounded-2xl transition-all duration-300 hover:translate-y-[-4px] hover:shadow-[0_8px_30px_rgb(99,102,241,0.15)]">
              <div className="w-12 h-12 bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 rounded-xl flex items-center justify-center mb-5 transition-transform group-hover:scale-110">
                <Cpu className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-bold mb-2 text-white">Advanced Intelligence</h3>
              <p className="text-sm text-slate-400 leading-relaxed">
                Choose from a range of models including GPT-5 and reasoning-focused models like o3-mini to solve complex app layouts.
              </p>
            </div>

            <div className="group border border-white/[0.05] bg-slate-900/20 hover:bg-slate-900/40 hover:border-white/10 p-6 rounded-2xl transition-all duration-300 hover:translate-y-[-4px] hover:shadow-[0_8px_30px_rgb(99,102,241,0.15)]">
              <div className="w-12 h-12 bg-purple-500/10 border border-purple-500/20 text-purple-400 rounded-xl flex items-center justify-center mb-5 transition-transform group-hover:scale-110">
                <Layers className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-bold mb-2 text-white">Pre-packaged Presets</h3>
              <p className="text-sm text-slate-400 leading-relaxed">
                Get inspired and start building using our preset widget templates, designed to kick-start your custom project logic.
              </p>
            </div>
          </div>
        </section>

        {/* Preset Showcases */}
        <section className="w-full py-16 border-t border-white/[0.06] text-left">
          <h2 className="text-2xl sm:text-3xl font-extrabold text-white mb-3">
            What will you build first?
          </h2>
          <p className="text-slate-400 mb-10 max-w-xl">
            Choose a boilerplate preset or type custom instructions. Vibe Coder builds it in seconds.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {PRESETS.map((preset, idx) => (
              <div
                key={idx}
                onClick={() => handleCTA("login")}
                className="group border border-white/[0.05] bg-slate-900/10 hover:bg-slate-900/30 hover:border-white/10 p-6 rounded-2xl cursor-pointer transition-all duration-300 flex flex-col justify-between"
              >
                <div>
                  <div className={`w-8 h-8 rounded-lg bg-gradient-to-br ${preset.color} opacity-20 group-hover:opacity-40 transition-opacity mb-4`} />
                  <h4 className="font-bold text-white mb-2 group-hover:text-violet-300 transition-colors">
                    {preset.title}
                  </h4>
                  <p className="text-xs text-slate-400 leading-relaxed">
                    {preset.desc}
                  </p>
                </div>
                <div className="mt-6 flex items-center space-x-1 text-xs text-violet-400 font-semibold opacity-0 group-hover:opacity-100 transition-all transform translate-x-[-4px] group-hover:translate-x-0">
                  <span>Build preset</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* CTA Footer Block */}
        <section className="w-full mt-12 py-16 px-8 rounded-3xl border border-white/[0.08] bg-gradient-to-tr from-violet-950/20 via-indigo-950/15 to-slate-950/40 relative overflow-hidden text-center">
          <div className="absolute inset-0 bg-[#030712]/10 backdrop-blur-2xl pointer-events-none" />
          <div className="relative z-10">
            <h2 className="text-3xl sm:text-4xl font-extrabold text-white mb-4">
              Unleash your code vibes.
            </h2>
            <p className="text-slate-400 max-w-lg mx-auto mb-8 text-sm sm:text-base">
              Sign up today and get equivalent to $0.05 of premium OpenAI compute for free to design, refine, and deploy widgets instantly.
            </p>
            <button
              onClick={() => handleCTA("register")}
              className="inline-flex items-center space-x-2 bg-white text-slate-950 font-bold px-8 py-3.5 rounded-xl hover:bg-slate-200 transition-all shadow-lg hover:shadow-xl"
            >
              <span>Get Started Now</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </section>
      </main>

      {/* Footer copyright */}
      <footer className="relative z-10 border-t border-white/[0.06] bg-[#030712]/85 text-xs text-slate-500 py-8 px-6 text-center">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center space-x-2">
            <span className="font-semibold text-slate-400">Vibe Coder</span>
            <span>© {new Date().getFullYear()} All rights reserved.</span>
          </div>
          <div className="flex space-x-4">
            <a href="#" className="hover:text-slate-300">Terms of Service</a>
            <a href="#" className="hover:text-slate-300">Privacy Policy</a>
          </div>
        </div>
      </footer>
    </div>
  )
}
