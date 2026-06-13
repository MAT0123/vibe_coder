"use client"

import { useEffect, useState, useCallback, Suspense } from "react"
import { useRouter, useSearchParams } from "next/navigation"

/* ─── tiny helpers ──────────────────────────────────────────────── */
function cn(...cls: (string | false | undefined)[]) {
  return cls.filter(Boolean).join(" ")
}

/* ─── animated background particles ─────────────────────────────── */
function Particles() {
  return (
    <div className="auth-particles" aria-hidden="true">
      {Array.from({ length: 22 }).map((_, i) => (
        <span key={i} className="auth-particle" style={{
          "--i": i,
          "--x": `${Math.random() * 100}%`,
          "--y": `${Math.random() * 100}%`,
          "--d": `${6 + Math.random() * 14}s`,
          "--s": `${2 + Math.random() * 4}px`,
          "--o": `${0.15 + Math.random() * 0.4}`,
        } as React.CSSProperties} />
      ))}
    </div>
  )
}

/* ─── grid lines overlay ─────────────────────────────────────────── */
function GridLines() {
  return <div className="auth-grid" aria-hidden="true" />
}

/* ─── floating code snippet ──────────────────────────────────────── */
const CODE_SNIPPETS = [
  `const ai = new VibeAI()\nawait ai.generate(prompt)`,
  `export function build(\n  prompt: string\n) { ... }`,
  `<Component\n  model="o3-mini"\n  stream={true}\n/>`,
  `function* tokens() {\n  yield* stream\n}`,
]
function FloatingCode() {
  return (
    <div className="auth-floating-code" aria-hidden="true">
      {CODE_SNIPPETS.map((code, i) => (
        <pre key={i} className="auth-code-snippet" style={{
          "--ci": i,
          "--cx": `${10 + (i % 2) * 55}%`,
          "--cy": `${12 + i * 20}%`,
          "--cd": `${18 + i * 4}s`,
        } as React.CSSProperties}>{code}</pre>
      ))}
    </div>
  )
}

/* ─── logo ──────────────────────────────────────────────────────── */
function Logo() {
  return (
    <div className="auth-logo">
      <div className="auth-logo-icon">
        <svg width="28" height="28" viewBox="0 0 28 28" fill="none" aria-hidden="true">
          <defs>
            <linearGradient id="lg" x1="0" y1="0" x2="28" y2="28" gradientUnits="userSpaceOnUse">
              <stop offset="0%" stopColor="#a78bfa"/>
              <stop offset="100%" stopColor="#6366f1"/>
            </linearGradient>
          </defs>
          <path d="M7 6l7 7-7 7" stroke="url(#lg)" strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round"/>
          <path d="M15 20h7" stroke="url(#lg)" strokeWidth="2.8" strokeLinecap="round"/>
        </svg>
      </div>
      <span className="auth-logo-text">Vibe<span>Coder</span></span>
    </div>
  )
}

/* ─── input field ───────────────────────────────────────────────── */
interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label: string
  icon: React.ReactNode
  error?: boolean
}
function AuthInput({ label, icon, error, ...props }: InputProps) {
  return (
    <div className="auth-field">
      <label className="auth-label">{label}</label>
      <div className={cn("auth-input-wrap", error && "auth-input-wrap--error")}>
        <span className="auth-input-icon">{icon}</span>
        <input className="auth-input" {...props} />
      </div>
    </div>
  )
}

/* ─── spinner ───────────────────────────────────────────────────── */
function Spinner() {
  return (
    <svg className="auth-spinner" width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" strokeOpacity=".25"/>
      <path d="M12 2a10 10 0 0 1 10 10" stroke="currentColor" strokeWidth="3" strokeLinecap="round"/>
    </svg>
  )
}

/* ─── main page ─────────────────────────────────────────────────── */
type Mode = "login" | "register" | "verify"

