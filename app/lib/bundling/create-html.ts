export function createFullHTML(files: Record<string, string>): string {
    const htmlFile = files['index.html'] || files['app.html'] || ''
    const cssFiles = Object.entries(files).filter(([name]) => name.endsWith('.css'))
    const jsFiles = Object.entries(files).filter(([name]) => name.endsWith('.js'))

    const consoleHookScript = `
  <script>
    (function() {
      const _log = console.log;
      const _warn = console.warn;
      const _error = console.error;

      function sendLog(type, args) {
        const serializedArgs = args.map(arg => {
          if (arg === null) return 'null';
          if (arg === undefined) return 'undefined';
          if (typeof arg === 'object') {
            try {
              return JSON.stringify(arg);
            } catch (e) {
              return String(arg);
            }
          }
          return String(arg);
        }).join(' ');

        window.parent.postMessage({
          source: 'vibe-coder-sandbox',
          type: type,
          message: serializedArgs
        }, '*');
      }

      console.log = function(...args) {
        _log.apply(console, args);
        sendLog('log', args);
      };
      console.warn = function(...args) {
        _warn.apply(console, args);
        sendLog('warn', args);
      };
      console.error = function(...args) {
        _error.apply(console, args);
        sendLog('error', args);
      };

      window.addEventListener('error', function(event) {
        sendLog('error', [event.message + ' (at ' + event.filename + ':' + event.lineno + ')']);
      });
    })();
  </script>
`

    if (htmlFile) {
        let html = htmlFile
        if (!html.includes('tailwindcss')) {
            html = html.replace('</head>', `<script src="https://cdn.tailwindcss.com"></script>\n</head>`)
        }
        html = html.replace(/<script\s+src=['""][^'"]*\.jsx['""][^>]*><\/script>/g, '')

        // Inject hook script inside head
        html = html.replace('<head>', `<head>\n${consoleHookScript}`)

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

    return `
  <!DOCTYPE html>
  <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1">
      ${consoleHookScript}
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