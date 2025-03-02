import { json } from "@remix-run/node"
import { authenticate } from "../shopify.server"
import { prisma } from "../db.server"

export const loader = async ({ request, params }) => {
  const { admin, session } = await authenticate.admin(request)
  const { id } = params

  try {
    const bundle = await prisma.bundle.findFirst({
      where: { id, shopId: session.shop },
      include: {
        steps: {
          orderBy: { position: "asc" },
          include: {
            StepProduct: {
              orderBy: { position: "asc" },
              select: {
                id: true,
                productId: true,
                title: true,
                imageUrl: true,
                variants: true,
                minQuantity: true,
                maxQuantity: true,
                position: true,
              },
            },
          },
        },
        pricing: true,
      },
    })

    if (!bundle) {
      throw new Error("Bundle not found")
    }

    return json({ bundle })
  } catch (error) {
    console.error("Failed to load bundle:", error)
    throw error
  }
}

async function transformBundleForShopify(bundle, admin) {
  // Get all product details from Shopify
  const productIds = new Set()
  bundle.steps.forEach((step) => {
    step.StepProduct.forEach((sp) => {
      if (sp.productId) productIds.add(sp.productId)
    })
  })

  const productsQuery = `
    query getProducts($ids: [ID!]!) {
      nodes(ids: $ids) {
        ... on Product {
          id
          title
          handle
          featuredImage {
            url
          }
          priceRangeV2 {
            minVariantPrice {
              amount
              currencyCode
            }
          }
          variants(first: 250) {
            nodes {
              id
              title
              price
              compareAtPrice
            }
          }
        }
      }
    }
  `

  const response = await admin.graphql(productsQuery, {
    variables: {
      ids: Array.from(productIds),
    },
  })

  const { data } = await response.json()
  const productDetails = new Map(data.nodes.map((product) => [product.id, product]))

  // Parse pricing rules
  let pricingRules = null
  if (bundle.pricing?.rules) {
    try {
      pricingRules = JSON.parse(bundle.pricing.rules)
    } catch (e) {
      console.error("Failed to parse pricing rules:", e)
    }
  }

  // Transform bundle data
  return {
    id: bundle.id,
    name: bundle.name,
    description: bundle.description,
    status: bundle.status,
    steps: bundle.steps.map((step) => ({
      id: step.id,
      name: step.name,
      required: step.required || false,
      minQuantity: step.minQuantity || 1,
      maxQuantity: step.maxQuantity || 1,
      products: step.StepProduct.map((sp) => {
        const product = productDetails.get(sp.productId)
        return {
          id: sp.productId,
          productId: sp.productId,
          title: product?.title || sp.title,
          image: product?.featuredImage?.url || sp.imageUrl,
          price: product?.priceRangeV2?.minVariantPrice?.amount || "0.00",
          variants: product?.variants.nodes.reduce(
            (acc, variant) => ({
              ...acc,
              [variant.id]: {
                title: variant.title,
                price: variant.price,
                compareAtPrice: variant.compareAtPrice,
              },
            }),
            {},
          ),
        }
      }),
    })),
    pricing: bundle.pricing
      ? {
          type: bundle.pricing.type,
          value: pricingRules?.value || "0.00",
          compareAtValue: pricingRules?.compareAtValue || null,
        }
      : null,
    settings: bundle.settings || {
      displayMode: "grid",
      showPrices: true,
      showQuantitySelector: true,
    },
  }
}

export const action = async ({ request, params }) => {
  const { admin, session } = await authenticate.admin(request)
  const { id } = params

  try {
    // Get the raw body and parse it
    const rawBody = await request.text()
    let body
    try {
      body = JSON.parse(rawBody)
    } catch (error) {
      console.error("Failed to parse request body:", error, "Raw body:", rawBody)
      return json({ error: "Invalid request body" }, { status: 400 })
    }

    console.log("Received publish request:", {
      bundleId: id,
      body,
    })

    // Validate the request body
    if (!body?.productMatching?.productType?.length) {
      return json({ error: "At least one product type is required" }, { status: 400 })
    }

    // Get the bundle
    const bundle = await prisma.bundle.findFirst({
      where: { id, shopId: session.shop },
      include: {
        steps: {
          include: {
            StepProduct: true,
          },
        },
        pricing: true,
      },
    })

    if (!bundle) {
      return json({ error: "Bundle not found" }, { status: 404 })
    }

    // Default settings
    const defaultSettings = {
      displayMode: "grid",
      showPrices: true,
      showQuantitySelector: true,
      showVariantSelector: true,
      layout: "standard",
    }

    // Structure matching rules
    const matchingRules = {
      type: "productType",
      rules: body.productMatching.productType,
    }

    // Transform bundle data for Shopify
    const transformedBundle = {
      id: bundle.id,
      name: bundle.name,
      description: bundle.description,
      status: "active",
      steps: bundle.steps.map((step) => ({
        id: step.id,
        name: step.name,
        required: step.required || false,
        minQuantity: step.minQuantity || 1,
        maxQuantity: step.maxQuantity || 1,
        products: step.StepProduct.map((sp) => ({
          id: sp.productId,
          productId: sp.productId,
          title: sp.title,
          image: sp.imageUrl,
          variants: sp.variants || {},
        })),
      })),
      settings: defaultSettings,
      matching: matchingRules,
    }

    // Get shop ID for metafield
    const shopResponse = await admin.graphql(`query { shop { id } }`)
    const shopData = await shopResponse.json()
    const shopId = shopData.data.shop.id

    console.log("Saving bundle to metafield:", {
      bundleId: id,
      shopId,
      transformedBundle,
    })

    // Save to metafield
    const metafieldResponse = await admin.graphql(
      `mutation metafieldsSet($metafields: [MetafieldsSetInput!]!) {
        metafieldsSet(metafields: $metafields) {
          metafields {
            id
            namespace
            key
            value
            type
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
              namespace: "bundles",
              key: bundle.id,
              type: "json",
              value: JSON.stringify(transformedBundle),
              ownerId: shopId,
            },
          ],
        },
      },
    )

    const metafieldData = await metafieldResponse.json()
    console.log("Metafield response:", metafieldData)

    if (metafieldData.data?.metafieldsSet?.userErrors?.length > 0) {
      const error = metafieldData.data.metafieldsSet.userErrors[0]
      console.error("Metafield error:", error)
      throw new Error(`Failed to save bundle: ${error.message}`)
    }

    // Update bundle in database
    const updatedBundle = await prisma.bundle.update({
      where: { id },
      data: {
        status: "active",
        active: true,
        publishedAt: new Date().toISOString(),
        matching: matchingRules,
        settings: defaultSettings,
      },
    })

    console.log("Bundle updated successfully:", updatedBundle)

    return json(
      {
        success: true,
        bundle: transformedBundle,
      },
      {
        headers: {
          "Cache-Control": "no-store",
        },
      },
    )
  } catch (error) {
    console.error("Publish error:", error)
    return json(
      {
        error: error.message,
        details: process.env.NODE_ENV === "development" ? error.stack : undefined,
      },
      { status: 500 },
    )
  }
}

