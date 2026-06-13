"use client"

import { useEffect, useRef, useState, useCallback } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Card } from "@/components/ui/card"
import { 
  Send, Sparkles, Code, Eye, Download, Trash2, 
  Smartphone, Tablet, Monitor, Terminal, AlertCircle, 
  CheckCircle2, FileCode, RefreshCw, X, Copy, ExternalLink,
  Bot, User, LogOut, Coins, CreditCard, Lock, Mail, Key
} from "lucide-react"

import dynamic from "next/dynamic"
import { transformHtml } from "./lib/bundling/transformHtml"
import { downloadFiles } from "./lib/downloadFiles"
import { unescapeLiteral } from "./lib/createLiteralEscape"

const MonacoEditor = dynamic(() => import("@monaco-editor/react"), {
  ssr: false,
  loading: () => (
    <div className="h-full flex items-center justify-center bg-slate-50">
      <div className="flex items-center space-x-2 text-slate-400">
        <div className="w-4 h-4 border-2 border-slate-300 border-t-violet-500 rounded-full animate-spin" />
        <span>Loading editor...</span>
      </div>
    </div>
  ),
})



interface LogEntry {
  type: 'log' | 'warn' | 'error'
  message: string
  timestamp: string
}

interface ChatMessage {
  id: string
  role: 'user' | 'assistant'
  content: string
  timestamp: Date
  status?: 'loading' | 'success' | 'error'
  files?: Record<string, string>
}

interface UserProfile {
  id: string
  email: string
  tokenBalance: number
}

const PRESET_PROMPTS = [
  { label: "Digital Clock", text: "Create an interactive neo-brutalist digital clock widget with alarm functions, custom background themes, a stopwatch, and sound effects." },
  { label: "Kanban Board", text: "Build a beautiful drag-and-drop Kanban Board using native HTML5 drag and drop, with state persistence in localStorage and tags." },
  { label: "Synth Keyboard", text: "Design a web audio music synthesizer keyboard with multiple waveform selectors (sine, square, saw), delay/reverb sliders, and key triggers." },
  { label: "Crypto Dashboard", text: "Build a mock cryptocurrency dashboard with mock trading charts (using HTML Canvas or SVGs), transaction history, and filter tabs." }
]

const AI_MODELS = [
  { id: "o3-mini", name: "o3-mini (Reasoning)", desc: "Default fast coding model with high reasoning ability" },
  { id: "o1", name: "o1 (High Reasoning)", desc: "Deep reasoning model for complex logical structures" },
  { id: "gpt-4o", name: "gpt-4o (Standard)", desc: "Vibrant multimodal model for general tasks" },
  { id: "gpt-4o-mini", name: "gpt-4o-mini (Fast & Cheap)", desc: "Resource-light model for quick, simple generation" }
]

