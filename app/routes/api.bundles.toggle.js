import { json } from "@remix-run/node"
import { authenticate } from "../shopify.server"
import { prisma } from "../db.server"

export const action = async ({ request }) => {
  const { session } = await authenticate.admin(request)
  const formData = await request.formData()
  const bundleId = formData.get("bundleId")
  const active = formData.get("active") === "true"

  console.log("Received toggle request:", {
    bundleId,
    active,
    shop: session.shop,
  })

  try {
    // First get the current bundle to check matching rules
    const currentBundle = await prisma.bundle.findFirst({
      where: {
        id: bundleId,
        shopId: session.shop,
      },
    })

    if (!currentBundle) {
      throw new Error("Bundle not found")
    }

    // Check if bundle has been published before allowing activation
    if (
      active &&
      (!currentBundle.matching || !currentBundle.matching.rules || currentBundle.matching.rules.length === 0)
    ) {
      return json(
        {
          error: "Cannot activate bundle without product type rules. Please publish the bundle first.",
        },
        { status: 400 },
      )
    }

    const updatedBundle = await prisma.bundle.update({
      where: {
        id: bundleId,
        shopId: session.shop,
      },
      data: {
        active,
        status: active ? "active" : "draft",
      },
    })

    console.log("Successfully updated bundle:", updatedBundle)

    return json({
      success: true,
      bundle: updatedBundle,
      message: `Bundle ${active ? "activated" : "deactivated"} successfully`,
    })
  } catch (error) {
    console.error("Bundle toggle error:", error)
    return json(
      {
        error: error.message,
        details: process.env.NODE_ENV === "development" ? error.stack : undefined,
      },
      { status: 500 },
    )
  }
}

