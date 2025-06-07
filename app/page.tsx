"use client"

import { useEffect, useRef, useState } from "react"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Card } from "@/components/ui/card"
import { Send, Sparkles, Code, Eye, Download, Share } from "lucide-react"
import path from "path"
import { Content } from "./type/AIContent"
import init, { transform } from "@swc/wasm-web"
let swcInitialized = false
const InitializeSwc = async () => {
  if (swcInitialized) return
  await init()
  swcInitialized = true
}
const transformJsx = async (jsx: string) => {
  let cleanedJsx = jsx
    .replace(/\\n/g, '\n')
    .replace(/\\t/g, '\t')
    .replace(/\\"/g, '"')
    .replace(/\\\\/g, '\\');

  cleanedJsx = cleanedJsx
    .replace(/import\s+.*?from\s+['"]react['"];?\s*/g, '')
    .replace(/import\s+.*?from\s+['"]react-dom['"];?\s*/g, '')
    .replace(/import\s+React.*?;?\s*/g, '')
    .replace(/import\s+ReactDOM.*?;?\s*/g, '');
  console.log(cleanedJsx)
  const res = await transform(cleanedJsx, {
    jsc: {
      parser: {
        syntax: "typescript",
        tsx: true,
        decorators: false
      },
      transform: {
        react: {
          runtime: "classic",  // Change to classic
          pragma: "React.createElement",
          pragmaFrag: "React.Fragment",
        }
      },
      target: "es5",
      loose: true
    },

    module: {
      type: "es6"
    }
  })
  let code = res.code
  if (code.includes('function App(')) {
    code += '\n// Expose App to global scope\nwindow.App = App;'
  }
  return code
}
function createFullHTML(files: Record<string, string>): string {
  const htmlFile = files['index.html'] || files['app.html'] || ''
  const cssFiles = Object.entries(files).filter(([name]) => name.endsWith('.css'))
  const jsFiles = Object.entries(files).filter(([name]) => name.endsWith('.js'))

  // If you have a main HTML file, inject CSS and JS into it
  if (htmlFile) {
    let html = htmlFile
    if (!html.includes('tailwindcss')) {
      html = html.replace('</head>', `<script src="https://cdn.tailwindcss.com"></script>\n</head>`)
    }
    html = html.replace(/<script\s+src=['""][^'"]*\.jsx['""][^>]*><\/script>/g, '')

    // Inject CSS
    const cssContent = cssFiles.map(([_, content]) => `<style>${content}</style>`).join('\n')
    html = html.replace('</head>', `${cssContent}\n</head>`)

    const jsContent = jsFiles.map(([_, content]) => `<script>${content}</script>`).join('\n')
    html = html.replace('</body>', `
  ${jsContent}
  <script>
    if (typeof App !== 'undefined') {
      const root = ReactDOM.createRoot(document.getElementById('root'));
      root.render(React.createElement(App));
    }
  </script>
</body>`)
    return html
  }

  // If no HTML file, create one
  return `
  <!DOCTYPE html>
  <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1">
      <script src="https://cdn.tailwindcss.com"></script>
      ${cssFiles.map(([_, content]) => `<style>${content}</style>`).join('\n')}
    </head>
    <body>
      <div id="root"></div>
      <script src="https://unpkg.com/react@18/umd/react.development.js"></script>
      <script src="https://unpkg.com/react-dom@18/umd/react-dom.development.js"></script>
      ${jsFiles.map(([_, content]) => `<script>${content}</script>`).join('\n')}
      <script defer>
        const root = ReactDOM.createRoot(document.getElementById('root'));
        root.render(React.createElement(App));
      </script>
    </body>
  </html>
`
}

export default function WebBuilder() {
  const [prompt, setPrompt] = useState("")
  const [isGenerating, setIsGenerating] = useState(false)
  const [iframeURL, setiframeURL] = useState<string | null>(null)
  const [isReady, setIsReady] = useState(false)
  const iframeRef = useRef<HTMLIFrameElement | null>(null)
  let files: Record<string, string> = {}
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
      const { code } = fileData

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


    // setiframeURL(url)
    // Object.entries(file).forEach(([fileName, content]) => {
    //   localStorage.setItem(fileName, content)
    //   console.log("Content")
    // })
    //files = file
    setIsGenerating(false)
    //await updateVirtualFiles(file)
    setiframeURL(url!)
    setIsReady(true)
  }

  const handleClear = () => {
    setPrompt("")
    setiframeURL("")
  }
  // async function updateVirtualFiles(files: Record<string, string>) {

  //   Object.entries(files).forEach(async ([fileName, content]) => {
  //     const outDir = path.join(__dirname, "..", "virtual", fileName)

  //     await writeFile(outDir, content)

  //   })
  // }
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
                <Button variant="outline" size="sm">
                  <Share className="w-4 h-4 mr-2" />
                  Share
                </Button>
                <Button variant="outline" size="sm">
                  <Download className="w-4 h-4 mr-2" />
                  Export
                </Button>
              </div>
            </div>
          </div>
        </header>

        <div className="container mx-auto px-4 py-6">
          <div className="grid lg:grid-cols-2 gap-6 h-[calc(100vh-120px)]">
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
                  <iframe src={iframeURL} ref={iframeRef} className="w-full h-full border-0" title="Generated Website Preview" />
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