export default function WebBuilder() {
  const [prompt, setPrompt] = useState("")
  const [isGenerating, setIsGenerating] = useState(false)
  const [generationStep, setGenerationStep] = useState(0)
  const [iframeURL, setiframeURL] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [files, setFiles] = useState<Record<string, string>>({})
  
  const [selectedFile, setSelectedFile] = useState<string>("")
  const [editorContent, setEditorContent] = useState<string>("")
  const [device, setDevice] = useState<'desktop' | 'tablet' | 'mobile'>('desktop')
  const [logs, setLogs] = useState<LogEntry[]>([])
  const [isConsoleCollapsed, setIsConsoleCollapsed] = useState(true)
  const [activeTab, setActiveTab] = useState<'preview' | 'code'>('preview')

  // Authentication State
  const [user, setUser] = useState<UserProfile | null>(null)
  const [isAuthLoading, setIsAuthLoading] = useState(true)
  const [authMode, setAuthMode] = useState<'login' | 'register'>('login')
  const [authEmail, setAuthEmail] = useState("")
  const [authPassword, setAuthPassword] = useState("")
  const [authError, setAuthError] = useState<string | null>(null)
  const [isSubmittingAuth, setIsSubmittingAuth] = useState(false)

  // AWS Cognito Email Verification State
  const [isVerifyingEmail, setIsVerifyingEmail] = useState(false)
  const [verificationCode, setVerificationCode] = useState("")
  const [verifyEmailAddress, setVerifyEmailAddress] = useState("")

  // Payment Modal State
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false)
  const [isPaying, setIsPaying] = useState(false)
  const [selectedTier, setSelectedTier] = useState<'basic' | 'pro' | 'mega'>('pro')

  // Model Selector State
  const [selectedModel, setSelectedModel] = useState<string>("o3-mini")
  
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'welcome',
      role: 'assistant',
      content: "Hello! I'm your AI web developer. Tell me what you'd like to build today, and I'll generate the HTML, CSS, and React components for you. You can preview and edit the code in the right panel.",
      timestamp: new Date()
    }
  ])
  
  const iframeRef = useRef<HTMLIFrameElement | null>(null)
  const messagesEndRef = useRef<HTMLDivElement | null>(null)

  // Check auth session on mount
  useEffect(() => {
    const checkSession = async () => {
      try {
        const res = await fetch("/api/auth/me")
        const json = await res.json()
        if (json.user) {
          setUser(json.user)
        }
      } catch (err) {
        console.error("Session fetch failed:", err)
      } finally {
        setIsAuthLoading(false)
      }
    }

    checkSession()
  }, [])


  // Scroll to bottom of chat feed when messages update
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  // Listen to logs from sandboxed iframe
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      if (event.data && event.data.source === 'vibe-coder-sandbox') {
        const { type, message } = event.data
        const newLog: LogEntry = {
          type: type || 'log',
          message: message || '',
          timestamp: new Date().toLocaleTimeString()
        }
        setLogs(prev => [...prev, newLog].slice(-200))
      }
    }

    window.addEventListener('message', handleMessage)
    return () => window.removeEventListener('message', handleMessage)
  }, [])

  // Handle Authentication submit (Register/Login)
  const handleAuthSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!authEmail.trim() || !authPassword.trim()) {
      setAuthError("Email and password are required")
      return
    }

    setAuthError(null)
    setIsSubmittingAuth(true)

    const endpoint = authMode === 'login' ? '/api/auth/login' : '/api/auth/register'

    try {
      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: authEmail.trim(), password: authPassword.trim() })
      })

      const json = await res.json()
      if (!res.ok) {
        throw new Error(json.error || "Authentication failed")
      }

      if (authMode === 'register') {
        // Transition to Cognito Email Verification Step
        setVerifyEmailAddress(authEmail.trim())
        setIsVerifyingEmail(true)
        setAuthPassword("")
        alert("Verification code sent to your email! Please enter it to verify your account.")
      } else {
        // Logged in
        setUser(json.user)
        setAuthEmail("")
        setAuthPassword("")
      }
    } catch (err: any) {
      setAuthError(err.message || "An error occurred during authentication")
    } finally {
      setIsSubmittingAuth(false)
    }
  }

  // Handle Cognito confirmation code
  const handleVerifySubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!verificationCode.trim()) {
      setAuthError("Verification code is required")
      return
    }

    setAuthError(null)
    setIsSubmittingAuth(true)

    try {
      const res = await fetch("/api/auth/verify-code", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: verifyEmailAddress, code: verificationCode.trim() })
      })

      const json = await res.json()
      if (!res.ok) {
        throw new Error(json.error || "Verification failed")
      }

      alert("Account verified successfully! You can now log in with your email and password.")
      setIsVerifyingEmail(false)
      setAuthMode("login")
      setVerificationCode("")
    } catch (err: any) {
      setAuthError(err.message || "An error occurred during verification")
    } finally {
      setIsSubmittingAuth(false)
    }
  }

  const handleLogout = async () => {
    try {
      await fetch("/api/auth/logout", { method: "POST" })
      setUser(null)
      setFiles({})
      setiframeURL(null)
      setSelectedFile("")
      setEditorContent("")
      setLogs([])
      setMessages([
        {
          id: 'welcome',
          role: 'assistant',
          content: "Hello! I'm your AI web developer. Tell me what you'd like to build today, and I'll generate the HTML, CSS, and React components for you. You can preview and edit the code in the right panel.",
          timestamp: new Date()
        }
      ])
    } catch (err) {
      console.error("Logout failed:", err)
    }
  }

  // Handle Payment Checkouts
  const handleCheckout = async () => {
    setIsPaying(true)
    try {
      const res = await fetch("/api/payment/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tier: selectedTier })
      })

      const json = await res.json()
      if (!res.ok) {
        throw new Error(json.error || "Payment processing failed")
      }

      if (json.mode === "stripe" && json.url) {
        window.location.href = json.url
        return
      }

      if (json.mode === "mock") {
        setUser(prev => prev ? { ...prev, tokenBalance: json.tokenBalance } : null)
        alert(`Payment Success! ${json.tokensCredited.toLocaleString()} tokens have been credited to your account.`)
        setIsPaymentModalOpen(false)
      }
    } catch (err: any) {
      alert(`Payment Error: ${err.message}`)
    } finally {
      setIsPaying(false)
    }
  }

  const handleFileSelect = (fileName: string) => {
    setSelectedFile(fileName)
    setEditorContent(files[fileName] || "")
  }

  const handleEditorChange = async (value: string | undefined) => {
    if (value !== undefined) {
      setEditorContent(value)
      
      const updatedFiles = {
        ...files,
        [selectedFile]: value
      }
      setFiles(updatedFiles)
      
      try {
        setError(null)
        const url = await transformHtml(updatedFiles)
        setiframeURL(url)
      } catch (err: any) {
        console.error("Live reload transform error:", err)
        setError(err.message || "Failed to compile JSX changes.")
      }
    }
  }

  const getStepText = (step: number) => {
    switch(step) {
      case 1: return `Consulting ${selectedModel} reasoning brain...`
      case 2: return "Generating React architecture..."
      case 3: return "Compiling JSX via Wasm SWC..."
      case 4: return "Assembling sandboxed live preview..."
      default: return "AI is coding..."
    }
  }

  const handleGenerate = async (refine: { refine: boolean }) => {
    const promptToSend = prompt.trim()
    if (!promptToSend && !refine.refine) return

    setIsGenerating(true)
    setGenerationStep(1)
    setError(null)
    setLogs([])

    // Check if user has tokens
    if (user && user.tokenBalance <= 0) {
      setIsGenerating(false)
      setIsPaymentModalOpen(true)
      return
    }

    // 1. Add User Message to Chat Feed
    const userMsgId = Math.random().toString()
    const userMessage: ChatMessage = {
      id: userMsgId,
      role: 'user',
      content: promptToSend || "Refine the application styling and details",
      timestamp: new Date()
    }
    setMessages(prev => [...prev, userMessage])

    // 2. Add AI placeholder loading message to Chat Feed
    const assistantMsgId = Math.random().toString()
    const loadingMessage: ChatMessage = {
      id: assistantMsgId,
      role: 'assistant',
      content: getStepText(1),
      timestamp: new Date(),
      status: 'loading'
    }
    setMessages(prev => [...prev, loadingMessage])
    setPrompt("")

    try {
      const isRefinement = refine.refine && Object.keys(files).length > 0
      const endpoint = isRefinement ? '/api/fix-code' : '/api/post-message'

      // For refinements: send the prompt + current files as separate fields.
      // The fix-code API builds the full context prompt server-side.
      // For new generations: just send the prompt to post-message.
      const requestBody = isRefinement
        ? {
            prompt: promptToSend || 'Refine the styling, details, or improve functionality.',
            files,
            model: selectedModel,
          }
        : {
            prompt: promptToSend,
            model: selectedModel,
          }

      const responsePromise = fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody),
      })


      const stepInterval = setInterval(() => {
        setGenerationStep(prev => {
          if (prev < 2) {
            const nextStep = prev + 1
            setMessages(msgs => msgs.map(m => m.id === assistantMsgId ? { ...m, content: getStepText(nextStep) } : m))
            return nextStep
          }
          return prev
        })
      }, 3500)

      const res = await responsePromise
      clearInterval(stepInterval)

      const json = await res.json()
      if (!res.ok) {
        if (res.status === 402) {
          setIsPaymentModalOpen(true)
        }
        throw new Error(json.error || `Server returned ${res.status}`)
      }

      setGenerationStep(3)
      setMessages(msgs => msgs.map(m => m.id === assistantMsgId ? { ...m, content: getStepText(3) } : m))

      const { parsedContent, tokenBalance } = json
      if (tokenBalance !== undefined) {
        setUser(prev => prev ? { ...prev, tokenBalance } : null)
      }

      if (!parsedContent || Object.keys(parsedContent).length === 0) {
        throw new Error("No files were returned by the AI generator.")
      }

      // Parse output files atomically
      const newFiles: Record<string, string> = {}
      for (const [fileName, fileData] of Object.entries(parsedContent) as [string, any][]) {
        let code = fileData.code || ""
        if (code.includes('\\n') || code.includes('\\"')) {
          code = unescapeLiteral(code)
        }
        newFiles[fileName] = code
      }

      setFiles(newFiles)

      // Automatically select default file
      let defaultFile = "App.jsx"
      if (!newFiles[defaultFile]) {
        defaultFile = Object.keys(newFiles)[0] || ""
      }
      if (defaultFile) {
        setSelectedFile(defaultFile)
        setEditorContent(newFiles[defaultFile])
      }

      // ── Self-healing compilation loop ────────────────────────────────────
      // If the wasm JSX compiler fails, automatically ask the AI to fix the
      // broken code and retry — up to MAX_REPAIR_ATTEMPTS times.
      const MAX_REPAIR_ATTEMPTS = 3
      let compiledUrl: string | null = null
      let currentFiles = { ...newFiles }
      let lastCompileError: string | null = null

      for (let attempt = 0; attempt <= MAX_REPAIR_ATTEMPTS; attempt++) {
        try {
          compiledUrl = await transformHtml(currentFiles)
          lastCompileError = null
          break // success!
        } catch (compileErr: any) {
          lastCompileError = compileErr.message || String(compileErr)
          console.warn(`Compile attempt ${attempt + 1} failed:`, lastCompileError)

          if (attempt === MAX_REPAIR_ATTEMPTS) break // give up after max retries

          // Notify the user we are auto-repairing
          setMessages(msgs => msgs.map(m => m.id === assistantMsgId ? {
            ...m,
            content: `🔧 Compilation error — auto-repairing (attempt ${attempt + 1}/${MAX_REPAIR_ATTEMPTS})…`,
            status: 'loading'
          } : m))

          const repairPrompt = `Fix this JSX/TSX so it compiles correctly with SWC.\n\nCompilation error: ${lastCompileError}\n\nRules: no import statements, React is a global, ES5-compatible syntax only, valid JSX.`

          try {
            const fixRes = await fetch('/api/fix-code', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ prompt: repairPrompt, files: currentFiles, model: selectedModel })
            })
            const fixJson = await fixRes.json()
            if (fixRes.ok && fixJson.parsedContent) {
              const repairedFiles: Record<string, string> = {}
              for (const [fname, fdata] of Object.entries(fixJson.parsedContent) as [string, any][]) {
                repairedFiles[fname] = fdata.code || ''
              }
              currentFiles = repairedFiles
            }
          } catch (fixErr) {
            console.error('Auto-repair API call failed:', fixErr)
          }
        }
      }

      if (!compiledUrl) {
        throw new Error(`JSX compilation failed after ${MAX_REPAIR_ATTEMPTS} auto-repair attempts. Last error: ${lastCompileError}`)
      }

      // Update files state with the final (possibly repaired) files
      setFiles(currentFiles)
      const finalDefault = currentFiles['App.jsx'] ? 'App.jsx' : Object.keys(currentFiles)[0] || ''
      if (finalDefault) {
        setSelectedFile(finalDefault)
        setEditorContent(currentFiles[finalDefault])
      }

      setiframeURL(compiledUrl)
      
      setMessages(msgs => msgs.map(m => m.id === assistantMsgId ? {
        ...m,
        content: lastCompileError
          ? `⚠️ Fixed after auto-repair! The AI corrected a compilation issue. Check the live preview.`
          : `I've successfully updated your application! You can check the live view and inspect files in the editor.`,
        status: 'success',
        files: currentFiles
      } : m))

      setActiveTab('preview')
      setIsGenerating(false)
      setGenerationStep(0)
    } catch (err: any) {
      console.error("API or Build Error:", err)
      setError(err.message || "An unexpected error occurred.")
      
      setMessages(msgs => msgs.map(m => m.id === assistantMsgId ? {
        ...m,
        content: `Sorry, I ran into an error: ${err.message || "Unexpected compilation crash."}`,
        status: 'error'
      } : m))

      setIsGenerating(false)
      setGenerationStep(0)
    }
  }


  const handleClear = () => {
    if (confirm("Are you sure you want to reset the builder? All progress and code changes will be lost.")) {
      setPrompt("")
      setiframeURL(null)
      setFiles({})
      setSelectedFile("")
      setEditorContent("")
      setError(null)
      setLogs([])
      setMessages([
        {
          id: 'welcome',
          role: 'assistant',
          content: "Hello! I'm your AI web developer. Tell me what you'd like to build today, and I'll generate the HTML, CSS, and React components for you. You can preview and edit the code in the right panel.",
          timestamp: new Date()
        }
      ])
      setActiveTab('preview')
    }
  }

  const handleCopyCode = () => {
    if (editorContent) {
      navigator.clipboard.writeText(editorContent)
      alert("Copied code to clipboard!")
    }
  }

  const router = useRouter()

  // --- RENDERING BRANCHES ---

  if (isAuthLoading) {
    return (
      <div style={{
        position: "fixed", inset: 0,
        background: "#080d1a",
        display: "flex", alignItems: "center", justifyContent: "center",
        flexDirection: "column", gap: 12,
      }}>
        <div style={{
          width: 32, height: 32,
          border: "3px solid rgba(124,58,237,.2)",
          borderTopColor: "#7c3aed",
          borderRadius: "50%",
          animation: "spin .8s linear infinite",
        }} />
        <span style={{ fontSize: 13, color: "rgba(148,163,184,.6)", fontFamily: "system-ui" }}>
          Checking session…
        </span>
        <style>{"@keyframes spin{to{transform:rotate(360deg)}}"}</style>
      </div>
    )
  }

  // Redirect unauthenticated users to the dedicated login page
  if (!user) {
    router.replace("/login")
    return null
  }

  // Dashboard View (Authenticated)
  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 flex flex-col font-sans selection:bg-violet-600/10">
      
      {/* Light Header with Cognito Badges */}
      <header className="border-b border-slate-200 bg-white px-6 py-3 shrink-0 shadow-sm">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          
          <div className="flex items-center space-x-2.5">
            <div className="w-8 h-8 bg-gradient-to-tr from-violet-600 to-indigo-650 rounded-lg flex items-center justify-center shadow-sm">
              <Sparkles className="w-4.5 h-4.5 text-white" />
            </div>
            <div>
              <h1 className="text-sm font-bold tracking-tight text-slate-900">
                Vibe Coder
              </h1>
            </div>
          </div>

          {/* User profile & token badges */}
          <div className="flex items-center space-x-3">
            <div 
              onClick={() => setIsPaymentModalOpen(true)}
              className="flex items-center space-x-1.5 bg-violet-50 hover:bg-violet-100/80 border border-violet-100/80 text-violet-700 px-3 py-1.5 rounded-xl text-xs font-semibold cursor-pointer transition-all shadow-sm"
              title="Click to recharge tokens"
            >
              <Coins className="w-3.5 h-3.5" />
              <span>Tokens: {user.tokenBalance.toLocaleString()}</span>
            </div>

            <div className="flex items-center space-x-2 pl-2 border-l border-slate-200">
              <div className="hidden md:flex flex-col text-right">
                <span className="text-[11px] font-bold text-slate-700 leading-tight">{user.email}</span>
        
              </div>
              <button
                onClick={handleLogout}
                className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all"
                title="Log Out"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Workspace Split (2 Pane Split) */}
      <div className="flex-1 max-w-7xl w-full mx-auto p-4 lg:p-6 grid grid-cols-1 lg:grid-cols-12 gap-6 overflow-hidden h-[calc(100vh-62px)]">
        
        {/* Left Column: Chat Conversation Stream */}
        <div className="lg:col-span-4 flex flex-col h-full overflow-hidden">
          <Card className="flex-1 flex flex-col bg-white border-slate-200 shadow-sm rounded-2xl overflow-hidden h-full">
            
            {/* Column Header & Model Selector */}
            <div className="px-4 py-2.5 bg-slate-50/60 border-b border-slate-200/80 flex items-center justify-between shrink-0">
              <div className="flex items-center space-x-2">
                <Terminal className="w-3.5 h-3.5 text-violet-600 font-semibold" />
                <span className="font-bold text-xs text-slate-700 uppercase tracking-wide">Builder Feed</span>
              </div>

              {/* Model Dropdown Selection */}
              <div className="flex items-center space-x-1.5">
                <label className="text-[9px] text-slate-400 font-mono font-semibold uppercase">Model:</label>
                <select
                  value={selectedModel}
                  onChange={(e) => setSelectedModel(e.target.value)}
                  className="bg-white border border-slate-250 rounded-md text-[10px] font-semibold py-1 px-1.5 focus:outline-none focus:border-violet-500 text-slate-705 shadow-sm"
                >
                  {AI_MODELS.map(model => (
                    <option key={model.id} value={model.id}>{model.id}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Message Stream */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-50/20 scrollbar-thin">
              {messages.map((msg) => {
                const isAI = msg.role === 'assistant'
                return (
                  <div 
                    key={msg.id} 
                    className={`flex items-start space-x-2.5 ${isAI ? 'mr-auto max-w-[88%]' : 'ml-auto flex-row-reverse space-x-reverse max-w-[88%]'}`}
                  >
                    <div className={`w-7.5 h-7.5 rounded-lg flex items-center justify-center shrink-0 border shadow-sm ${
                      isAI 
                        ? 'bg-violet-50 border-violet-100 text-violet-600' 
                        : 'bg-slate-100 border-slate-200 text-slate-650'
                    }`}>
                      {isAI ? <Bot className="w-4 h-4" /> : <User className="w-4 h-4" />}
                    </div>

                    <div className={`p-3 rounded-2xl text-xs leading-relaxed shadow-sm border ${
                      isAI 
                        ? 'bg-white border-slate-200 text-slate-800 rounded-tl-sm' 
                        : 'bg-violet-600 border-violet-750 text-white rounded-tr-sm shadow-violet-500/5'
                    }`}>
                      {msg.status === 'loading' ? (
                        <div className="flex items-center space-x-2 py-0.5">
                          <div className="w-3.5 h-3.5 border-2 border-slate-200 border-t-violet-600 rounded-full animate-spin" />
                          <span className="font-mono text-slate-555 animate-pulse">{msg.content}</span>
                        </div>
                      ) : (
                        <div className="whitespace-pre-wrap">{msg.content}</div>
                      )}

                      {isAI && msg.files && (
                        <div className="mt-3 pt-2.5 border-t border-slate-100">
                          <div className="text-[9px] text-slate-400 font-mono mb-1.5 uppercase font-semibold tracking-wider">Click to Inspect Code:</div>
                          <div className="flex flex-wrap gap-1.5">
                            {Object.keys(msg.files).map((name) => (
                              <button
                                key={name}
                                onClick={() => {
                                  setActiveTab('code')
                                  handleFileSelect(name)
                                }}
                                className="flex items-center px-2.5 py-1 text-[10px] font-mono bg-slate-55 hover:bg-violet-50 text-slate-600 hover:text-violet-600 border border-slate-200 hover:border-violet-300 rounded-lg transition-all"
                              >
                                <FileCode className="w-3 h-3 mr-1 text-slate-405" />
                                {name}
                              </button>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )
              })}
              
              {/* Preset prompt Pills */}
              {Object.keys(files).length === 0 && !isGenerating && (
                <div className="space-y-2 pt-4 border-t border-slate-100">
                  <div className="text-[10px] text-slate-400 uppercase font-mono tracking-wider font-semibold">Suggested Projects:</div>
                  <div className="grid grid-cols-1 gap-2">
                    {PRESET_PROMPTS.map((preset, idx) => (
                      <button
                        key={idx}
                        onClick={() => setPrompt(preset.text)}
                        className="text-left text-xs p-2.5 rounded-xl bg-white border border-slate-205 hover:border-violet-300 hover:bg-violet-50/20 transition-all text-slate-600 hover:text-slate-900 shadow-sm"
                      >
                        <div className="font-bold text-[11px] text-slate-800 mb-0.5">{preset.label}</div>
                        <div className="text-[10px] text-slate-500 leading-normal line-clamp-1">{preset.text}</div>
                      </button>
                    ))}
                  </div>
                </div>
              )}
              
              <div ref={messagesEndRef} />
            </div>

            {/* Prompt Form Input (Pinned to bottom) */}
            <div className="p-3 bg-white border-t border-slate-200 shrink-0">
              <div className="flex flex-col space-y-2">
                
                {user.tokenBalance <= 0 && (
                  <div className="p-2 bg-amber-50 border border-amber-250 text-amber-700 text-[11px] rounded-lg flex items-center justify-between animate-pulse">
                    <span>You've run out of tokens. Recharge to continue.</span>
                    <button 
                      onClick={() => setIsPaymentModalOpen(true)}
                      className="underline font-bold text-violet-755 focus:outline-none"
                    >
                      Buy Tokens
                    </button>
                  </div>
                )}

                <Textarea
                  placeholder={user.tokenBalance <= 0 ? "Please purchase tokens to send a prompt..." : "Describe your design or specify bugs to fix..."}
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  disabled={user.tokenBalance <= 0}
                  onKeyDown={async (e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault()
                      if (user.tokenBalance > 0) {
                        await handleGenerate({ refine: Object.keys(files).length > 0 })
                      }
                    }
                  }}
                  className="w-full bg-slate-50/60 border-slate-205 hover:border-slate-350 focus-visible:ring-1 focus-visible:ring-violet-500 rounded-xl text-xs min-h-[56px] max-h-[120px] p-2.5 resize-none placeholder:text-slate-400 text-slate-800 shadow-inner disabled:bg-slate-100/50 disabled:cursor-not-allowed"
                />
                <Button 
                  onClick={() => handleGenerate({ refine: Object.keys(files).length > 0 })} 
                  disabled={!prompt.trim() || isGenerating || user.tokenBalance <= 0} 
                  className="w-full bg-violet-600 hover:bg-violet-700 text-white text-xs font-semibold py-2.5 rounded-xl shadow-sm transition-all flex items-center justify-center disabled:bg-slate-200 disabled:text-slate-450"
                >
                  {isGenerating ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 mr-2 animate-spin" />
                      AI Coding ({selectedModel})...
                    </>
                  ) : (
                    <>
                      <Send className="w-3.5 h-3.5 mr-2" />
                      {Object.keys(files).length > 0 ? "Apply to Code" : "Build Project"}
                    </>
                  )}
                </Button>
              </div>
            </div>
          </Card>
        </div>

        {/* Right Column: Code Editor & Preview Tab Pane */}
        <div className="lg:col-span-8 flex flex-col h-full overflow-hidden">
          <Card className="flex-1 flex flex-col bg-white border-slate-200 shadow-sm rounded-2xl overflow-hidden h-full">
            
            {/* Header: Toggle buttons between Preview & Code tabs */}
            <div className="px-4 py-2 bg-white border-b border-slate-200/80 flex items-center justify-between shrink-0">
              
              {/* Double Tab Switcher */}
              <div className="flex items-center space-x-1 bg-slate-100 p-0.5 rounded-lg border border-slate-200">
                <button
                  onClick={() => setActiveTab('preview')}
                  className={`flex items-center px-4.5 py-1.5 rounded-md text-xs font-medium transition-all ${
                    activeTab === 'preview'
                      ? 'bg-white text-violet-600 shadow-sm font-semibold'
                      : 'text-slate-500 hover:text-slate-800'
                  }`}
                >
                  <Eye className="w-3.5 h-3.5 mr-1.5" />
                  Live Preview
                </button>
                <button
                  onClick={() => setActiveTab('code')}
                  className={`flex items-center px-4.5 py-1.5 rounded-md text-xs font-medium transition-all ${
                    activeTab === 'code'
                      ? 'bg-white text-violet-600 shadow-sm font-semibold'
                      : 'text-slate-500 hover:text-slate-800'
                  }`}
                >
                  <Code className="w-3.5 h-3.5 mr-1.5" />
                  Code Editor
                </button>
              </div>

              {/* Header Right Panel Tools */}
              {Object.keys(files).length > 0 && (
                <div className="flex items-center space-x-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => downloadFiles(files)}
                    className="bg-white hover:bg-slate-50 border-slate-250 text-slate-655 hover:text-slate-850 text-[10px] px-3.5 py-1.5 rounded-lg font-medium shadow-sm transition-all"
                  >
                    <Download className="w-3.5 h-3.5 mr-1 text-slate-450" />
                    ZIP
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleClear}
                    className="bg-white hover:bg-red-50 hover:border-red-205 border-slate-255 text-slate-500 hover:text-red-650 text-[10px] px-3.5 py-1.5 rounded-lg transition-all shadow-sm"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </Button>
                </div>
              )}
            </div>

            {/* Dynamic Content Pane Area */}
            <div className="flex-1 relative overflow-hidden bg-slate-50 flex flex-col">
              
              {/* PREVIEW VIEW */}
              {activeTab === 'preview' && (
                <div className="flex-1 flex flex-col min-h-0 bg-slate-100 overflow-hidden">
                  
                  {/* Viewport Control bar */}
                  {iframeURL && (
                    <div className="p-2 border-b border-slate-200 bg-white/70 backdrop-blur-sm flex items-center justify-between shrink-0">
                      <span className="text-[10px] text-slate-400 font-mono font-medium uppercase px-2">Viewport Scaling:</span>
                      <div className="flex items-center space-x-1">
                        <div className="flex items-center bg-slate-100 p-0.5 rounded-lg border border-slate-200">
                          <button
                            onClick={() => setDevice('desktop')}
                            className={`p-1 rounded transition-all ${
                              device === 'desktop' ? 'bg-white text-violet-600 shadow-sm' : 'text-slate-505 hover:text-slate-800'
                            }`}
                            title="Desktop layout"
                          >
                            <Monitor className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => setDevice('tablet')}
                            className={`p-1 rounded transition-all ${
                              device === 'tablet' ? 'bg-white text-violet-600 shadow-sm' : 'text-slate-505 hover:text-slate-800'
                            }`}
                            title="Tablet layout"
                          >
                            <Tablet className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => setDevice('mobile')}
                            className={`p-1 rounded transition-all ${
                              device === 'mobile' ? 'bg-white text-violet-600 shadow-sm' : 'text-slate-505 hover:text-slate-800'
                            }`}
                            title="Mobile layout"
                          >
                            <Smartphone className="w-3.5 h-3.5" />
                          </button>
                        </div>
                        <a
                          href={iframeURL}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="p-1.5 rounded bg-slate-100 border border-slate-200 text-slate-500 hover:text-slate-805 transition-all"
                          title="Open preview in new tab"
                        >
                          <ExternalLink className="w-3.5 h-3.5" />
                        </a>
                      </div>
                    </div>
                  )}

                  {/* Iframe content viewport area */}
                  <div className="flex-1 overflow-auto flex items-center justify-center p-4 relative">
                    {error ? (
                      <div className="w-full max-w-md flex flex-col items-center justify-center p-6 text-center text-red-500 bg-white border border-red-200 shadow-sm rounded-2xl overflow-auto max-h-full">
                        <AlertCircle className="w-8 h-8 mb-2 text-red-500" />
                        <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800 mb-1.5">Compilation Error</h3>
                        <pre className="text-[10px] p-3 bg-slate-900 border border-slate-950 rounded-lg max-w-full overflow-x-auto text-left font-mono whitespace-pre-wrap leading-relaxed text-red-300 select-text shadow-inner">
                          {error}
                        </pre>
                        <Button 
                          onClick={() => handleGenerate({ refine: true })} 
                          className="mt-4 bg-red-55 hover:bg-red-100 text-red-650 hover:text-red-700 border border-red-205 shadow-sm text-xs font-semibold px-4 py-2 rounded-xl transition-all"
                        >
                          <RefreshCw className="w-3.5 h-3.5 mr-1.5" />
                          Repair with AI
                        </Button>
                      </div>
                    ) : iframeURL ? (
                      <div className={`transition-all duration-300 overflow-hidden relative shadow-md bg-white border border-slate-200/80 ${
                        device === 'mobile' 
                          ? 'w-[375px] h-[520px] border-[10px] border-slate-800 rounded-3xl' 
                          : device === 'tablet' 
                          ? 'w-[560px] h-[660px] max-h-full border-[10px] border-slate-800 rounded-3xl'
                          : 'w-full h-full border-0 rounded-xl'
                      }`}>
                        {device !== 'desktop' && (
                          <div className="absolute top-0 left-1/2 transform -translate-x-1/2 w-24 h-4 bg-slate-805 rounded-b-xl z-20 flex items-center justify-center">
                            <div className="w-8 h-1 bg-slate-900 rounded-full" />
                          </div>
                        )}
                        <iframe
                          src={iframeURL}
                          ref={iframeRef}
                          className="w-full h-full border-0 bg-white"
                          title="Sandbox Iframe View"
                        />
                      </div>
                    ) : (
                      <div className="text-center p-6 text-slate-400">
                        <Sparkles className="w-8 h-8 mx-auto mb-2.5 text-slate-355" />
                        <p className="text-xs font-bold text-slate-600 mb-1">Sandbox Preview</p>
                        <p className="text-[10px] text-slate-500 max-w-[200px]">A fully interactive live view will load here once compiled.</p>
                      </div>
                    )}
                  </div>

                  {/* Sandboxed Console panel */}
                  <div className={`border-t border-slate-200 bg-white transition-all duration-350 flex flex-col shrink-0 ${
                    isConsoleCollapsed ? "h-[32px]" : "h-[140px]"
                  }`}>
                    <div 
                      onClick={() => setIsConsoleCollapsed(!isConsoleCollapsed)}
                      className="flex items-center justify-between px-4 py-1.5 border-b border-slate-202 cursor-pointer bg-slate-50/50 hover:bg-slate-50 transition-all select-none"
                    >
                      <div className="flex items-center space-x-2 text-[10px] uppercase font-bold tracking-wider text-slate-500">
                        <Terminal className="w-3.5 h-3.5 text-slate-400" />
                        <span>Console Output</span>
                        <span className="bg-slate-200 border border-slate-300 text-slate-600 text-[9px] px-1.5 py-0.5 rounded-full font-mono font-medium">
                          {logs.length}
                        </span>
                      </div>
                      <div className="flex items-center space-x-3">
                        <button 
                          onClick={(e) => {
                            e.stopPropagation()
                            setLogs([])
                          }}
                          className="text-slate-450 hover:text-slate-755 text-[9px] uppercase font-bold font-mono px-2 py-0.5 hover:bg-slate-202 rounded transition-all"
                        >
                          Clear
                        </button>
                        <span className="text-slate-400 text-xs font-mono">
                          {isConsoleCollapsed ? "▲" : "▼"}
                        </span>
                      </div>
                    </div>
                    
                    {!isConsoleCollapsed && (
                      <div className="flex-1 overflow-y-auto p-3 font-mono text-[10px] space-y-1 bg-slate-955 select-text scrollbar-thin">
                        {logs.length === 0 ? (
                          <div className="text-slate-600 italic text-center pt-6 text-[11px]">Telemetry logs and iframe console triggers will output here.</div>
                        ) : (
                          logs.map((log, index) => (
                            <div key={index} className="flex items-start space-x-2 py-0.5 border-b border-zinc-900/50 hover:bg-zinc-900/20">
                              <span className="text-zinc-650 select-none shrink-0 font-light text-[8.5px] pt-0.5">{log.timestamp}</span>
                              <span className={`shrink-0 font-bold select-none text-[9px] ${
                                log.type === 'error' ? 'text-red-505' :
                                log.type === 'warn' ? 'text-yellow-505' :
                                'text-blue-400'
                              }`}>
                                [{log.type.toUpperCase()}]
                              </span>
                              <span className={`whitespace-pre-wrap break-all ${
                                log.type === 'error' ? 'text-red-400 font-medium' :
                                log.type === 'warn' ? 'text-yellow-200' :
                                'text-zinc-305'
                              }`}>
                                {log.message}
                              </span>
                            </div>
                          ))
                        )}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* CODE EDITOR VIEW */}
              {activeTab === 'code' && (
                <div className="flex-1 flex flex-col min-h-0 bg-white">
                  
                  {/* File selector tab header */}
                  <div className="bg-slate-50 border-b border-slate-200 flex items-center overflow-x-auto shrink-0 scrollbar-none">
                    {Object.keys(files).length > 0 ? (
                      Object.keys(files).map((fileName) => {
                        const isActive = selectedFile === fileName
                        return (
                          <button
                            key={fileName}
                            onClick={() => handleFileSelect(fileName)}
                            className={`flex items-center px-4 py-2.5 text-xs border-r border-slate-200 transition-all font-mono whitespace-nowrap focus:outline-none ${
                              isActive
                                ? "bg-white text-violet-600 border-t-2 border-t-violet-500 font-semibold"
                                : "text-slate-500 hover:text-slate-850 hover:bg-slate-105/40"
                            }`}
                          >
                            <FileCode className={`w-3.5 h-3.5 mr-2 shrink-0 ${
                              fileName.endsWith('.html') ? 'text-orange-500' :
                              fileName.endsWith('.css') ? 'text-blue-500' :
                              'text-yellow-500'
                            }`} />
                            {fileName}
                          </button>
                        )
                      })
                    ) : (
                      <div className="px-4 py-2 text-[10px] text-slate-400 font-mono uppercase font-semibold">
                        No files compiled
                      </div>
                    )}
                  </div>

                  {/* Monaco Editor component */}
                  <div className="flex-1 relative bg-slate-55">
                    {selectedFile ? (
                      <MonacoEditor
                        height="100%"
                        language={selectedFile.endsWith('.jsx') ? 'javascript' : selectedFile.endsWith('.html') ? 'html' : 'css'}
                        value={editorContent}
                        onChange={async (e) => await handleEditorChange(e)}
                        theme="vs"
                        options={{
                          minimap: { enabled: false },
                          fontSize: 12.5,
                          wordWrap: 'on',
                          automaticLayout: true,
                          fontFamily: "Courier New, monospace",
                          scrollbar: {
                            verticalScrollbarSize: 8,
                            horizontalScrollbarSize: 8,
                          },
                          lineNumbersMinChars: 3,
                          padding: { top: 8 }
                        }}
                      />
                    ) : (
                      <div className="h-full flex items-center justify-center text-slate-400">
                        <div className="text-center p-6">
                          <Code className="w-8 h-8 mx-auto mb-2 text-slate-300" />
                          <p className="text-xs font-semibold text-slate-550">No File Selected</p>
                          <p className="text-[10px] text-slate-400 max-w-[200px] mt-0.5">Select a file badge from the chat list on the left to edit.</p>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </Card>
        </div>
      </div>

      {/* --- PAYMENT RECHARGE MODAL OVERLAY --- */}
      {isPaymentModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <Card className="w-full max-w-md bg-white border-slate-200 shadow-2xl rounded-2xl overflow-hidden p-6 space-y-6 animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center space-x-2 text-slate-800">
                <Coins className="w-5 h-5 text-violet-600" />
                <h3 className="font-extrabold text-sm tracking-tight">Purchase Tokens Balance</h3>
              </div>
              <button 
                onClick={() => setIsPaymentModalOpen(false)}
                className="text-slate-450 hover:text-slate-650 transition-all p-1 hover:bg-slate-105 rounded-lg"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-4">
              <div className="text-xs text-slate-500 leading-relaxed">
                Tokens are consumed based on the size of prompt payloads and AI-generated files. Select a pack below to credit your account instantly.
              </div>

              {/* Tiers list */}
              <div className="space-y-2.5">
                {[
                  { id: 'basic', label: 'Basic Pack', price: '$5.00', tokens: 100000, desc: 'Ideal for small mockups (~10 generations)' },
                  { id: 'pro', label: 'Developer Pack', price: '$10.00', tokens: 250000, desc: 'Best value for active development (~30 generations)' },
                  { id: 'mega', label: 'Enterprise Pack', price: '$20.00', tokens: 600000, desc: 'Large projects, unlimited reasoning usage' },
                ].map((tier) => {
                  const isSelected = selectedTier === tier.id
                  return (
                    <div
                      key={tier.id}
                      onClick={() => setSelectedTier(tier.id as any)}
                      className={`p-3.5 rounded-xl border-2 cursor-pointer transition-all flex justify-between items-center ${
                        isSelected 
                          ? 'border-violet-600 bg-violet-50/20' 
                          : 'border-slate-202 hover:border-slate-350 bg-white'
                      }`}
                    >
                      <div className="space-y-0.5">
                        <div className="font-extrabold text-xs text-slate-800">{tier.label}</div>
                        <div className="text-[10px] text-slate-455 leading-tight">{tier.desc}</div>
                        <div className="text-[9px] font-mono text-violet-650 font-semibold">{tier.tokens.toLocaleString()} Tokens</div>
                      </div>
                      <div className="text-right">
                        <span className="font-extrabold text-sm text-slate-900">{tier.price}</span>
                        {isSelected && (
                          <div className="text-[9px] text-violet-650 font-bold uppercase mt-0.5">Selected</div>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>

            <div className="flex items-center space-x-2.5 pt-3 border-t border-slate-100">
              <Button
                variant="outline"
                onClick={() => setIsPaymentModalOpen(false)}
                className="flex-1 bg-white hover:bg-slate-50 border-slate-205 text-slate-650 text-xs py-2.5 rounded-xl"
              >
                Cancel
              </Button>
              <Button
                onClick={handleCheckout}
                disabled={isPaying}
                className="flex-1 bg-violet-600 hover:bg-violet-750 text-white text-xs font-semibold py-2.5 rounded-xl shadow-sm transition-all flex items-center justify-center"
              >
                {isPaying ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 mr-2 animate-spin" />
                    Charging...
                  </>
                ) : (
                  <>
                    <CreditCard className="w-3.5 h-3.5 mr-1.5" />
                    Checkout Securely
                  </>
                )}
              </Button>
            </div>
          </Card>
        </div>
      )}
    </div>
  )
}
