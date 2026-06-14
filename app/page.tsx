"use client"

import { useRef, useState } from "react"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Card } from "@/components/ui/card"
import { Send, Sparkles, Code, Eye, Download, Share, Globe, Rocket } from "lucide-react"
import { Content } from "./type/AIContent"
import init from "@swc/wasm-web"
import dynamic from "next/dynamic"
import { transformJsx } from "./lib/bundling/jsx-bundler"
import { downloadFiles } from "./lib/downloadFiles"
import { createFullHTML } from "./lib/bundling/create-html"

const MonacoEditor = dynamic(() => import("@monaco-editor/react"), {
  ssr: false,
  loading: () => (
    <div className="h-full flex items-center justify-center">
      <div className="flex items-center space-x-2 text-gray-500">
        <div className="w-4 h-4 border-2 border-gray-300 border-t-transparent rounded-full animate-spin" />
        <span>Loading editor...</span>
      </div>
    </div>
  ),
})
let swcInitialized = false
const InitializeSwc = async () => {
  if (swcInitialized) return
  await init()
  swcInitialized = true
}



const addEscape = (file: string) => {
  return file
    .replace(/\\n/g, '\n')
    .replace(/\\t/g, '\t')
    .replace(/\\"/g, '"')
    .replace(/\\\\/g, '\\');
}
export default function WebBuilder() {
  const [prompt, setPrompt] = useState("")
  const [isGenerating, setIsGenerating] = useState(false)
  const [iframeURL, setiframeURL] = useState<string | null>(null)
  const [isReady, setIsReady] = useState(false)
  const iframeRef = useRef<HTMLIFrameElement | null>(null)
  const [error, setError] = useState<string | null>(null)
  let [files, setFiles] = useState<Record<string, string>>({})
  const [projectId, setProjectId] = useState<string | null>(null)
  const [deploymentUrl, setDeploymentUrl] = useState<string | null>(null)
  const [isDeploying, setIsDeploying] = useState(false)

  const [selectedFile, setSelectedFile] = useState<string>("")
  const [editorContent, setEditorContent] = useState<string>("")
  const [showDomainModal, setShowDomainModal] = useState(false)
  const [customDomain, setCustomDomain] = useState("")
  const [domainInstructions, setDomainInstructions] = useState<any>(null)

  const handleFileSelect = (fileName: string) => {
    setSelectedFile(fileName)
    setEditorContent(files[fileName] || "")
  }

  const handleEditorChange = (value: string | undefined) => {
    if (value !== undefined) {
      setEditorContent(value)
      setFiles(prev => ({
        ...prev,
        [selectedFile]: value
      }))
    }
  }



  const handleGenerate = async () => {
    if (!prompt.trim()) return

    setIsGenerating(true)

    const res = await fetch('/api/post-message', {
      method: "POST",
      body: JSON.stringify({ prompt: prompt })
    })

    const json = await res.json()
    const { parsedContent }: { parsedContent: Content } = json
    const processedFiles: Record<string, string> = {}
    await InitializeSwc()
    for (const [fileName, fileData] of Object.entries(parsedContent)) {
      let { code } = fileData
      //code = unescape(code)
      setFiles((prev) => ({ ...prev, [fileName]: code }))

      if (fileName.endsWith(".jsx")) {

        const transformed = await transformJsx(code)
        processedFiles[fileName.replace('.jsx', '.js')] = transformed
      } else {
        const unescapedCode = code
          .replace(/\\n/g, '\n')
          .replace(/\\t/g, '\t')
          .replace(/\\"/g, '"')
          .replace(/\\\\/g, '\\');
        processedFiles[fileName] = unescapedCode
      }
    }

    const html = createFullHTML(processedFiles)
    const blob = new Blob([html], { type: "text/html" })
    const url = URL.createObjectURL(blob)

    setIsGenerating(false)
    setiframeURL(url!)
    setIsReady(true)
  }

  const handleClear = () => {
    setPrompt("")
    setiframeURL("")
  }

  const handleDeploy = async (type: 'static' | 'vercel' = 'static') => {
    if (Object.keys(files).length === 0) return
    
    setIsDeploying(true)
    setError(null)
    
    try {
      let currentProjectId = projectId
      
      // Create project if not exists
      if (!currentProjectId) {
        const createRes = await fetch('/api/projects', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: prompt.slice(0, 50) || 'Untitled Project',
            userId: 'anonymous',
            files,
          }),
        })
        
        const createData = await createRes.json()
        if (!createRes.ok) throw new Error(createData.error)
        
        currentProjectId = createData.projectId
        setProjectId(currentProjectId)
      } else {
        // Update project files
        await fetch(`/api/projects/${currentProjectId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ files }),
        })
      }
      
      // Deploy
      const deployRes = await fetch(`/api/projects/${currentProjectId}/deploy`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type }),
      })
      
      const deployData = await deployRes.json()
      if (!deployRes.ok) throw new Error(deployData.error)
      
      setDeploymentUrl(deployData.deploymentUrl)
    } catch (err: any) {
      setError(err.message)
    } finally {
      setIsDeploying(false)
    }
  }

  const handleAddDomain = async () => {
    if (!projectId || !customDomain) return
    
    try {
      const res = await fetch(`/api/projects/${projectId}/domains`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ domain: customDomain }),
      })
      
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      
      setDomainInstructions(data.instructions)
    } catch (err: any) {
      setError(err.message)
    }
  }

  return (
    <>
      <div className="min-h-screen bg-gray-50">
        {/* Header */}
        <header className="border-b bg-white">
          <div className="container mx-auto px-4 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <div className="w-8 h-8 bg-black rounded-lg flex items-center justify-center">
                  <Sparkles className="w-5 h-5 text-white" />
                </div>
                <h1 className="text-xl font-bold">AI Web Builder</h1>
              </div>
              <div className="flex items-center space-x-2">
                {deploymentUrl && (
                  <>
                    <a 
                      href={deploymentUrl} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="text-sm text-blue-600 hover:underline flex items-center"
                    >
                      <Globe className="w-4 h-4 mr-1" />
                      {deploymentUrl.replace('https://', '')}
                    </a>
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      onClick={() => setShowDomainModal(true)}
                    >
                      <Globe className="w-4 h-4 mr-1" />
                      Custom Domain
                    </Button>
                  </>
                )}
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={() => handleDeploy('static')}
                  disabled={isDeploying || Object.keys(files).length === 0}
                >
                  {isDeploying ? (
                    <div className="w-4 h-4 border-2 border-gray-400 border-t-transparent rounded-full animate-spin mr-2" />
                  ) : (
                    <Rocket className="w-4 h-4 mr-2" />
                  )}
                  Deploy
                </Button>
                <Button variant="outline" size="sm" onClick={() => downloadFiles(files)}>
                  <Download className="w-4 h-4 mr-2" />
                  Download
                </Button>
              </div>
            </div>
          </div>
        </header>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 mx-4 mt-4 rounded">
            {error}
          </div>
        )}

        {/* Domain Modal */}
        {showDomainModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
              <h3 className="text-lg font-semibold mb-4">Add Custom Domain</h3>
              
              {domainInstructions ? (
                <div className="space-y-4">
                  <div className="bg-gray-50 p-4 rounded text-sm">
                    <p className="font-medium mb-2">DNS Configuration Required:</p>
                    <p className="text-gray-600 mb-2">{domainInstructions.message}</p>
                    <div className="bg-white p-3 rounded border font-mono text-xs">
                      <div className="grid grid-cols-2 gap-2 mb-2">
                        <span className="text-gray-500">Type:</span>
                        <span>{domainInstructions.type}</span>
                      </div>
                      <div className="grid grid-cols-2 gap-2 mb-2">
                        <span className="text-gray-500">Name:</span>
                        <span>{domainInstructions.name}</span>
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <span className="text-gray-500">Value:</span>
                        <span className="break-all">{domainInstructions.value}</span>
                      </div>
                    </div>
                  </div>
                  <Button className="w-full" onClick={() => {setShowDomainModal(false); setDomainInstructions(null)}}>
                    Done
                  </Button>
                </div>
              ) : (
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium mb-1">Domain</label>
                    <input
                      type="text"
                      placeholder="yourdomain.com"
                      value={customDomain}
                      onChange={(e) => setCustomDomain(e.target.value)}
                      className="w-full px-3 py-2 border rounded-md text-sm"
                    />
                  </div>
                  <div className="flex space-x-2">
                    <Button className="flex-1" onClick={handleAddDomain} disabled={!customDomain}>
                      Add Domain
                    </Button>
                    <Button variant="outline" onClick={() => setShowDomainModal(false)}>
                      Cancel
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        <div className="container mx-auto px-4 py-6">
          <div className="grid lg:grid-cols-3 gap-6 h-[calc(100vh-120px)]">
            {/* Prompt Panel */}
            <Card className="flex flex-col">
              <div className="p-4 border-b">
                <div className="flex items-center space-x-2">
                  <Code className="w-5 h-5" />
                  <h2 className="font-semibold">Prompt</h2>
                </div>
              </div>

              <div className="flex-1 p-4 flex flex-col">
                <div className="flex-1 mb-4">
                  <Textarea
                    placeholder="Describe the website you want to build... 

Examples:
• Create a modern landing page for a SaaS product
• Build a dashboard with charts and analytics
• Design a blog homepage with featured articles
• Make a portfolio website for a designer"
                    value={prompt}
                    onChange={(e) => setPrompt(e.target.value)}
                    className="h-full resize-none text-sm"
                  />
                </div>

                <div className="flex space-x-2">
                  <Button onClick={handleGenerate} disabled={!prompt.trim() || isGenerating} className="flex-1">
                    {isGenerating ? (
                      <>
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                        Generating...
                      </>
                    ) : (
                      <>
                        <Send className="w-4 h-4 mr-2" />
                        Generate
                      </>
                    )}
                  </Button>
                  <Button variant="outline" onClick={handleClear}>
                    Clear
                  </Button>
                </div>

                {/* File List */}
                {Object.keys(files).length > 0 && (
                  <div className="mt-4">
                    <h3 className="text-sm font-medium mb-2">Files:</h3>
                    <div className="space-y-1">
                      {Object.keys(files).map((fileName) => (
                        <button
                          key={fileName}
                          onClick={() => handleFileSelect(fileName)}
                          className={`w-full text-left px-2 py-1 text-sm rounded ${selectedFile === fileName
                            ? 'bg-blue-100 text-blue-900'
                            : 'hover:bg-gray-100'
                            }`}
                        >
                          {fileName}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </Card>

            {/* Code Editor Panel */}
            <Card className="flex flex-col">
              <div className="p-4 border-b">
                <div className="flex items-center space-x-2">
                  <Code className="w-5 h-5" />
                  <h2 className="font-semibold">
                    {selectedFile || "Code Editor"}
                  </h2>
                </div>
              </div>

              <div className="flex-1">
                {selectedFile ? (
                  <MonacoEditor
                    height="100%"
                    language={selectedFile.endsWith('.jsx') ? 'javascript' : selectedFile.endsWith('.html') ? 'html' : 'css'}
                    value={editorContent}
                    onChange={handleEditorChange}
                    theme="vs-dark"
                    options={{
                      minimap: { enabled: false },
                      fontSize: 14,
                      wordWrap: 'on',
                      automaticLayout: true,
                    }}
                  />
                ) : (
                  <div className="h-full flex items-center justify-center text-gray-500">
                    <div className="text-center">
                      <Code className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                      <p className="text-lg font-medium mb-2">No file selected</p>
                      <p className="text-sm">Generate code first, then select a file to edit</p>
                    </div>
                  </div>
                )}
              </div>
            </Card>

            {/* Preview Panel */}
            <Card className="flex flex-col">
              <div className="p-4 border-b">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <Eye className="w-5 h-5" />
                    <h2 className="font-semibold">Preview</h2>
                  </div>
                  <div className="flex items-center space-x-2">
                    <div className="flex items-center space-x-1">
                      <div className="w-3 h-3 rounded-full bg-red-500"></div>
                      <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
                      <div className="w-3 h-3 rounded-full bg-green-500"></div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex-1 bg-gray-100">
                {iframeURL ? (
                  <iframe
                    src={iframeURL}
                    ref={iframeRef}
                    className="w-full h-full border-0"
                    title="Generated Website Preview"
                  />
                ) : (
                  <div className="h-full flex items-center justify-center text-gray-500">
                    <div className="text-center">
                      <Sparkles className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                      <p className="text-lg font-medium mb-2">Ready to build</p>
                      <p className="text-sm">Enter a prompt to generate your website</p>
                    </div>
                  </div>
                )}
              </div>
            </Card>
          </div>
        </div>
      </div>
    </>
  )
}
