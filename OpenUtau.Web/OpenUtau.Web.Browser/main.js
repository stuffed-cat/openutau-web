import { dotnet } from './_framework/dotnet.js'

const is_browser = typeof window != "undefined";
if (!is_browser) throw new Error(`Expected to be running in a browser`);

// Intercept console.log to catch [WM-VUE-NOTIFY] signals and route them to parent Vue
const originalConsoleLog = console.log;
console.log = function(...args) {
    if (args.length > 0 && typeof args[0] === 'string' && args[0].startsWith("[WM-VUE-NOTIFY]=>")) {
        // [WM-VUE-NOTIFY]=>ACTION=>payload
        const parts = args[0].split("=>");
        if (parts.length >= 3) {
            const action = parts[1];
            const payload = parts.slice(2).join("=>");
            // send to Vue app
            window.parent.postMessage({
                type: "WM_EVENT",
                action: action,
                payload: payload
            }, "*");
        }
    }
    originalConsoleLog.apply(console, args);
};

const { setModuleImports, getAssemblyExports, getConfig } = await dotnet
    .withDiagnosticTracing(false)
    .withApplicationArgumentsFromQuery()
    .withConfig({ disableIntegrityCheck: true })
    .create();

const config = getConfig();
const exports = await getAssemblyExports(config.mainAssemblyName);

// Expose exports so iframe parent (Vue) can call them back
window.dotnetExports = exports;

// Listen to Vue commands
window.addEventListener("message", (event) => {
    if (event.data && event.data.type === "WM_CMD") {
        const { cmd, windowId, width, height } = event.data;
        if (cmd === "CLOSE" && window.dotnetExports?.OpenUtau?.Web?.Browser?.WebWMBridge) {
            window.dotnetExports.OpenUtau.Web.Browser.WebWMBridge.WindowClosedByUI(windowId);
        } else if (cmd === "RESIZE" && window.dotnetExports?.OpenUtau?.Web?.Browser?.WebWMBridge) {
            window.dotnetExports.OpenUtau.Web.Browser.WebWMBridge.WindowResizedByUI(windowId, width, height);
        }
    }
});

await dotnet.run();
