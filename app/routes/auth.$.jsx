import { redirect } from "@remix-run/node"
import { authenticate } from "../shopify.server"

export async function loader({ request }) {
  try {
    console.log("=== AUTH.$ CATCH-ALL ROUTE CALLED ===")
    console.log("Request URL:", request.url)
    console.log("Request headers:", Object.fromEntries([...request.headers.entries()]))

    // Try to get the shop from the URL
    const url = new URL(request.url)
    const shop = url.searchParams.get("shop")
    console.log("Shop from URL params:", shop)

    const isAuthenticated = await authenticate.isAuthenticated(request)
    console.log("Is authenticated:", isAuthenticated)

    if (!isAuthenticated) {
      // If we have a shop parameter, include it in the redirect
      if (shop) {
        console.log("Redirecting to login with shop:", shop)
        return redirect(`/auth/login?shop=${encodeURIComponent(shop)}`)
      }

      console.log("Redirecting to login without shop")
      return redirect("/auth/login")
    }

    console.log("Authenticated, redirecting to app")
    return redirect("/app")
  } catch (error) {
    console.error("Auth catch-all error:", error)

    // Try to get the shop from the URL for the error case too
    const url = new URL(request.url)
    const shop = url.searchParams.get("shop")

    if (shop) {
      return redirect(`/auth/login?shop=${encodeURIComponent(shop)}&error=${encodeURIComponent(error.message)}`)
    }

    return redirect(`/auth/login?error=${encodeURIComponent(error.message)}`)
  }
}

