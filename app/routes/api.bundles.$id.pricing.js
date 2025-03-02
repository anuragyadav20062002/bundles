import { json } from "@remix-run/node"
import { authenticate } from "../shopify.server"
import { prisma } from "../db.server"

export const action = async ({ request, params }) => {
  const { session } = await authenticate.admin(request)
  const { id } = params

  if (request.method !== "POST") {
    return json({ error: "Method not allowed" }, { status: 405 })
  }

  try {
    const data = await request.json()

    // Update or create pricing
    const pricing = await prisma.bundlePricing.upsert({
      where: {
        bundleId: id,
      },
      update: {
        type: data.type,
        status: data.status,
        rules: data.rules,
        showFooter: data.showFooter,
        showBar: data.showBar,
      },
      create: {
        bundleId: id,
        type: data.type,
        status: data.status,
        rules: data.rules,
        showFooter: data.showFooter,
        showBar: data.showBar,
      },
    })

    return json({ success: true, pricing })
  } catch (error) {
    console.error("Failed to save pricing:", error)
    return json({ error: error.message }, { status: 500 })
  }
}

