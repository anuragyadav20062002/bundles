import { authenticate } from "../shopify.server"

export async function loader({ request }) {
  try {
    await authenticate.admin(request)
    return null
  } catch (error) {
    console.error("Auth callback error:", error)
    return new Response(null, {
      status: 500,
      statusText: "Authentication failed",
    })
  }
}

