import { json } from "@remix-run/node"
import { authenticate } from "../shopify.server"

export async function loader({ request }) {
  const { admin, session } = await authenticate.admin(request)
  const url = new URL(request.url)
  const searchTerm = url.searchParams.get("q") || ""
  const tab = url.searchParams.get("tab") || "products"
  const page = Number.parseInt(url.searchParams.get("page") || "1", 10)
  const pageSize = 24

  try {
    if (tab === "products") {
      const response = await admin.graphql(
        `#graphql
          query GetProducts($query: String!, $first: Int!) {
            products(first: $first, query: $query) {
              edges {
                node {
                  id
                  title
                  handle
                  featuredMedia {
                    ... on MediaImage {
                      id
                      image {
                        url
                      }
                    }
                  }
                  variants(first: 10) {
                    edges {
                      node {
                        id
                        title
                        price
                        compareAtPrice
                      }
                    }
                  }
                }
              }
              pageInfo {
                hasNextPage
                hasPreviousPage
                endCursor
              }
            }
          }
        `,
        {
          variables: {
            query: searchTerm,
            first: pageSize,
          },
        },
      )

      const data = await response.json()
      return json({
        items: data.data.products.edges.map((edge) => edge.node),
        pageInfo: data.data.products.pageInfo,
      })
    } else {
      const response = await admin.graphql(
        `#graphql
          query GetCollections($query: String!, $first: Int!) {
            collections(first: $first, query: $query) {
              edges {
                node {
                  id
                  title
                  handle
                  image {
                    url
                  }
                  products(first: 1) {
                    edges {
                      node {
                        id
                        title
                      }
                    }
                  }
                }
              }
              pageInfo {
                hasNextPage
                hasPreviousPage
                endCursor
              }
            }
          }
        `,
        {
          variables: {
            query: searchTerm,
            first: pageSize,
          },
        },
      )

      const data = await response.json()
      return json({
        items: data.data.collections.edges.map((edge) => edge.node),
        pageInfo: data.data.collections.pageInfo,
      })
    }
  } catch (error) {
    console.error("Product search error:", error)
    return json({ error: error.message }, { status: 500 })
  }
}

