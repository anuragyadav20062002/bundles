import { Links, Meta, Outlet, Scripts, ScrollRestoration, useLoaderData, useRouteError } from "@remix-run/react"
import { json } from "@remix-run/node"
import { AppProvider } from "@shopify/shopify-app-remix/react"
import { authenticate } from "./shopify.server"
import translations from "@shopify/polaris/locales/en.json"
import "@shopify/polaris/build/esm/styles.css"
import "./styles.css"
import { ToastProvider } from "./components/ToastProvider"

export const loader = async ({ request }) => {
  try {
    // Authenticate the request
    const { admin, session } = await authenticate.admin(request)

    // If we don't have a session but the response was OK, it might be an OAuth redirect
    if (!session?.shop && request.headers.get("Authorization")) {
      return json(
        {
          apiKey: process.env.SHOPIFY_API_KEY,
          shop: new URL(request.url).searchParams.get("shop"),
        },
        {
          headers: {
            "Content-Security-Policy": `frame-ancestors https://*.myshopify.com https://admin.shopify.com;`,
          },
        },
      )
    }

    // Normal authenticated response
    return json(
      {
        apiKey: process.env.SHOPIFY_API_KEY,
        shop: session?.shop,
      },
      {
        headers: {
          "Content-Security-Policy": `frame-ancestors https://${session?.shop} https://admin.shopify.com;`,
        },
      },
    )
  } catch (error) {
    console.error("Loader error:", error)

    if (error.message?.includes("Unauthorized") && process.env.SHOPIFY_API_KEY) {
      return json(
        {
          apiKey: process.env.SHOPIFY_API_KEY,
          shop: null,
        },
        {
          headers: {
            "Content-Security-Policy": "frame-ancestors https://*.myshopify.com https://admin.shopify.com;",
          },
        },
      )
    }

    throw error
  }
}

export default function App() {
  const { apiKey, shop } = useLoaderData()

  if (!apiKey || !shop) {
    return (
      <div className="p-4">
        <div className="bg-critical/10 p-4 rounded-md">
          <h1 className="text-lg font-medium text-critical">Configuration Error</h1>
          <p className="mt-2 text-sm text-critical">
            Missing required environment variables. Please check your setup.
            {!apiKey && <strong> API Key is missing.</strong>}
            {!shop && <strong> Shop domain is missing.</strong>}
          </p>
        </div>
      </div>
    )
  }

  return (
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width,initial-scale=1" />
        <Meta />
        <Links />
      </head>
      <body>
        <AppProvider isEmbeddedApp apiKey={apiKey} shop={shop} forceRedirect i18n={translations}>
          <ToastProvider>
            <Outlet context={{ shop }} />
          </ToastProvider>
        </AppProvider>
        <ScrollRestoration />
        <script
          dangerouslySetInnerHTML={{
            __html: `window.shopify = {
              apiKey: ${JSON.stringify(apiKey)},
              shop: ${JSON.stringify(shop)},
            }`,
          }}
        />
        <Scripts />
      </body>
    </html>
  )
}

export function ErrorBoundary() {
  const error = useRouteError()
  console.error("Root error:", error)

  let errorMessage = "An unexpected error occurred"
  let errorTitle = "Application Error"
  let errorDetails = null

  if (error instanceof Error) {
    errorMessage = error.message
    errorDetails = error.stack
  }

  if (error?.status === 401) {
    errorTitle = "Authentication Error"
    errorMessage = "Please refresh the page or try logging in again."
  }

  if (errorMessage.includes("Missing required environment variables")) {
    errorTitle = "Configuration Error"
    errorMessage = "The application is missing required environment variables. Please check your setup."
  }

  return (
    <html lang="en">
      <head>
        <title>{errorTitle}</title>
        <Meta />
        <Links />
      </head>
      <body>
        <div className="p-4">
          <div className="bg-destructive/10 p-4 rounded-md">
            <h1 className="text-lg font-medium text-destructive">{errorTitle}</h1>
            <p className="mt-2 text-sm text-destructive">{errorMessage}</p>
            {process.env.NODE_ENV === "development" && errorDetails && (
              <pre className="mt-4 text-xs text-destructive/75 whitespace-pre-wrap">{errorDetails}</pre>
            )}
          </div>
        </div>
        <Scripts />
      </body>
    </html>
  )
}

