"use client"

import { json } from "@remix-run/node"
import { useLoaderData, useNavigate, useFetcher } from "@remix-run/react"
import { Page, Card, Button, Text, BlockStack, InlineStack } from "@shopify/polaris"
import { authenticate } from "../shopify.server"
import { prisma } from "../db.server"
import { useState, useCallback } from "react"
import { useToast } from "../components/ToastProvider"
import { AddStepModal } from "../components/modals/AddStepModal"
import { PublishBundleModal } from "../components/modals/PublishBundleModal"
import { PricingConfigModal } from "../components/modals/PricingConfigModal"
import { Rocket } from "lucide-react"

/**
 * @typedef {import('../types').Bundle} Bundle
 * @typedef {import('../types').BundleStep} BundleStep
 */

/**
 * @typedef {Object} LoaderData
 * @property {Bundle} bundle
 */

/**
 * @param {{ request: Request, params: { id: string } }} param0
 */
export const loader = async ({ request, params }) => {
  const { session } = await authenticate.admin(request)
  const { id } = params

  try {
    const bundle = await prisma.bundle.findFirst({
      where: {
        id,
        shopId: session.shop,
      },
      include: {
        steps: {
          include: {
            StepProduct: true,
          },
          orderBy: {
            position: "asc",
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

/**
 * @param {{ request: Request, params: { id: string } }} param0
 */
export const action = async ({ request, params }) => {
  const { session } = await authenticate.admin(request)
  const formData = await request.formData()
  const intent = formData.get("intent")

  try {
    switch (intent) {
      case "create-step": {
        const name = formData.get("name")
        const minQuantity = Number(formData.get("minQuantity"))
        const maxQuantity = Number(formData.get("maxQuantity"))
        const collections = formData.get("collections")
        const products = formData.get("products")

        // Create step with both JSON fields and StepProduct entries
        const step = await prisma.bundleStep.create({
          data: {
            name,
            minQuantity,
            maxQuantity,
            bundleId: params.id,
            collections, // Store collections JSON string
            products, // Store products JSON string
            StepProduct: {
              create: JSON.parse(products || "[]").map((product, index) => ({
                productId: product.id,
                title: product.title,
                imageUrl: product.imageUrl || null,
                variants: product.variants || null,
                minQuantity: product.minQuantity || 1,
                maxQuantity: product.maxQuantity || 1,
                position: index,
              })),
            },
          },
          include: {
            StepProduct: true,
          },
        })

        return json({ success: true, step })
      }

      case "update-step": {
        const stepId = formData.get("stepId")
        const name = formData.get("name")
        const minQuantity = Number(formData.get("minQuantity"))
        const maxQuantity = Number(formData.get("maxQuantity"))
        const collections = formData.get("collections")
        const products = formData.get("products")

        // First delete existing products
        await prisma.stepProduct.deleteMany({
          where: {
            stepId: stepId,
          },
        })

        // Then update the step with both JSON fields and new StepProduct entries
        const step = await prisma.bundleStep.update({
          where: {
            id: stepId,
            bundle: {
              shopId: session.shop,
            },
          },
          data: {
            name,
            minQuantity,
            maxQuantity,
            collections,
            products,
            StepProduct: {
              create: JSON.parse(products || "[]").map((product, index) => ({
                productId: product.id,
                title: product.title,
                imageUrl: product.imageUrl || null,
                variants: product.variants || null,
                minQuantity: product.minQuantity || 1,
                maxQuantity: product.maxQuantity || 1,
                position: index,
              })),
            },
          },
          include: {
            StepProduct: true,
          },
        })

        return json({ success: true, step })
      }

      case "delete-step": {
        const stepId = formData.get("stepId")
        await prisma.bundleStep.delete({
          where: {
            id: stepId,
            bundle: {
              shopId: session.shop,
            },
          },
        })
        return json({ success: true })
      }

      case "clone-step": {
        const stepId = formData.get("stepId")
        const sourceStep = await prisma.bundleStep.findFirst({
          where: {
            id: stepId,
            bundle: {
              shopId: session.shop,
            },
          },
          include: {
            StepProduct: true,
          },
        })

        if (!sourceStep) {
          throw new Error("Step not found")
        }

        const clonedStep = await prisma.bundleStep.create({
          data: {
            name: `${sourceStep.name} (Copy)`,
            minQuantity: sourceStep.minQuantity,
            maxQuantity: sourceStep.maxQuantity,
            bundleId: params.id,
            collections: sourceStep.collections,
            products: sourceStep.products,
            StepProduct: {
              create: sourceStep.StepProduct.map((product, index) => ({
                productId: product.productId,
                title: product.title,
                imageUrl: product.imageUrl,
                variants: product.variants,
                minQuantity: product.minQuantity,
                maxQuantity: product.maxQuantity,
                position: index,
              })),
            },
          },
        })

        return json({ success: true, step: clonedStep })
      }

      default:
        return json({ error: "Invalid intent" }, { status: 400 })
    }
  } catch (error) {
    console.error("Action error:", error)
    return json({ error: error.message }, { status: 500 })
  }
}

export default function BundleDetails() {
  const { bundle } = useLoaderData()
  const navigate = useNavigate()
  const fetcher = useFetcher()
  const { showToast } = useToast()

  const [showAddStep, setShowAddStep] = useState(false)
  const [showEditStep, setShowEditStep] = useState(false)
  const [showPublishModal, setShowPublishModal] = useState(false)
  const [selectedStep, setSelectedStep] = useState(null)
  const [isPublishing, setIsPublishing] = useState(false)
  const [showPricingModal, setShowPricingModal] = useState(false)

  /**
   * @param {BundleStep} step
   */
  const handleEditStep = (step) => {
    setSelectedStep(step)
    setShowEditStep(true)
  }

  /**
   * @param {BundleStep} step
   */
  const handleCloneStep = async (step) => {
    try {
      const formData = new FormData()
      formData.append("intent", "clone-step")
      formData.append("stepId", step.id)

      fetcher.submit(formData, { method: "post" })
      showToast({ message: "Step cloned successfully" })
    } catch (error) {
      showToast({ message: "Failed to clone step", error: true })
    }
  }

  /**
   * @param {string} stepId
   */
  const handleDeleteStep = async (stepId) => {
    if (!window.confirm("Are you sure you want to delete this step?")) return

    try {
      const formData = new FormData()
      formData.append("intent", "delete-step")
      formData.append("stepId", stepId)

      fetcher.submit(formData, { method: "post" })
      showToast({ message: "Step deleted successfully" })
    } catch (error) {
      showToast({ message: "Failed to delete step", error: true })
    }
  }

  /**
   * @param {{ success: boolean, error?: string }} data
   */
  const handlePublish = useCallback(
    (data) => {
      if (data.success) {
        showToast({ message: "Bundle published successfully" })

        // Close the modal
        setShowPublishModal(false)
        setIsPublishing(false)

        // Navigate after a short delay
        setTimeout(() => {
          navigate(".", { replace: true })
        }, 100)
      } else {
        setIsPublishing(false)
        showToast({ message: data.error || "Failed to publish bundle", error: true })
      }
    },
    [navigate, showToast],
  )

  return (
    <Page
      backAction={{ content: "Bundles", onAction: () => navigate("/app") }}
      title={bundle.name}
      secondaryActions={[
        {
          content: "Add Step",
          onAction: () => setShowAddStep(true),
        },
      ]}
    >
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
        {/* Left Side - Bundle Steps & Bundle Publish */}
        <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
          {/* Bundle Steps Card */}
          <Card>
            <div style={{ padding: "16px" }}>
              <BlockStack gap="3">
                <Text variant="headingMd" as="h2">
                  Bundle Steps
                </Text>
                {bundle.steps.length === 0 ? (
                  <div style={{ padding: "12px 0", textAlign: "center" }}>
                    <Text tone="subdued">No steps yet. Click "Add Step" to create your first step.</Text>
                  </div>
                ) : (
                  <div style={{ display: "flex", flexDirection: "column" }}>
                    {bundle.steps.map((step, index) => (
                      <div key={step.id}>
                        <div
                          style={{
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "space-between",
                            padding: "12px 0",
                          }}
                        >
                          <Text variant="bodyMd" fontWeight="bold">
                            {step.name}
                          </Text>
                          <div style={{ display: "flex", gap: "8px" }}>
                            <Button size="slim" onClick={() => handleEditStep(step)}>
                              Edit
                            </Button>
                            <Button size="slim" variant="primary" monochrome onClick={() => handleCloneStep(step)}>
                              Clone
                            </Button>
                            <Button
                              size="slim"
                              variant="primary"
                              tone="critical"
                              onClick={() => handleDeleteStep(step.id)}
                            >
                              Delete
                            </Button>
                          </div>
                        </div>
                        {index < bundle.steps.length - 1 && (
                          <div
                            style={{
                              height: "1px",
                              background: "var(--p-border-subdued)",
                              margin: "0",
                            }}
                          />
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </BlockStack>
            </div>
          </Card>

          {/* Bundle Publish Card */}
          <Card>
            <div style={{ padding: "16px" }}>
              <InlineStack align="space-between">
                <BlockStack gap="1">
                  <Text variant="headingMd" as="h2">
                    Bundle Publish
                  </Text>
                  <Text tone="subdued">Make bundle available in your store</Text>
                </BlockStack>
                <Button
                  primary
                  icon={<Rocket style={{ height: "20px", width: "20px" }} />}
                  onClick={() => setShowPublishModal(true)}
                  loading={isPublishing}
                  disabled={isPublishing}
                >
                  {isPublishing ? "Publishing..." : "Publish"}
                </Button>
              </InlineStack>
            </div>
          </Card>
        </div>

        {/* Right Side - Pricing */}
        <div>
          {/* Bundle Pricing Card */}
          <Card>
            <div style={{ padding: "16px" }}>
              <InlineStack align="space-between">
                <BlockStack gap="1">
                  <Text variant="headingMd" as="h2">
                    Bundle Pricing
                  </Text>
                  <Text tone="subdued">Configure discounts and pricing rules</Text>
                </BlockStack>
                <Button onClick={() => setShowPricingModal(true)}>Configure Pricing</Button>
              </InlineStack>
            </div>
          </Card>
        </div>
      </div>

      {/* Modals */}
      <AddStepModal
        open={showAddStep}
        onClose={() => setShowAddStep(false)}
        bundle={bundle}
        onSubmit={async (data) => {
          try {
            const formData = new FormData()
            formData.append("intent", "create-step")
            formData.append("name", data.name)
            formData.append("minQuantity", data.minQuantity)
            formData.append("maxQuantity", data.maxQuantity)
            formData.append("collections", data.collections)
            formData.append("products", data.products)

            fetcher.submit(formData, { method: "post" })
            setShowAddStep(false)
            showToast({ message: "Step created successfully" })
          } catch (error) {
            showToast({ message: "Failed to create step", error: true })
          }
        }}
      />

      <AddStepModal
        open={showEditStep}
        onClose={() => {
          setShowEditStep(false)
          setSelectedStep(null)
        }}
        bundle={bundle}
        step={selectedStep}
        isEditing={true}
        onSubmit={async (data) => {
          try {
            const formData = new FormData()
            formData.append("intent", "update-step")
            formData.append("stepId", selectedStep.id)
            formData.append("name", data.name)
            formData.append("minQuantity", data.minQuantity)
            formData.append("maxQuantity", data.maxQuantity)
            formData.append("collections", data.collections)
            formData.append("products", data.products)

            fetcher.submit(formData, { method: "post" })
            setShowEditStep(false)
            setSelectedStep(null)
            showToast({ message: "Step updated successfully" })
          } catch (error) {
            showToast({ message: "Failed to update step", error: true })
          }
        }}
      />

      <PublishBundleModal
        open={showPublishModal}
        onClose={() => {
          setShowPublishModal(false)
          setIsPublishing(false)
        }}
        bundle={bundle}
        onPublish={handlePublish}
      />
      <PricingConfigModal
        open={showPricingModal}
        onClose={() => setShowPricingModal(false)}
        bundle={bundle}
        onSave={(data) => {
          // Refresh the page to show updated pricing data
          navigate(".", { replace: true })
        }}
      />
    </Page>
  )
}

