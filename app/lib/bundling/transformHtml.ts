import { transformJsx } from "./jsx-bundler"
import { createFullHTML } from "./create-html"
import { unescapeLiteral } from "../createLiteralEscape"

export const transformHtml = async (files: Record<string, string>): Promise<string> => {
  const processedFiles: Record<string, string> = {}

  for (const [fileName, fileData] of Object.entries(files)) {
    // Unescape any doubly-escaped characters coming from JSON serialisation
    let code = fileData
    if (code.includes("\\n") || code.includes('\\"')) {
      code = unescapeLiteral(code)
    }

    if (fileName.endsWith(".jsx") || fileName.endsWith(".tsx")) {
      try {
        const transformed = await transformJsx(code)
        // Store under a .js filename so the HTML assembler treats it as plain JS
        const jsName = fileName.replace(/\.(jsx|tsx)$/, ".js")
        processedFiles[jsName] = transformed
      } catch (err: any) {
        console.error(`Failed to transform ${fileName}:`, err)
        // Re-throw so the caller can surface the exact error to the user
        throw err
      }
    } else {
      processedFiles[fileName] = code
    }
  }

  const html = createFullHTML(processedFiles)
  const blob = new Blob([html], { type: "text/html" })
  return URL.createObjectURL(blob)
}
