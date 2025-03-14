import { redirect } from "@remix-run/node"
import { login } from "../shopify.server"

export async function loader({ request }) {
  try {
    console.log("=== AUTH.LOGIN LOADER CALLED ===")
    console.log("Request URL:", request.url)
    console.log("Request headers:", Object.fromEntries([...request.headers.entries()]))

    // Get the shop parameter from the URL
    const url = new URL(request.url)
    let shop = url.searchParams.get("shop")
    console.log("Shop from URL params:", shop)

    // If shop is not in the URL, check if we're in development and use a default
    if (!shop && process.env.NODE_ENV === "development") {
      // Use a default shop for development
      shop = process.env.SHOPIFY_SHOP_DEV || "yash-wolfpack.myshopify.com"
      console.log("Using development shop:", shop)

      // Redirect to include the shop parameter in the URL
      return redirect(`/auth/login?shop=${encodeURIComponent(shop)}`)
    }

    // If we still don't have a shop, return an error
    if (!shop) {
      console.error("No shop parameter provided")
      return new Response(
        `
        <html>
          <head>
            <title>Shop Parameter Required</title>
            <style>
              body { font-family: system-ui, sans-serif; padding: 2rem; max-width: 600px; margin: 0 auto; }
              h1 { color: #d82c0d; }
              .form { margin-top: 2rem; }
              .input { width: 100%; padding: 0.5rem; margin: 0.5rem 0; }
              .button { background: #008060; color: white; border: none; padding: 0.5rem 1rem; cursor: pointer; }
            </style>
          </head>
          <body>
            <h1>Shop Parameter Required</h1>
            <p>Please provide a shop parameter to continue.</p>
            <form class="form" method="get">
              <label>
                <div>Shop domain:</div>
                <input class="input" type="text" name="shop" placeholder="your-shop.myshopify.com" />
              </label>
              <div>
                <button class="button" type="submit">Continue</button>
              </div>
            </form>
          </body>
        </html>
        `,
        {
          status: 400,
          headers: {
            "Content-Type": "text/html",
          },
        },
      )
    }

    console.log("Beginning auth for shop:", shop)

    // Create a new request with the shop parameter
    const shopUrl = new URL(request.url)
    shopUrl.searchParams.set("shop", shop)

    // Create a new request with the updated URL
    const newRequest = new Request(shopUrl.toString(), {
      method: request.method,
      headers: request.headers,
      body: request.body,
    })

    console.log("Calling login function with shop:", shop)
    return await login(newRequest)
  } catch (error) {
    console.error("Login error:", error)

    if (process.env.SHOPIFY_APP_URL) {
      return redirect(process.env.SHOPIFY_APP_URL)
    }

    return new Response(
      `
      <html>
        <head>
          <title>Login Failed</title>
          <style>
            body { font-family: system-ui, sans-serif; padding: 2rem; max-width: 600px; margin: 0 auto; }
            h1 { color: #d82c0d; }
            pre { background: #f5f5f5; padding: 1rem; overflow: auto; }
          </style>
        </head>
        <body>
          <h1>Login Failed</h1>
          <p>${error.message}</p>
          <pre>${error.stack}</pre>
          <p><a href="/">Return to home</a></p>
        </body>
      </html>
      `,
      {
        status: 500,
        statusText: "Login failed",
        headers: {
          "Content-Type": "text/html",
        },
      },
    )
  }
}

export async function action({ request }) {
  console.log("=== AUTH.LOGIN ACTION CALLED ===")
  console.log("Request method:", request.method)

  try {
    // Get form data
    const formData = await request.formData()
    const shop = formData.get("shop")
    console.log("Shop from form data:", shop)

    if (!shop) {
      return new Response("Shop parameter is required", { status: 400 })
    }

    // Redirect to the loader with the shop parameter
    return redirect(`/auth/login?shop=${encodeURIComponent(shop)}`)
  } catch (error) {
    console.error("Login action error:", error)
    return new Response("Login failed: " + error.message, { status: 500 })
  }
}

