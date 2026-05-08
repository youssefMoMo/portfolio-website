import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import { HelmetProvider } from "react-helmet-async";
import { ErrorBoundary } from "./components/ErrorBoundary";
import "./index.css";
import { addErrorLog } from "./lib/contentManager";

// Global error monitors (dev + prod)
window.onerror = (message, source, lineno, colno, error) => {
  addErrorLog({
    type: "error",
    page: window.location.pathname,
    message: String(message),
    stack: error?.stack?.slice(0, 500) ?? `${source}:${lineno}:${colno}`,
  });
  return false;
};

window.onunhandledrejection = (event) => {
  addErrorLog({
    type: "unhandled",
    page: window.location.pathname,
    message: event.reason?.message ?? String(event.reason) ?? "Unhandled rejection",
    stack: event.reason?.stack?.slice(0, 400),
  });
};

// Network error monitor — skip proxy + Roblox URLs (expected failures handled internally).
// Re-entrance guard so HMR re-running this module doesn't stack wrappers.
type WrappedFetch = typeof window.fetch & { __ydWrapped?: boolean };
const _existingFetch = window.fetch as WrappedFetch;
if (!_existingFetch.__ydWrapped) {
  const _originalFetch = window.fetch.bind(window);
  const wrapped = (async (...args: Parameters<typeof fetch>) => {
    try {
      const res = await _originalFetch(...args);
      if (!res.ok && res.status >= 500) {
        const url = typeof args[0] === "string" ? args[0] : (args[0] as Request)?.url ?? "";
        const isInternal = url.includes("/api/roblox") || url.includes("roblox.com");
        if (!isInternal) {
          addErrorLog({
            type: "network",
            page: window.location.pathname,
            message: `HTTP ${res.status} — ${url.slice(0, 120)}`,
          });
        }
      }
      return res;
    } catch (err: unknown) {
      const url = typeof args[0] === "string" ? args[0] : (args[0] as Request)?.url ?? "";
      const isRobloxOrProxy = url.includes("roblox.com") || url.includes("/api/roblox");
      if (!isRobloxOrProxy) {
        addErrorLog({
          type: "network",
          page: window.location.pathname,
          message: `Fetch failed: ${err instanceof Error ? err.message : "Network error"} — ${url.slice(0, 100)}`,
        });
      }
      throw err;
    }
  }) as WrappedFetch;
  wrapped.__ydWrapped = true;
  window.fetch = wrapped;
}

type WrappedConsoleError = typeof console.error & { __ydWrapped?: boolean };
const _existingConsoleError = console.error as WrappedConsoleError;
if (!_existingConsoleError.__ydWrapped) {
  const _origConsoleError = console.error.bind(console);
  const wrappedError = ((...args: unknown[]) => {
    _origConsoleError(...args);
    const msg = args
      .map(a => typeof a === "string" ? a : a instanceof Error ? a.message : "")
      .join(" ")
      .slice(0, 300);
    const skip = ["Warning:", "ReactDOM.render", "act(", "Each child", "key prop", "[roblox", "Roblox"];
    if (msg && !skip.some(p => msg.includes(p))) {
      addErrorLog({ type: "warning", page: window.location.pathname, message: msg });
    }
  }) as WrappedConsoleError;
  wrappedError.__ydWrapped = true;
  console.error = wrappedError;
}

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <HelmetProvider>
      <ErrorBoundary>
        <App />
      </ErrorBoundary>
    </HelmetProvider>
  </React.StrictMode>,
);
