import { json } from "@remix-run/node"
import { authenticate } from "../shopify.server"

export const loader = async ({ request }) => {
  const { admin } = await authenticate.admin(request)

  try {
    // Query to get all product types
    const response = await admin.graphql(
      `query {
        shop {
          productTypes(first: 250) {
            edges {
              node
            }
          }
        }
      }`,
    )

    const data = await response.json()
    const productTypes = data.data.shop.productTypes.edges.map((edge) => edge.node).filter(Boolean)

    return json({ productTypes })
  } catch (error) {
    console.error("Failed to fetch product types:", error)
    return json({ error: "Failed to fetch product types" }, { status: 500 })
  }
}

