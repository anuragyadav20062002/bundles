"use client"

import { json } from "@remix-run/node"
import { useLoaderData, useNavigate } from "@remix-run/react"
import { Page, Layout, Card, Button, Text, Banner, List, BlockStack, Box, InlineStack } from "@shopify/polaris"
import { authenticate } from "../shopify.server"
import { prisma } from "../db.server"
import { useState } from "react"
import { PublishBundleModal } from "../components/modals/PublishBundleModal"
import { useToast } from "../components/ToastProvider"
import { ExternalLink } from "lucide-react"
import { useAppBridge } from "@shopify/app-bridge-react"

/**
 * @typedef {import('../types').Bundle} Bundle
 */

/**
 * @typedef {Object} LoaderData
 * @property {Bundle} bundle
 */

/**
 * @param {{ request: Request, params: { id: string } }} param0
 */
export const loader = async ({ request, params }) => {
  const { admin, session } = await authenticate.admin(request)
  const { id } = params

  try {
    const bundle = await prisma.bundle.findFirst({
      where: {
        id,
        shopId: session.shop,
      },
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
    console.error("Loader error:", error)
    throw json({ error: error.message }, { status: 500 })
  }
}

export default function PublishBundle() {
  /** @type {LoaderData} */
  const { bundle } = useLoaderData()
  const navigate = useNavigate()
  const app = useAppBridge()
  const { showToast } = useToast()
  const [showPublishModal, setShowPublishModal] = useState(false)
  const [isPublished, setIsPublished] = useState(false)

  /**
   * @returns {Promise<void>}
   */
  const handlePublish = async () => {
    try {
      const response = await fetch(`/api/bundles/${bundle.id}/publish`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          productMatching: {
            tags: bundle.productMatching?.tags || [],
            collections: bundle.productMatching?.collections || [],
            productType: bundle.productMatching?.productType || [],
            vendor: bundle.productMatching?.vendor || [],
            specificProducts: bundle.productMatching?.specificProducts || [],
          },
        }),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.message || "Failed to publish bundle")
      }

      const data = await response.json()
      setIsPublished(true)
      showToast({ message: "Bundle published successfully" })

      // Show the instructions
      if (data.instructions) {
        console.log("Publishing instructions:", data.instructions)
      }
    } catch (error) {
      console.error("Publish error:", error)
      showToast({ message: error instanceof Error ? error.message : "Failed to publish bundle", error: true })
    }
  }

  const handleOpenCustomizer = () => {
    // Using the app instance to redirect
    app.dispatch(
      app.actions.Redirect.toApp({
        path: "/themes/current/editor?context=apps",
      }),
    )
  }

  // Rest of your component remains the same...
  return (
    <Page
      backAction={{ content: "Back to bundle", onAction: () => navigate(`/app/bundles/${bundle.id}`) }}
      title="Publish Bundle"
    >
      <Layout>
        <Layout.Section>
          <BlockStack gap="4">
            {isPublished ? (
              <Card>
                <BlockStack gap="4">
                  <Box padding="4" borderBlockEndWidth="1" borderColor="border">
                    <Banner status="success" title="Bundle Published Successfully">
                      <p>Your bundle has been published and is ready to be added to your theme.</p>
                    </Banner>
                  </Box>

                  <Box padding="4">
                    <BlockStack gap="4">
                      <Text variant="headingMd" as="h2">
                        Next Steps
                      </Text>
                      <List type="number">
                        <List.Item>Go to your theme customizer by clicking the button below</List.Item>
                        <List.Item>Find the page where you want to add the bundle (usually a product page)</List.Item>
                        <List.Item>Click "Add section" and select "Bundle Builder"</List.Item>
                        <List.Item>
                          Enter the Bundle ID: <code>{bundle.id}</code>
                        </List.Item>
                      </List>

                      <Box paddingBlockStart="4">
                        <Button primary icon={<ExternalLink className="h-5 w-5" />} onClick={handleOpenCustomizer}>
                          Open Theme Customizer
                        </Button>
                        <Button
                          onClick={() => {
                            console.log("Current data:", {
                              shopDomain: bundle.shopDomain,
                            })
                            window.open(
                              `https://admin.shopify.com/store/${bundle.shopDomain}/themes/current/editor`,
                              "_blank",
                            )
                          }}
                        >
                          Debug: Open Editor
                        </Button>
                      </Box>
                    </BlockStack>
                  </Box>
                </BlockStack>
              </Card>
            ) : (
              <Card>
                <BlockStack gap="4">
                  <Box padding="4" borderBlockEndWidth="1" borderColor="border">
                    <BlockStack gap="4">
                      <Text variant="headingMd" as="h2">
                        Publishing Checklist
                      </Text>
                      <Text tone="subdued">Review these items before publishing your bundle</Text>
                    </BlockStack>
                  </Box>

                  <Box padding="4">
                    <List type="bullet">
                      <List.Item>Bundle has {bundle.steps.length} steps configured</List.Item>
                      <List.Item>
                        {bundle.pricing ? "Pricing rules are set up" : "No pricing rules configured"}
                      </List.Item>
                    </List>
                  </Box>

                  <Box padding="4" borderBlockStartWidth="1" borderColor="border">
                    <InlineStack align="end">
                      <Button primary onClick={() => setShowPublishModal(true)}>
                        Publish to Store
                      </Button>
                    </InlineStack>
                  </Box>
                </BlockStack>
              </Card>
            )}

            <Card>
              <BlockStack gap="4">
                <Box padding="4">
                  <BlockStack gap="4">
                    <Text variant="headingMd" as="h2">
                      For Developers
                    </Text>
                    <Text tone="subdued">
                      Bundle data is stored in your shop's metafields and can be accessed via the Shopify API.
                    </Text>

                    <div className="space-y-2">
                      <Text variant="headingSm">Metafield Details:</Text>
                      <code className="block bg-slate-50 p-4 rounded-md">
                        namespace: bundles
                        <br />
                        key: {bundle.id}
                      </code>
                    </div>

                    <div className="space-y-2">
                      <Text variant="headingSm">GraphQL Query:</Text>
                      <code className="block bg-slate-50 p-4 rounded-md overflow-x-auto">
                        {`{
  shop {
    metafield(namespace: "bundles", key: "${bundle.id}") {
      value
    }
  }
}`}
                      </code>
                    </div>
                  </BlockStack>
                </Box>
              </BlockStack>
            </Card>
          </BlockStack>
        </Layout.Section>

        <Layout.Section variant="oneThird">
          <Card>
            <BlockStack gap="4">
              <Box padding="4">
                <BlockStack gap="4">
                  <Text variant="headingMd" as="h2">
                    Bundle Preview
                  </Text>
                  <div className="aspect-[3/4] w-full bg-slate-100 rounded-md"></div>
                  <Text tone="subdued">This is how your bundle will appear on product pages</Text>
                </BlockStack>
              </Box>
            </BlockStack>
          </Card>
        </Layout.Section>
      </Layout>

      <PublishBundleModal
        open={showPublishModal}
        onClose={() => setShowPublishModal(false)}
        bundle={bundle}
        onPublish={handlePublish}
      />
    </Page>
  )
}