function LoginForm() {
  const router = useRouter()
  const searchParams = useSearchParams()

  const [mode, setMode] = useState<Mode>("login")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [verifyEmail, setVerifyEmail] = useState("")
  const [code, setCode] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [showPass, setShowPass] = useState(false)

  // Pick up ?error= from OAuth callback
  useEffect(() => {
    const oauthError = searchParams.get("error")
    if (oauthError) setError(decodeURIComponent(oauthError))
  }, [searchParams])

  // Check if already logged in
  useEffect(() => {
    fetch("/api/auth/me").then(r => r.json()).then(d => {
      if (d.user) router.replace("/")
    }).catch(() => {})
  }, [router])

  const switchMode = useCallback((m: Mode) => {
    setMode(m)
    setError(null)
    setSuccess(null)
  }, [])

  /* ── submit email+pass ── */
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!email.trim() || !password.trim()) {
      setError("Both fields are required.")
      return
    }
    setError(null)
    setLoading(true)
    try {
      const endpoint = mode === "login" ? "/api/auth/login" : "/api/auth/register"
      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim(), password: password.trim() }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || "Authentication failed")

      if (mode === "register") {
        setVerifyEmail(email.trim())
        setPassword("")
        setSuccess("Check your inbox — a 6-digit code is on its way.")
        switchMode("verify")
      } else {
        router.replace("/")
      }
    } catch (err: any) {
      setError(err.message || "Something went wrong.")
    } finally {
      setLoading(false)
    }
  }

  /* ── submit verification code ── */
  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!code.trim()) { setError("Enter the 6-digit code."); return }
    setError(null)
    setLoading(true)
    try {
      const res = await fetch("/api/auth/verify-code", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: verifyEmail, code: code.trim() }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || "Verification failed")
      setSuccess("Account confirmed! You can now log in.")
      setCode("")
      switchMode("login")
    } catch (err: any) {
      setError(err.message || "Something went wrong.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      <style>{CSS}</style>

      {/* Background */}
      <div className="auth-bg">
        <div className="auth-glow" />
        <GridLines />
      </div>

      {/* Center card */}
      <main className="auth-center">
        <div className="auth-card">

          {/* Header */}
          <header className="auth-header">
            <Logo />
            <p className="auth-tagline">
              {mode === "verify"
                ? "One last step — verify your email"
                : "AI-powered web builder"}
            </p>
          </header>

          {/* Tabs (login | register) */}
          {mode !== "verify" && (
            <div className="auth-tabs" role="tablist">
              <button
                role="tab"
                aria-selected={mode === "login"}
                className={cn("auth-tab", mode === "login" && "auth-tab--active")}
                onClick={() => switchMode("login")}
              >Log In</button>
              <button
                role="tab"
                aria-selected={mode === "register"}
                className={cn("auth-tab", mode === "register" && "auth-tab--active")}
                onClick={() => switchMode("register")}
              >Sign Up</button>
            </div>
          )}

          {/* Alerts */}
          {error && (
            <div className="auth-alert auth-alert--error" role="alert">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2"/>
                <path d="M12 8v4M12 16h.01" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
              </svg>
              {error}
            </div>
          )}
          {success && (
            <div className="auth-alert auth-alert--success" role="status">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                <path d="M20 6 9 17l-5-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
              {success}
            </div>
          )}

          {/* ── Verification form ── */}
          {mode === "verify" ? (
            <form onSubmit={handleVerify} className="auth-form" noValidate>
              <div className="auth-verify-hint">
                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                  <rect x="2" y="4" width="20" height="16" rx="3" stroke="currentColor" strokeWidth="1.5"/>
                  <path d="m2 7 10 7 10-7" stroke="currentColor" strokeWidth="1.5"/>
                </svg>
                <p>Code sent to <strong>{verifyEmail}</strong></p>
              </div>

              <AuthInput
                label="6-Digit Code"
                icon={
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                    <rect x="3" y="11" width="18" height="11" rx="2" stroke="currentColor" strokeWidth="2"/>
                    <path d="M7 11V7a5 5 0 0 1 10 0v4" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                  </svg>
                }
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                maxLength={6}
                placeholder="_ _ _ _ _ _"
                value={code}
                onChange={e => setCode(e.target.value.replace(/\D/g, ""))}
                autoFocus
                autoComplete="one-time-code"
                error={!!error}
              />

              <button type="submit" className="auth-btn auth-btn--primary" disabled={loading}>
                {loading ? <><Spinner /> Verifying…</> : "Confirm Account →"}
              </button>
              <button type="button" className="auth-btn auth-btn--ghost" onClick={() => switchMode("login")}>
                ← Back to Login
              </button>
            </form>
          ) : (
            /* ── Login / Register form ── */
            <form onSubmit={handleSubmit} className="auth-form" noValidate>
              <AuthInput
                label="Email Address"
                icon={
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                    <rect x="2" y="4" width="20" height="16" rx="3" stroke="currentColor" strokeWidth="2"/>
                    <path d="m2 7 10 7 10-7" stroke="currentColor" strokeWidth="2"/>
                  </svg>
                }
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={e => setEmail(e.target.value)}
                autoComplete={mode === "login" ? "email" : "email"}
                error={!!error}
              />

              <div className="auth-field">
                <label className="auth-label">Password</label>
                <div className={cn("auth-input-wrap", !!error && "auth-input-wrap--error")}>
                  <span className="auth-input-icon">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                      <rect x="3" y="11" width="18" height="11" rx="2" stroke="currentColor" strokeWidth="2"/>
                      <path d="M7 11V7a5 5 0 0 1 10 0v4" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                    </svg>
                  </span>
                  <input
                    className="auth-input"
                    type={showPass ? "text" : "password"}
                    placeholder={mode === "register" ? "min. 8 chars, uppercase + number" : "Enter your password"}
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    autoComplete={mode === "login" ? "current-password" : "new-password"}
                  />
                  <button
                    type="button"
                    className="auth-eye"
                    aria-label={showPass ? "Hide password" : "Show password"}
                    onClick={() => setShowPass(v => !v)}
                    tabIndex={-1}
                  >
                    {showPass ? (
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                        <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                        <line x1="1" y1="1" x2="23" y2="23" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                      </svg>
                    ) : (
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                        <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" stroke="currentColor" strokeWidth="2"/>
                        <circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="2"/>
                      </svg>
                    )}
                  </button>
                </div>
              </div>

              <button type="submit" className="auth-btn auth-btn--primary" disabled={loading}>
                {loading ? (
                  <><Spinner />{mode === "login" ? "Logging in…" : "Creating account…"}</>
                ) : mode === "login" ? (
                  "Log In →"
                ) : (
                  "Create Account →"
                )}
              </button>

              {/* Divider */}
              <div className="auth-divider"><span>or</span></div>

              {/* Google button */}
              <a href="/api/auth/google" className="auth-btn auth-btn--google">
                <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true">
                  <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                  <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                  <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05"/>
                  <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                </svg>
                Continue with Google
              </a>
            </form>
          )}

          {/* Footer */}
          <footer className="auth-footer">
            <p>By continuing, you agree to our <a href="#">Terms</a> and <a href="#">Privacy Policy</a>.</p>
          </footer>
        </div>
      </main>
    </>
  )
}

