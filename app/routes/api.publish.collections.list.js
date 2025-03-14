import { json } from "@remix-run/node"
import { authenticate } from "../shopify.server"

export const loader = async ({ request }) => {
  const { admin } = await authenticate.admin(request)
  const url = new URL(request.url)
  const cursor = url.searchParams.get("cursor") || null
  const limit = Number.parseInt(url.searchParams.get("limit") || "50", 10)

  try {
    // Fetch collections using GraphQL with pagination
    const response = await admin.graphql(
      `#graphql
      query getCollections($limit: Int!, $cursor: String) {
        collections(first: $limit, after: $cursor) {
          pageInfo {
            hasNextPage
            endCursor
          }
          edges {
            node {
              id
              title
              handle
              image {
                url
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
    const collections = responseJson.data.collections.edges.map((edge) => {
      const collection = edge.node
      return {
        id: collection.id,
        title: collection.title,
        handle: collection.handle,
        image: collection.image?.url || null,
      }
    })

    return json({
      collections,
      pageInfo: responseJson.data.collections.pageInfo,
    })
  } catch (error) {
    console.error("Error fetching collections:", error)
    return json({ error: error.message }, { status: 500 })
  }
}

