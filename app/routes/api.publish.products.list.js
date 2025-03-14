import { json } from "@remix-run/node"
import { authenticate } from "../shopify.server"

export const loader = async ({ request }) => {
  const { admin } = await authenticate.admin(request)
  const url = new URL(request.url)
  const cursor = url.searchParams.get("cursor") || null
  const limit = Number.parseInt(url.searchParams.get("limit") || "50", 10)

  try {
    // Fetch products using GraphQL with pagination
    const response = await admin.graphql(
      `#graphql
      query getProducts($limit: Int!, $cursor: String) {
        products(first: $limit, after: $cursor) {
          pageInfo {
            hasNextPage
            endCursor
          }
          edges {
            node {
              id
              title
              handle
              featuredImage {
                url
              }
              variants(first: 1) {
                edges {
                  node {
                    id
                    price
                  }
                }
              }
            }
          }
        }
      }`,
      {
        variables: {
          limit: limit,
          cursor: cursor,
        },
      },
    )

    const responseJson = await response.json()

    // Transform the data to a simpler format
    const products = responseJson.data.products.edges.map((edge) => {
      const product = edge.node
      return {
        id: product.id,
        title: product.title,
        handle: product.handle,
        image: product.featuredImage?.url || null,
        price: product.variants.edges[0]?.node.price || "0.00",
        variantId: product.variants.edges[0]?.node.id || null,
      }
    })

    return json({
      products,
      pageInfo: responseJson.data.products.pageInfo,
    })
  } catch (error) {
    console.error("Error fetching products:", error)
    return json({ error: error.message }, { status: 500 })
  }
}

