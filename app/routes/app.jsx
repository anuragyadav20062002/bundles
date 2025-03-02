import { json } from "@remix-run/node"
import { Outlet, useLoaderData, useRouteError } from "@remix-run/react"
import { AppProvider } from "@shopify/shopify-app-remix/react"
import { authenticate } from "../shopify.server"
import { prisma } from "../db.server"

export const loader = async ({ request }) => {
  try {
    const { admin, session } = await authenticate.admin(request)

    if (!session?.shop) {
      throw new Response("Unauthorized", { status: 401 })
    }

    try {
      // Get all bundles from database
      const dbBundles = await prisma.bundle.findMany({
        where: {
          shopId: session.shop,
        },
        select: {
          id: true,
        },
      })

      // Get shop metafields using REST API
      const metafieldsResponse = await admin.rest.get({
        path: "/metafields.json",
        query: { namespace: "bundles" },
      })

      if (!metafieldsResponse.ok) {
        throw new Error(`Failed to fetch metafields: ${metafieldsResponse.statusText}`)
      }

      const metafields = await metafieldsResponse.json()

      // Create set of database bundle IDs
      const dbBundleIds = new Set(dbBundles.map((b) => b.id))

      // Find and delete orphaned metafields
      const cleanupPromises = metafields.metafields
        .filter((metafield) => !dbBundleIds.has(metafield.key))
        .map(async (metafield) => {
          try {
            // Delete metafield using REST API
            const deleteResponse = await admin.rest.delete({
              path: `/metafields/${metafield.id}.json`,
            })

            if (!deleteResponse.ok) {
              throw new Error(`Failed to delete metafield ${metafield.id}: ${deleteResponse.statusText}`)
            }

            console.log(`Successfully deleted metafield ${metafield.id}`)
          } catch (error) {
            console.error(`Failed to delete metafield ${metafield.id}:`, error)
            // Continue with other deletions even if one fails
          }
        })

      // Wait for all cleanup operations with timeout
      await Promise.race([
        Promise.all(cleanupPromises),
        new Promise((_, reject) => setTimeout(() => reject(new Error("Cleanup timeout")), 5000)),
      ]).catch((error) => {
        console.error("Cleanup operation failed or timed out:", error)
        // Continue loading the app even if cleanup fails
      })
    } catch (error) {
      console.error("Metafield cleanup error:", error)
      // Continue loading the app even if cleanup fails
    }

    return json({
      apiKey: process.env.SHOPIFY_API_KEY,
      shop: session.shop,
    })
  } catch (error) {
    console.error("App loader error:", error)
    throw new Response(error.message || "Unauthorized", { status: error.status || 401 })
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
    <AppProvider isEmbeddedApp apiKey={apiKey} shop={shop} forceRedirect>
      <Outlet />
    </AppProvider>
  )
}

export function ErrorBoundary() {
  const error = useRouteError()
  console.error("App error:", error)

  let errorMessage = "An unknown error occurred"
  let errorTitle = "Application Error"

  if (error?.status === 401) {
    errorTitle = "Authentication Error"
    errorMessage = "Please refresh the page or try logging in again."
  }

  return (
    <div className="p-4">
      <div className="bg-critical/10 p-4 rounded-md">
        <h1 className="text-lg font-medium text-critical">{errorTitle}</h1>
        <p className="mt-2 text-sm text-critical">{errorMessage}</p>
        {process.env.NODE_ENV === "development" && error instanceof Error && (
          <pre className="mt-4 text-xs text-critical/75 whitespace-pre-wrap">{error.stack}</pre>
        )}
      </div>
    </div>
  )
}

