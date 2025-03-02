import { json } from "@remix-run/node"
import {authenticate} from "../shopify.server"
import { prisma } from "../db.server"

// Update the action function in your existing file
export async function action({ request }) {
  const { session } = await authenticate.admin(request)

  if (request.method === "POST") {
    const formData = await request.formData()
    const { bundleId, name, icon, minQuantity, maxQuantity, enabled, collections } = Object.fromEntries(formData)

    try {
      // Get highest position
      const highestStep = await prisma.bundleStep.findFirst({
        where: { bundleId },
        orderBy: { position: "desc" },
      })

      const position = highestStep ? highestStep.position + 1 : 0

      // Create step
      const step = await prisma.bundleStep.create({
        data: {
          name,
          icon,
          minQuantity: Number.parseInt(minQuantity, 10),
          maxQuantity: Number.parseInt(maxQuantity, 10),
          enabled: enabled === "true",
          position,
          bundleId,
          collections: JSON.parse(collections),
        },
      })

      return json({ step })
    } catch (error) {
      console.error("Failed to create step:", error)
      return json({ error: "Failed to create step" }, { status: 500 })
    }
  }

  return json({ error: "Method not allowed" }, { status: 405 })
}