export default function LoginPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-[#080d1a] flex items-center justify-center text-slate-400">
        <div className="w-8 h-8 border-2 border-slate-300 border-t-violet-500 rounded-full animate-spin" />
      </div>
    }>
      <LoginForm />
    </Suspense>
  )
}

/* ─── styles ─────────────────────────────────────────────────────── */
const CSS = `
  /* Reset */
  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
  html, body { height: 100%; background: #030712; }

  /* Page background */
  .auth-bg {
    position: fixed; inset: 0; overflow: hidden;
    background: #030712;
    z-index: 0;
  }

  /* Single premium ambient glow */
  .auth-glow {
    position: absolute; border-radius: 50%;
    filter: blur(140px); pointer-events: none;
    width: 600px; height: 600px;
    top: -150px; left: calc(50% - 300px);
    background: radial-gradient(circle, rgba(99,102,241,0.2) 0%, rgba(124,58,237,0.08) 50%, transparent 80%);
  }

  /* Subtle grid overlay */
  .auth-grid {
    position: absolute; inset: 0;
    background-image:
      linear-gradient(rgba(255,255,255,0.02) 1px, transparent 1px),
      linear-gradient(90deg, rgba(255,255,255,0.02) 1px, transparent 1px);
    background-size: 32px 32px;
  }

  /* Center layout */
  .auth-center {
    position: relative; z-index: 10;
    min-height: 100dvh;
    display: flex; align-items: center; justify-content: center;
    padding: 24px 16px;
    font-family: system-ui, -apple-system, sans-serif;
  }

  /* Premium Glass Card */
  .auth-card {
    position: relative;
    width: 100%; max-width: 420px;
    background: rgba(17, 24, 39, 0.7);
    backdrop-filter: blur(16px);
    -webkit-backdrop-filter: blur(16px);
    border-radius: 16px;
    border: 1px solid rgba(255, 255, 255, 0.08);
    padding: 36px 32px;
    box-shadow:
      0 4px 6px -1px rgba(0, 0, 0, 0.1),
      0 20px 25px -5px rgba(0, 0, 0, 0.5),
      inset 0 1px 0 rgba(255, 255, 255, 0.03);
  }

  /* Header */
  .auth-header { text-align: center; margin-bottom: 24px; }
  .auth-logo {
    display: inline-flex; align-items: center; gap: 8px;
    margin-bottom: 12px;
  }
  .auth-logo-icon {
    width: 40px; height: 40px; border-radius: 10px;
    background: linear-gradient(135deg, rgba(124,58,237,0.15), rgba(99,102,241,0.1));
    border: 1px solid rgba(124,58,237,0.3);
    display: flex; align-items: center; justify-content: center;
  }
  .auth-logo-text {
    font-size: 20px; font-weight: 700; letter-spacing: -0.5px;
    color: #f3f4f6;
  }
  .auth-logo-text span { color: #a78bfa; }
  .auth-tagline {
    font-size: 13px; color: #9ca3af;
  }

  /* Tabs */
  .auth-tabs {
    display: flex;
    background: rgba(255, 255, 255, 0.03);
    border: 1px solid rgba(255, 255, 255, 0.05);
    border-radius: 10px; padding: 4px;
    margin-bottom: 20px;
  }
  .auth-tab {
    flex: 1; padding: 8px 0; border: none; background: transparent;
    font-size: 13px; font-weight: 600; cursor: pointer;
    border-radius: 8px; color: #9ca3af;
    transition: all 0.2s;
  }
  .auth-tab--active {
    background: rgba(255, 255, 255, 0.08);
    color: #ffffff;
  }
  .auth-tab:hover:not(.auth-tab--active) { color: #ffffff; }

  /* Alerts */
  .auth-alert {
    display: flex; align-items: center; gap: 8px;
    padding: 10px 12px; border-radius: 8px;
    font-size: 13px;
    margin-bottom: 16px;
  }
  .auth-alert svg { flex-shrink: 0; }
  .auth-alert--error {
    background: rgba(239, 68, 68, 0.1);
    border: 1px solid rgba(239, 68, 68, 0.2);
    color: #fca5a5;
  }
  .auth-alert--success {
    background: rgba(16, 185, 129, 0.1);
    border: 1px solid rgba(16, 185, 129, 0.2);
    color: #6ee7b7;
  }

  /* Form */
  .auth-form { display: flex; flex-direction: column; gap: 14px; }

  /* Fields */
  .auth-field { display: flex; flex-direction: column; gap: 6px; }
  .auth-label {
    font-size: 11px; font-weight: 600; letter-spacing: .05em;
    text-transform: uppercase; color: #9ca3af;
  }
  .auth-input-wrap {
    position: relative; display: flex; align-items: center;
    background: rgba(255, 255, 255, 0.03);
    border: 1px solid rgba(255, 255, 255, 0.08);
    border-radius: 8px; transition: all 0.2s;
  }
  .auth-input-wrap:focus-within {
    border-color: rgba(99, 102, 241, 0.5);
    background: rgba(255, 255, 255, 0.05);
    box-shadow: 0 0 0 2px rgba(99, 102, 241, 0.15);
  }
  .auth-input-wrap--error {
    border-color: rgba(239, 68, 68, 0.3);
    box-shadow: 0 0 0 2px rgba(239, 68, 68, 0.1);
  }
  .auth-input-icon {
    padding: 0 10px; color: #6b7280; flex-shrink: 0;
    display: flex; align-items: center;
  }
  .auth-input {
    flex: 1; background: transparent; border: none; outline: none;
    padding: 12px 10px 12px 0;
    font-size: 14px; color: #f3f4f6;
  }
  .auth-input::placeholder { color: #4b5563; }
  .auth-eye {
    padding: 0 10px; background: none; border: none; cursor: pointer;
    color: #6b7280; display: flex; align-items: center;
    transition: color 0.15s;
  }
  .auth-eye:hover { color: #9ca3af; }

  /* Buttons */
  .auth-btn {
    display: flex; align-items: center; justify-content: center;
    gap: 8px; padding: 12px 20px; border-radius: 8px;
    font-size: 14px; font-weight: 600;
    cursor: pointer; border: none; transition: all 0.2s; text-decoration: none;
  }
  .auth-btn--primary {
    background: #4f46e5;
    color: #ffffff;
    box-shadow: 0 2px 4px rgba(79, 70, 229, 0.2);
  }
  .auth-btn--primary:hover:not(:disabled) {
    background: #6366f1;
    transform: translateY(-1px);
  }
  .auth-btn--primary:active:not(:disabled) { transform: translateY(0); }
  .auth-btn--primary:disabled { opacity: 0.6; cursor: not-allowed; }
  
  .auth-btn--ghost {
    background: transparent;
    color: #9ca3af;
    border: 1px solid rgba(255, 255, 255, 0.08);
  }
  .auth-btn--ghost:hover {
    background: rgba(255, 255, 255, 0.03);
    color: #ffffff;
  }

  .auth-btn--google {
    background: rgba(255, 255, 255, 0.03);
    color: #f3f4f6;
    border: 1px solid rgba(255, 255, 255, 0.08);
  }
  .auth-btn--google:hover {
    background: rgba(255, 255, 255, 0.06);
    border-color: rgba(255, 255, 255, 0.12);
  }
  .auth-spinner {
    animation: spin .8s linear infinite; flex-shrink: 0;
  }
  @keyframes spin { to { transform: rotate(360deg); } }

  /* Divider */
  .auth-divider {
    display: flex; align-items: center; gap: 10px;
    color: rgba(100,116,139,.5); font-size: 11px;
  }
  .auth-divider::before, .auth-divider::after {
    content: ''; flex: 1; height: 1px;
    background: rgba(255,255,255,.07);
  }

  /* Footer */
  .auth-footer {
    margin-top: 22px; padding-top: 20px;
    border-top: 1px solid rgba(255,255,255,.06);
    text-align: center;
  }
  .auth-footer p { font-size: 11px; color: rgba(100,116,139,.6); }
  .auth-footer a { color: rgba(148,163,184,.55); text-decoration: underline; }
  .auth-footer a:hover { color: rgba(196,181,253,.7); }

  /* Responsive */
  @media (max-width: 480px) {
    .auth-card { padding: 32px 22px 24px; }
    .auth-floating-code { display: none; }
  }
`
