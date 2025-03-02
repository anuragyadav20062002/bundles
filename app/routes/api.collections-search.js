import { json } from "@remix-run/node"
import { authenticate } from "../shopify.server"

export async function loader({ request }) {
  const { admin } = await authenticate.admin(request)
  const url = new URL(request.url)
  const searchTerm = url.searchParams.get("q") || ""

  try {
    const response = await admin.graphql(
      `#graphql
        query GetCollections($query: String!) {
          collections(first: 10, query: $query) {
            edges {
              node {
                id
                title
                handle
                image {
                  url
                }
                productsCount {
                  count
                }
              }
            }
          }
        }
      `,
      {
        variables: {
          query: searchTerm,
        },
      },
    )

    const data = await response.json()

    if (data.errors) {
      console.error("GraphQL Errors:", data.errors)
      throw new Error(data.errors[0].message)
    }

    // Transform the data to a simpler format
    const collections = data.data.collections.edges.map((edge) => ({
      id: edge.node.id,
      title: edge.node.title,
      handle: edge.node.handle,
      productsCount: edge.node.productsCount.count || 0,
      hasProducts: edge.node.productsCount.count > 0,
      imageUrl: edge.node.image?.url || null,
    }))

    return json({ collections })
  } catch (error) {
    console.error("Failed to fetch collections:", error)
    return json(
      {
        collections: [],
        error: error.message || "Failed to fetch collections",
      },
      { status: 500 },
    )
  }
}

