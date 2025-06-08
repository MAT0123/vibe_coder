import { Content } from "@/app/type/AIContent"
import { transformJsx } from "./jsx-bundler"
import { createFullHTML } from "./create-html"
import { Dispatch } from "react"
import { unescapeLiteral } from "../createLiteralEscape"

interface TransformHtmlProps {
    setFiles: Dispatch<React.SetStateAction<Record<string, string>>>,
    content: Content
}
export const transformHtml = async (props: TransformHtmlProps): Promise<string> => {
    const processedFiles: Record<string, string> = {}
    for (const [fileName, fileData] of Object.entries(props.content)) {
        let { code } = fileData
        code = unescapeLiteral(code)
        props.setFiles((prev) => ({ ...prev, [fileName]: code }))

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

    return url
}