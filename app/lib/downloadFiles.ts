import JSZip from "jszip"

export const downloadFiles = async (files: Record<string, string>) => {
    const jszip = new JSZip()

    for (const [fileName, code] of Object.entries(files)) {
        jszip.file(fileName, code)
    }
    const folder = await jszip.generateAsync({ type: 'blob' })
    const url = URL.createObjectURL(folder)
    const a = document.createElement('a')
    a.download = "project.zip"
    a.href = url
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}