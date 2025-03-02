import { PrismaSessionStorage } from "@shopify/shopify-app-session-storage-prisma"
import { restResources } from "@shopify/shopify-api/rest/admin/2023-10"
import { LATEST_API_VERSION, ApiVersion } from "@shopify/shopify-api"
import { shopifyApp } from "@shopify/shopify-app-remix/server"
import { prisma } from "./db.server"

const storage = new PrismaSessionStorage(prisma)

const shopify = shopifyApp({
  apiKey: process.env.SHOPIFY_API_KEY,
  apiSecretKey: process.env.SHOPIFY_API_SECRET,
  scopes: [
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
    "write_script_tags", // Added this scope
  ],
  apiVersion: LATEST_API_VERSION,
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
      try {
        await shopify.registerWebhooks({ session })
      } catch (error) {
        console.error("Webhook registration error:", error)
      }
    },
  },
  future: {
    unstable_newEmbeddedAuthStrategy: true,
  },
  distribution: "app-bridge-2.0",
  appUrl: process.env.SHOPIFY_APP_URL || "http://localhost:3000",
  auth: {
    path: "/auth",
    callbackPath: "/auth/callback",
  },
})

export const authenticate = shopify.authenticate
export const login = shopify.login
export { shopify }
export const apiVersion = ApiVersion.January25
export const addDocumentResponseHeaders = shopify.addDocumentResponseHeaders
export const unauthenticated = shopify.unauthenticated
export const registerWebhooks = shopify.registerWebhooks
export const sessionStorage = shopify.sessionStorage

