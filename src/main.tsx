import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import { HelmetProvider } from "react-helmet-async";
import { ErrorBoundary } from "./components/ErrorBoundary";
import "./index.css";
import { addErrorLog } from "./lib/contentManager";

// ─── Error deduplication ─────────────────────────────────────────────────────
// Cap unique tracked errors at 50 to prevent memory leaks in long sessions.
// The Set key is a short fingerprint of the error signature.
const _seenErrors = new Set<string>();
const MAX_SEEN_ERRORS = 50;

function safeTrack(fingerprint: string, logFn: () => void): void {
  if (_seenErrors.has(fingerprint) || _seenErrors.size >= MAX_SEEN_ERRORS) {
    return;
  }
  _seenErrors.add(fingerprint);
  try {
    logFn();
  } catch {
    /* addErrorLog must never throw — silence all errors inside the tracker */
  }
}

// ─── Safe stack extractor ─────────────────────────────────────────────────────
// Prevents calling .slice on undefined when error.stack is missing (e.g.
// in some non-V8 runtimes or when the Error object was manually constructed).
function safeStack(
  error: Error | undefined | null,
  source?: string,
  lineno?: number,
  colno?: number
): string {
  if (error?.stack && typeof error.stack === "string") {
    return error.stack.slice(0, 500);
  }
  // Fallback: reconstruct a minimal trace from onerror positional arguments
  const parts: string[] = [];
  if (source) parts.push(source);
  if (typeof lineno === "number") parts.push(`line ${lineno}`);
  if (typeof colno === "number") parts.push(`col ${colno}`);
  return parts.join(":") || "stack unavailable";
}

// ─── Global error monitors ───────────────────────────────────────────────────
// Preserve any pre-existing listeners so third-party utilities (e.g. Sentry,
// LogRocket) are not silently broken when this module loads.

const _prevOnError = window.onerror;
window.onerror = (message, source, lineno, colno, error) => {
  const stack = safeStack(error, source as string, lineno, colno);
  const fp = `err:${String(message).slice(0, 60)}:${(lineno ?? 0)}`;
  safeTrack(fp, () =>
    addErrorLog({
      type: "error",
      page: window.location.pathname,
      message: String(message),
      stack,
    })
  );
  // Chain to previous listener if one existed
  if (typeof _prevOnError === "function") {
    return _prevOnError(message, source, lineno, colno, error);
  }
  return false; // Do not suppress the browser's default console output
};

const _prevOnUnhandledRejection = window.onunhandledrejection as
  | ((this: Window, ev: PromiseRejectionEvent) => unknown)
  | null;

window.onunhandledrejection = function (event: PromiseRejectionEvent) {
  const reason = event.reason as { message?: string; stack?: string } | string | undefined;
  const msg =
    typeof reason === "object" && reason !== null
      ? (reason.message ?? String(reason))
      : String(reason ?? "Unhandled rejection");
  const stack =
    typeof reason === "object" && reason !== null && typeof reason.stack === "string"
      ? reason.stack.slice(0, 400)
      : undefined;
  const fp = `unhandled:${msg.slice(0, 60)}`;
  safeTrack(fp, () =>
    addErrorLog({
      type: "unhandled",
      page: window.location.pathname,
      message: msg,
      stack,
    })
  );
  // Chain to previous listener if one existed
  if (typeof _prevOnUnhandledRejection === "function") {
    return _prevOnUnhandledRejection.call(window, event);
  }
};

// ─── Network error monitor (fetch Proxy) ─────────────────────────────────────
// Uses a Proxy instead of a direct override so Service Workers and other
// instrumentation libraries see an unmodified fetch reference.
// Explicitly passes through all /api/roblox and roblox.com requests without
// error tracking — those are expected to fail in certain contexts.

window.fetch = new Proxy(window.fetch, {
  apply(
    target: typeof fetch,
    thisArg: unknown,
    argArray: Parameters<typeof fetch>
  ): Promise<Response> {
    const rawInput = argArray[0];
    const url: string =
      typeof rawInput === "string"
        ? rawInput
        : rawInput instanceof Request
        ? rawInput.url
        : rawInput instanceof URL
        ? rawInput.toString()
        : "";

    const isExempt =
      url.includes("/api/roblox") || url.includes("roblox.com");

    return (Reflect.apply(target, thisArg, argArray) as Promise<Response>)
      .then((res: Response) => {
        if (!res.ok && res.status >= 500 && !isExempt) {
          const fp = `net:${res.status}:${url.slice(0, 80)}`;
          safeTrack(fp, () =>
            addErrorLog({
              type: "network",
              page: window.location.pathname,
              message: `HTTP ${res.status} — ${url.slice(0, 120)}`,
            })
          );
        }
        return res;
      })
      .catch((err: unknown) => {
        if (!isExempt) {
          const errMsg =
            err instanceof Error ? err.message : "Network error";
          const fp = `netfail:${errMsg.slice(0, 40)}:${url.slice(0, 40)}`;
          safeTrack(fp, () =>
            addErrorLog({
              type: "network",
              page: window.location.pathname,
              message: `Fetch failed: ${errMsg} — ${url.slice(0, 100)}`,
            })
          );
        }
        throw err;
      });
  },
} as ProxyHandler<typeof fetch>);

// ─── Console error monitor (console.error Proxy) ─────────────────────────────
// Uses a Proxy to preserve the original reference and prevent infinite loops
// that would occur if addErrorLog itself triggered a console.error.
// A _logLock flag breaks potential re-entrant cycles.

let _consoleLock = false;

console.error = new Proxy(console.error, {
  apply(
    target: typeof console.error,
    thisArg: unknown,
    args: unknown[]
  ): void {
    // Always call the original first so the DevTools console still shows it
    Reflect.apply(target, thisArg, args);

    // Guard against re-entrant calls (e.g. addErrorLog triggering console.error)
    if (_consoleLock) return;

    const msg = args
      .map((a) =>
        typeof a === "string" ? a : a instanceof Error ? a.message : ""
      )
      .join(" ")
      .slice(0, 300);

    // Skip known React/Roblox noise that would pollute the error log
    const skipPatterns = [
      "Warning:",
      "ReactDOM.render",
      "act(",
      "Each child",
      "key prop",
      "[roblox",
      "Roblox",
    ];
    if (!msg || skipPatterns.some((p) => msg.includes(p))) return;

    const fp = `console:${msg.slice(0, 60)}`;
    _consoleLock = true;
    safeTrack(fp, () =>
      addErrorLog({
        type: "warning",
        page: window.location.pathname,
        message: msg,
      })
    );
    _consoleLock = false;
  },
} as ProxyHandler<typeof console.error>);


// ─── App mounting ─────────────────────────────────────────────────────────────
// Fail loudly with a clear message if #root is missing rather than crashing
// with an opaque TypeError from the non-null assertion.
const rootElement = document.getElementById("root");
if (!rootElement) {
  throw new Error(
    "[main.tsx] Fatal boot error: #root element not found in the DOM. " +
      "Verify that index.html contains <div id=\"root\"></div>."
  );
}

// ReactDOM.createRoot is wrapped in a global ErrorBoundary so a catastrophic
// render-time crash displays a recovery UI rather than a blank white page.
// StrictMode double-invocation is safe because all channel cleanups in
// App.tsx use the `destroyed` flag to handle the double-mount pattern.
const root = ReactDOM.createRoot(rootElement);

root.render(
  <React.StrictMode>
    <HelmetProvider>
      <ErrorBoundary>
        <App />
      </ErrorBoundary>
    </HelmetProvider>
  </React.StrictMode>
);
