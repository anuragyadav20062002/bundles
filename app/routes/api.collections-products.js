import { json } from "@remix-run/node"
import { authenticate } from "../shopify.server"

export async function loader({ request }) {
  const { admin } = await authenticate.admin(request)
  const url = new URL(request.url)
  const collectionIds = url.searchParams.get("collections")?.split(",") || []

  if (!collectionIds.length) {
    return json({ products: [] })
  }

  try {
    const response = await admin.graphql(
      `#graphql
        query GetCollectionProducts($ids: [ID!]!) {
          nodes(ids: $ids) {
            ... on Collection {
              id
              products(first: 50) {
                edges {
                  node {
                    id
                    title
                    handle
                    featuredImage {
                      url
                    }
                    priceRange {
                      minVariantPrice {
                        amount
                        currencyCode
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
              }
            }
          }
        }
      `,
      {
        variables: {
          ids: collectionIds,
        },
      },
    )

    const data = await response.json()

    if (data.errors) {
      throw new Error(data.errors[0].message)
    }

    // Combine and deduplicate products from all collections
    const productsMap = new Map()

    data.data.nodes.forEach((collection) => {
      collection.products.edges.forEach(({ node: product }) => {
        if (!productsMap.has(product.id)) {
          productsMap.set(product.id, {
            id: product.id,
            title: product.title,
            handle: product.handle,
            imageUrl: product.featuredImage?.url,
            priceRange: product.priceRange,
            variants: product.variants.edges.map(({ node }) => ({
              id: node.id,
              title: node.title,
              price: node.price,
              compareAtPrice: node.compareAtPrice,
            })),
          })
        }
      })
    })

    return json({
      products: Array.from(productsMap.values()),
    })
  } catch (error) {
    console.error("Failed to fetch collection products:", error)
    return json(
      {
        products: [],
        error: error.message || "Failed to fetch products",
      },
      { status: 500 },
    )
  }
}

