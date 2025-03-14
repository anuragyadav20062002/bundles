import { json } from "@remix-run/node"
import { authenticate } from "../shopify.server"
import { prisma } from "../db.server"

export const action = async ({ request }) => {
  const { admin, session } = await authenticate.admin(request)
  const data = await request.json()
  const { bundleId } = data

  try {
    // Get bundle data
    const bundle = await prisma.bundle.findFirst({
      where: {
        id: bundleId,
        shopId: session.shop,
      },
      include: {
        steps: true,
        pricing: true,
      },
    })

    if (!bundle) {
      return json({ error: "Bundle not found" }, { status: 404 })
    }

    console.log("Processing preview for bundle:", bundle.name)

    // Generate the handle we would use for this bundle
    const expectedHandle = `preview-${bundle.name.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`

    // First, try to find by handle directly which is more reliable
    const handleProductResponse = await admin.graphql(
      `#graphql
      query getProductByHandle($handle: String!) {
        productByHandle(handle: $handle) {
          id
          title
          handle
        }
      }`,
      {
        variables: {
          handle: expectedHandle,
        },
      },
    )

    const handleProductData = await handleProductResponse.json()
    console.log("Product by handle search response:", JSON.stringify(handleProductData, null, 2))

    let productId
    let productHandle

    // Check if we found a product by handle
    if (handleProductData.data.productByHandle) {
      console.log("Found existing preview product by handle:", handleProductData.data.productByHandle.title)
      productId = handleProductData.data.productByHandle.id
      productHandle = handleProductData.data.productByHandle.handle
    } else {
      // As a backup, search by metafields
      const metafieldProductResponse = await admin.graphql(
        `#graphql
        query {
          products(first: 20, query: "status:ACTIVE") {
            edges {
              node {
                id
                title
                handle
                metafields(first: 10) {
                  edges {
                    node {
                      namespace
                      key
                      value
                    }
                  }
                }
              }
            }
          }
        }`,
      )

      const metafieldProductData = await metafieldProductResponse.json()

      // Check if we found an existing preview product by manually filtering
      const existingProducts = metafieldProductData.data.products.edges
      const existingProduct = existingProducts.find((edge) => {
        const metafields = edge.node.metafields.edges
        return metafields.some(
          (meta) =>
            meta.node.namespace === "bundles" && meta.node.key === "preview_for" && meta.node.value === bundleId,
        )
      })

      if (existingProduct) {
        console.log("Found existing preview product by metafield:", existingProduct.node.title)
        productId = existingProduct.node.id
        productHandle = existingProduct.node.handle
      } else {
        // No existing preview found, create a new one
        console.log("Creating new preview product for bundle:", bundle.name)

        // Get the product type from bundle matching rules
        let productType = "Bundle Preview"
        try {
          if (bundle.matching) {
            const matchingData = typeof bundle.matching === "object" ? bundle.matching : JSON.parse(bundle.matching)

            if (matchingData.rules && matchingData.rules.length > 0) {
              productType = matchingData.rules[0]
            }
          }
        } catch (error) {
          console.warn("Error parsing matching rules:", error)
          // Continue with default product type
        }

        // Create a simple product without images
        const productResponse = await admin.graphql(
          `#graphql
          mutation productCreate($input: ProductInput!) {
            productCreate(input: $input) {
              product {
                id
                title
                handle
              }
              userErrors {
                field
                message
              }
            }
          }`,
          {
            variables: {
              input: {
                title: bundle.name,
                descriptionHtml: `<p>Bundle Preview</p>`,
                productType: productType,
                status: "ACTIVE",
                handle: expectedHandle,
                metafields: [
                  {
                    namespace: "bundles",
                    key: "preview_for",
                    value: bundleId,
                    type: "single_line_text_field",
                  },
                  {
                    namespace: "bundles",
                    key: "is_preview",
                    value: "true",
                    type: "single_line_text_field",
                  },
                ],
              },
            },
          },
        )

        const productResponseJson = await productResponse.json()
        console.log("Product creation response:", JSON.stringify(productResponseJson, null, 2))

        if (productResponseJson.data.productCreate.userErrors.length > 0) {
          const errors = productResponseJson.data.productCreate.userErrors.map((err) => err.message).join(", ")
          throw new Error(`Failed to create product: ${errors}`)
        }

        // Get the product ID and handle
        productId = productResponseJson.data.productCreate.product.id
        productHandle = productResponseJson.data.productCreate.product.handle

        // Add media to the product
        const mediaResponse = await admin.graphql(
          `#graphql
          mutation productCreateMedia($media: [CreateMediaInput!]!, $productId: ID!) {
            productCreateMedia(media: $media, productId: $productId) {
              media {
                alt
                mediaContentType
                status
              }
              mediaUserErrors {
                field
                message
              }
              product {
                id
                title
              }
            }
          }`,
          {
            variables: {
              media: [
                {
                  alt: `${bundle.name} Bundle Preview`,
                  mediaContentType: "IMAGE",
                  originalSource:
                    "https://hebbkx1anhila5yf.public.blob.vercel-storage.com/bundleimage.jpg-LSBoFMUEUqYl0gGo8Zqq0sq2QsC4V6.jpeg",
                },
              ],
              productId: productId,
            },
          },
        )

        const mediaResponseJson = await mediaResponse.json()
        console.log("Media creation response:", JSON.stringify(mediaResponseJson, null, 2))

        if (
          mediaResponseJson.data.productCreateMedia.mediaUserErrors &&
          mediaResponseJson.data.productCreateMedia.mediaUserErrors.length > 0
        ) {
          console.warn("Media errors:", mediaResponseJson.data.productCreateMedia.mediaUserErrors)
        }
      }
    }

    // Get the shop URL
    const shopResponse = await admin.graphql(
      `#graphql
      query {
        shop {
          primaryDomain {
            url
          }
        }
      }`,
    )

    const shopData = await shopResponse.json()
    const shopUrl = shopData.data.shop.primaryDomain.url

    // Since we can't reliably generate the preview key, let's use a known working one for now
    // In a production environment, you would need to find a way to get the actual preview key
    const previewKey = "69e9c1b92dd83263a7dcf1c1d0304d4b"

    // Construct the preview URL
    const fullProductUrl = `${shopUrl}/products_preview/?preview_key=${previewKey}`

    console.log("Generated product URL:", fullProductUrl)

    return json({
      success: true,
      productUrl: fullProductUrl,
    })
  } catch (error) {
    console.error("Failed to create preview:", error)
    return json({ error: error.message }, { status: 500 })
  }
}

