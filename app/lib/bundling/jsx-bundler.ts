import initSwcWasm, { transform } from "@swc/wasm-web"

// ─── Lazy singleton init ─────────────────────────────────────────────────────
// `transform` from @swc/wasm-web is only functional after initSwcWasm() resolves.
// We create a single shared promise so concurrent callers all wait on the same init.
let _initPromise: Promise<unknown> | null = null

function ensureSwcReady(): Promise<unknown> {
  if (_initPromise === null) {
    _initPromise = initSwcWasm("/wasm_bg.wasm").catch((err) => {
      // Reset so a future call can retry
      _initPromise = null
      throw err
    })
  }
  return _initPromise
}


// ─── Public API ──────────────────────────────────────────────────────────────
export const transformJsx = async (jsx: string): Promise<string> => {
  // Always wait for the wasm binary to be loaded before calling transform()
  await ensureSwcReady()

  // Unescape double-escaped sequences that may come from JSON serialization
  let cleanedJsx = jsx
    .replace(/\\n/g, "\n")
    .replace(/\\t/g, "\t")
    .replace(/\\"/g, '"')
    .replace(/\\\\/g, "\\")

  // Strip React / ReactDOM imports — provided as UMD globals in the sandboxed iframe
  cleanedJsx = cleanedJsx
    .replace(/import\s+.*?from\s+['"]react['"];?\s*/g, "")
    .replace(/import\s+.*?from\s+['"]react-dom['"];?\s*/g, "")
    .replace(/import\s+React.*?;?\s*/g, "")
    .replace(/import\s+ReactDOM.*?;?\s*/g, "")

  try {
    const res = await transform(cleanedJsx, {
      jsc: {
        parser: {
          syntax: "typescript",
          tsx: true,
          decorators: false,
        },
        transform: {
          react: {
            runtime: "classic",
            pragma: "React.createElement",
            pragmaFrag: "React.Fragment",
          },
        },
        target: "es5",
        loose: true,
      },
      module: {
        type: "es6",
      },
    })

    let code = res.code

    // Expose root App component so the iframe bootstrap script can mount it
    if (
      code.includes("function App(") ||
      code.includes("var App =") ||
      code.includes("let App =") ||
      code.includes("const App =")
    ) {
      code += "\n// Expose App to global scope\nwindow.App = App;"
    }

    return code
  } catch (err: any) {
    console.error("SWC Compilation Error:", err)
    throw new Error(`JSX Compilation Error: ${err?.message || String(err)}`)
  }
}