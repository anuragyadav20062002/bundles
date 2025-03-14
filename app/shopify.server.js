import { PrismaSessionStorage } from "@shopify/shopify-app-session-storage-prisma"
import { restResources } from "@shopify/shopify-api/rest/admin/2023-10"
import { ApiVersion } from "@shopify/shopify-api"
import { shopifyApp } from "@shopify/shopify-app-remix/server"
import { prisma } from "./db.server"

// Add detailed logging
console.log("Initializing Shopify app with environment variables:", {
  SHOPIFY_API_KEY: process.env.SHOPIFY_API_KEY ? "Set" : "Not set",
  SHOPIFY_API_SECRET: process.env.SHOPIFY_API_SECRET ? "Set" : "Not set",
  SCOPES: process.env.SCOPES,
  SHOPIFY_APP_URL: process.env.SHOPIFY_APP_URL,
  NODE_ENV: process.env.NODE_ENV,
})

const storage = new PrismaSessionStorage(prisma)

// Create the shopify app instance
const shopify = shopifyApp({
  apiKey: process.env.SHOPIFY_API_KEY,
  apiSecretKey: process.env.SHOPIFY_API_SECRET,
  scopes: process.env.SCOPES?.split(",") || [
    "read_products",
    "write_products",
    "read_product_listings",
    "write_product_listings",
    "read_inventory",
    "write_inventory",
    "read_orders",
    "write_orders",
    "read_assigned_fulfillment_orders",
    "write_assigned_fulfillment_orders",
    "read_themes",
    "write_themes",
    "read_script_tags",
    "write_script_tags",
  ],
  apiVersion: ApiVersion.January25,
  restResources,
  sessionStorage: storage,
  isEmbeddedApp: true,
  webhooks: {
    APP_UNINSTALLED: {
      deliveryMethod: "http",
      callbackUrl: "/webhooks",
    },
  },
  hooks: {
    afterAuth: async ({ session }) => {
      console.log("afterAuth hook called with session:", session)
      shopify.registerWebhooks({ session })
    },
  },
  future: {
    unstable_newEmbeddedAuthStrategy: true,
  },
  distribution: "app-bridge-2.0",
  appUrl: process.env.SHOPIFY_APP_URL || "http://localhost:3000",
})

// Log available methods for debugging
console.log("Shopify object initialized with methods:", Object.keys(shopify))
console.log("Auth methods available:", Object.keys(shopify.auth || {}))

export default shopify
export const authenticate = shopify.authenticate
export const sessionStorage = shopify.sessionStorage
export const registerWebhooks = shopify.registerWebhooks

// Create login and callback functions that use the auth methods
export async function login(request) {
  console.log("=== LOGIN FUNCTION CALLED ===")
  console.log("Request URL:", request.url)
  console.log("Request method:", request.method)
  console.log("Request headers:", Object.fromEntries([...request.headers.entries()]))

  // Get the shop parameter from the URL
  const url = new URL(request.url)
  let shop = url.searchParams.get("shop")
  console.log("Shop from URL params:", shop)

  // If shop is not in the URL, check if it's in the request body (for POST requests)
  if (!shop && request.method === "POST") {
    try {
      // Clone the request to avoid consuming the body
      const clonedRequest = request.clone()
      const formData = await clonedRequest.formData()
      shop = formData.get("shop")
      console.log("Shop from form data:", shop)
    } catch (error) {
      console.error("Error reading form data:", error)
    }
  }

  // If still no shop, check if we're in an embedded app context
  if (!shop) {
    const authHeader = request.headers.get("Authorization")
    console.log("Authorization header:", authHeader)

    if (authHeader) {
      // We're likely in an embedded app, try to extract shop from the header
      const matches = authHeader.match(/Bearer (.*)/)
      if (matches) {
        const token = matches[1]
        try {
          // This is a simplified approach - in production you'd verify the JWT
          const tokenData = JSON.parse(atob(token.split(".")[1]))
          shop = tokenData.dest.replace("https://", "")
          console.log("Shop extracted from Authorization header:", shop)
        } catch (e) {
          console.error("Failed to extract shop from token:", e)
        }
      }
    }
  }

  // If still no shop, check if we're in development and use a default
  if (!shop && process.env.NODE_ENV === "development") {
    // Use a default shop for development
    shop = process.env.SHOPIFY_SHOP_DEV || "yash-wolfpack.myshopify.com"
    console.log("Using development shop:", shop)
  }

  // If we still don't have a shop, return an error
  if (!shop) {
    console.error("No shop parameter found in request")
    throw new Error("Shop parameter is required")
  }

  console.log("Beginning auth for shop:", shop)

  try {
    // Check if shopify.auth exists and has the begin method
    if (!shopify.auth || typeof shopify.auth.begin !== 'function') {
      console.error("shopify.auth.begin is not available. Available methods:", Object.keys(shopify))
      throw new Error("Authentication method not available. Please check your Shopify SDK version.");
    }
    
    // Begin the auth process
    const response = await shopify.auth.begin({
      shop,
      callbackPath: "/auth/callback",
      isOnline: false,
      rawRequest: request,
    })

    console.log("Auth begin successful, returning response")
    return response
  } catch (error) {
    console.error("Error in auth.begin:", error)
    throw error
  }
}

export async function loginCallback(request) {
  console.log("=== LOGIN CALLBACK FUNCTION CALLED ===")
  console.log("Request URL:", request.url)
  console.log("Request headers:", Object.fromEntries([...request.headers.entries()]))

  try {
    // Check if shopify.auth exists and has the callback method
    if (!shopify.auth || typeof shopify.auth.callback !== 'function') {
      console.error("shopify.auth.callback is not available. Available methods:", Object.keys(shopify))
      throw new Error("Authentication callback method not available. Please check your Shopify SDK version.");
    }
    
    const callback = await shopify.auth.callback({
      rawRequest: request,
      isOnline: false,
    })

    console.log("Auth callback successful:", callback)
    return callback
  } catch (error) {
    console.error("Error in auth.callback:", error)
    
    // Try to get the shop from the URL for the error case
    const url = new URL(request.url)
    const shop = url.searchParams.get("shop")
    
    if (shop) {
      return new Response(null, {
        status: 302,
        headers: {
          Location: `/auth/login?shop=${encodeURIComponent(shop)}&error=${encodeURIComponent(error.message)}`
        }
      });
    }
    
    throw error
  }
}

// Fallback implementation for addDocumentResponseHeaders
export function addDocumentResponseHeaders(request, headers) {
  console.log("Adding document response headers")
  // Add security headers
  if (headers && typeof headers.set === "function") {
    headers.set("X-Frame-Options", "ALLOWALL")
    headers.set("Content-Security-Policy", "frame-ancestors 'self' https://*.myshopify.com https://admin.shopify.com;")
  }
  return headers
}

// Helper function to preserve authentication context in redirects
export function preserveAuthenticatedSession(request, redirectUrl) {
  // Extract authentication headers
  const authHeader = request.headers.get("Authorization");
  const cookies = request.headers.get("Cookie");
  
  // Create headers for the redirect
  const headers = new Headers();
  headers.set("Location", redirectUrl);
  
  // Preserve authentication headers if they exist
  if (authHeader) {
    headers.set("X-Preserve-Authorization", authHeader);
  }
  
  if (cookies) {
    headers.set("X-Preserve-Cookie", cookies);
  }
  
  return new Response(null, {
    status: 302,
    headers
  });
}