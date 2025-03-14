import { redirect } from "@remix-run/node"
import { loginCallback } from "../shopify.server"

export async function loader({ request }) {
  try {
    console.log("=== AUTH.CALLBACK LOADER CALLED ===")
    console.log("Request URL:", request.url)
    console.log("Request headers:", Object.fromEntries([...request.headers.entries()]))

    // Process the callback
    const callback = await loginCallback(request)
    console.log("Callback processed successfully:", callback)

    // Redirect to the app
    return redirect("/app")
  } catch (error) {
    console.error("Auth callback error:", error)

    // Try to get the shop from the URL for the error case
    const url = new URL(request.url)
    const shop = url.searchParams.get("shop")

    if (shop) {
      return redirect(`/auth/login?shop=${encodeURIComponent(shop)}&error=${encodeURIComponent(error.message)}`)
    }

    return redirect(`/auth/login?error=${encodeURIComponent(error.message)}`)
  }
}

