import { json } from "@remix-run/node"
import { authenticate } from "../shopify.server"
import { prisma } from "../db.server"

export const action = async ({ request }) => {
  const { admin, session } = await authenticate.admin(request)
  const data = await request.json()
  const { bundleId } = data

  try {
    // Validate the bundle exists and belongs to this shop
    const bundle = await prisma.bundle.findFirst({
      where: {
        id: bundleId,
        shopId: session.shop,
      },
    })

    if (!bundle) {
      return json({ error: "Bundle not found" }, { status: 404 })
    }

    console.log(`Deleting bundle ${bundleId} for shop ${session.shop}`)

    // Delete related steps first (handle foreign key constraints)
    await prisma.bundleStep.deleteMany({
      where: {
        bundleId: bundleId,
      },
    })

    // Delete pricing rules if they exist
    await prisma.bundlePricing.deleteMany({
      where: {
        bundleId: bundleId,
      },
    })

    // Delete the bundle
    await prisma.bundle.delete({
      where: {
        id: bundleId,
      },
    })

    // Also delete the bundle metafield from the shop if it exists
    try {
      const metafieldResponse = await admin.graphql(
        `#graphql
        query {
          shop {
            metafields(first: 10, namespace: "bundles") {
              edges {
                node {
                  id
                  key
                  namespace
                  owner {
                    id
                  }
                }
              }
            }
          }
        }`,
      )

      const metafieldData = await metafieldResponse.json()
      const metafields = metafieldData.data.shop.metafields.edges

      // Find metafield that contains this bundle ID
      for (const edge of metafields) {
        const metafield = edge.node
        try {
          // Delete this metafield using the correct mutation structure
          await admin.graphql(
            `#graphql
            mutation MetafieldsDelete($metafields: [MetafieldIdentifierInput!]!) {
              metafieldsDelete(metafields: $metafields) {
                deletedMetafields {
                  key
                  namespace
                  owner {
                    id
                  }
                }
                userErrors {
                  field
                  message
                }
              }
            }`,
            {
              variables: {
                metafields: [
                  {
                    ownerId: metafield.owner.id,
                    namespace: metafield.namespace,
                    key: metafield.key,
                  },
                ],
              },
            },
          )
          console.log(`Deleted metafield for bundle ${bundleId}`)
          break
        } catch (e) {
          console.warn(`Error parsing metafield value: ${e.message}`)
          // Continue checking other metafields
        }
      }
    } catch (metafieldError) {
      console.error("Error handling metafields:", metafieldError)
      // Continue with the deletion process even if metafield deletion fails
    }

    return json({
      success: true,
      message: "Bundle deleted successfully",
    })
  } catch (error) {
    console.error("Failed to delete bundle:", error)
    return json({ error: error.message }, { status: 500 })
  }
}

