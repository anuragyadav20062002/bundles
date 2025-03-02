import { login } from "../shopify.server"

export async function loader({ request }) {
  try {
    return await login(request)
  } catch (error) {
    console.error("Login error:", error)
    return new Response(null, {
      status: 500,
      statusText: "Login failed",
    })
  }
}

