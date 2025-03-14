import { json } from "@remix-run/node"
import { authenticate } from "../shopify.server"
import { prisma } from "../db.server"

export const action = async ({ request, params }) => {
  try {
    const { session } = await authenticate.admin(request)
    const { id } = params
    const data = await request.json()

    console.log("Received pricing data:", data)

    // Validate the bundle belongs to this shop
    const bundle = await prisma.bundle.findFirst({
      where: {
        id,
        shopId: session.shop,
      },
    })

    if (!bundle) {
      return json({ error: "Bundle not found" }, { status: 404 })
    }

    // Validate discount type
    if (data.status && !["fixed", "percentage", "bundle"].includes(data.type)) {
      return json({ error: "Invalid discount type" }, { status: 400 })
    }

    // Validate rules if discounts are enabled
    if (data.status) {
      try {
        const rules = JSON.parse(data.rules)

        // Ensure rules is an array
        if (!Array.isArray(rules)) {
          return json({ error: "Rules must be an array" }, { status: 400 })
        }

        // Validate each rule
        for (const rule of rules) {
          // Check required fields
          if (!rule.hasOwnProperty("minQuantity") || !rule.hasOwnProperty("value")) {
            return json({ error: "Each rule must have minQuantity and value" }, { status: 400 })
          }

          // Validate minQuantity is a positive number
          const minQuantity = Number.parseInt(rule.minQuantity)
          if (isNaN(minQuantity) || minQuantity < 1) {
            return json({ error: "Minimum quantity must be a positive number" }, { status: 400 })
          }

          // Validate value based on discount type
          const value = Number.parseFloat(rule.value)
          if (isNaN(value) || value < 0) {
            return json({ error: "Discount value must be a non-negative number" }, { status: 400 })
          }

          // For percentage, ensure value is between 0 and 100
          if (data.type === "percentage" && (value < 0 || value > 100)) {
            return json({ error: "Percentage discount must be between 0 and 100" }, { status: 400 })
          }
        }
      } catch (error) {
        return json({ error: "Invalid rules format" }, { status: 400 })
      }
    }

    // Check if pricing already exists
    const existingPricing = await prisma.bundlePricing.findUnique({
      where: {
        bundleId: id,
      },
    })

    // Prepare data for database
    const pricingData = {
      type: data.type,
      status: data.status,
      rules: data.rules,
      showFooter: data.showFooter,
      showBar: data.showBar,
      // Only include messages if provided, otherwise set to null
      ...(data.messages ? { messages: data.messages } : { messages: null }),
    }

    let pricing

    if (existingPricing) {
      // Update existing pricing
      pricing = await prisma.bundlePricing.update({
        where: {
          bundleId: id,
        },
        data: pricingData,
      })
    } else {
      // Create new pricing
      pricing = await prisma.bundlePricing.create({
        data: {
          bundleId: id,
          ...pricingData,
        },
      })
    }

    console.log("Pricing saved successfully:", pricing)

    return json({
      success: true,
      pricing,
    })
  } catch (error) {
    console.error("Failed to save pricing:", error)
    return json({ error: error.message }, { status: 500 })
  }
}

