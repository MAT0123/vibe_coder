import { transform } from "@swc/wasm-web";


export const transformJsx = async (jsx: string) => {
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