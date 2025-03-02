// Enhanced error detection patterns
export function isAnalyticsError(error: Error): boolean {
  const analyticsPatterns = [
    "ERR_BLOCKED_BY_CLIENT",
    "Failed to fetch",
    "MonorailRequestError",
    "MonorailProduceError",
    "metrics",
    "bugsnag",
    "otlp-http",
    "monorail-edge.shopifysvc.com",
    "shopify_admin",
    "admin_web",
    "apps_app_load",
    "extension_point_performance",
    "argus.shopifycloud.com",
    "WebSocket connection",
    "third-party cookies",
  ]

  return analyticsPatterns.some(
    (pattern) =>
      (error.message?.toLowerCase().includes(pattern.toLowerCase()) ?? false) ||
      (error.stack?.toLowerCase().includes(pattern.toLowerCase()) ?? false),
  )
}

export function handleAnalyticsError(error: Error) {
  if (isAnalyticsError(error)) {
    // Only log analytics errors in development
    if (process.env.NODE_ENV === "development") {
      console.warn("[Analytics Error - Safe to ignore]:", {
        message: error.message,
        type: error.name,
      })
    }
    return null
  }

  // Log and rethrow non-analytics errors
  console.error("[Application Error]:", error)
  throw error
}

export function handleAuthError(error: Error) {
  console.error("[Auth Error]:", error)
  throw new Response("Unauthorized", { status: 401 })
}

export function isBrowserExtensionError(error: Error): boolean {
  return (
    (error.message?.includes("permission error") ?? false) &&
    (error.stack?.includes("background.js") ?? false) &&
    (error.stack?.includes("chrome-extension") ?? false)
  )
}

export function handleBrowserExtensionError(error: Error) {
  if (isBrowserExtensionError(error)) {
    // Silently ignore browser extension errors in production
    if (process.env.NODE_ENV === "development") {
      console.debug("[Browser Extension Error - Safe to ignore]:", {
        message: error.message,
        type: error.name,
      })
    }
    return null
  }

  // Pass through other errors
  throw error
}

