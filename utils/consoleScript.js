//Injects console logs sender to coding environment's console feature
function consoleScript (type) { 
    if (type === 'html') {
        return `<script>const originalConsole = window.console; window.console = { log: (...args) => { originalConsole.log(...args); window.parent.postMessage({ type: 'console', logType: 'log', message: args.map(arg => JSON.stringify(arg)).join(' ') }, '*'); }, error: (...args) => { originalConsole.error(...args); window.parent.postMessage({ type: 'console', logType: 'error', message: args.map(arg => JSON.stringify(arg)).join(' ') }, '*'); }, warn: (...args) => { originalConsole.warn(...args); window.parent.postMessage({ type: 'console', logType: 'warn', message: args.map(arg => JSON.stringify(arg)).join(' ') }, '*'); } }; window.onerror = function(message, source, lineno, colno, error) { window.parent.postMessage({ type: 'console', logType: 'error', message: message + ' at ' + (source?.split('/')?.pop() || 'unknown') + ' (line: ' + lineno + ', column: ' + colno + ')' }, '*'); return false; }; </script>`; 
    } 
    return '';
}

module.exports = consoleScript;
