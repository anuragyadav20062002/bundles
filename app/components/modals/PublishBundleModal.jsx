"use client"

import { useState, useEffect, useCallback } from "react"
import { Modal, Card, Text, BlockStack, Box, InlineStack, Banner, List, Select, Tag, Spinner } from "@shopify/polaris"
import { AlertCircle, Tags } from "lucide-react"

/**
 * @typedef {Object} PublishBundleModalProps
 * @property {boolean} open
 * @property {() => void} onClose
 * @property {Bundle} bundle
 * @property {(data: { success: boolean }) => void} onPublish
 */

export function PublishBundleModal({ open, onClose, bundle, onPublish }) {
  const [isPublishing, setIsPublishing] = useState(false)
  const [error, setError] = useState(null)
  const [productTypes, setProductTypes] = useState([])
  const [availableTypes, setAvailableTypes] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [selectedType, setSelectedType] = useState("")

  useEffect(() => {
    if (open) {
      setError(null)
      setIsPublishing(false)
      setProductTypes([])
      setSelectedType("")
      fetchProductTypes()
    }
  }, [open])

  const fetchProductTypes = async () => {
    try {
      setIsLoading(true)
      const response = await fetch("/api/product-types")
      if (!response.ok) {
        throw new Error("Failed to fetch product types")
      }
      const data = await response.json()
      setAvailableTypes(
        data.productTypes.map((type) => ({
          label: type,
          value: type,
        })),
      )
    } catch (err) {
      console.error("Error fetching product types:", err)
      setError("Failed to load product types")
    } finally {
      setIsLoading(false)
    }
  }

  const handleTypeChange = (value) => {
    setSelectedType(value)
    if (value && !productTypes.includes(value)) {
      setProductTypes((prev) => [...prev, value])
      setError(null)
    }
  }

  const handleRemoveType = (typeToRemove) => {
    setProductTypes((prev) => prev.filter((type) => type !== typeToRemove))
  }

  const handlePublish = useCallback(async () => {
    if (isPublishing) return

    if (productTypes.length === 0) {
      setError("Please select at least one product type before publishing")
      return
    }

    try {
      setIsPublishing(true)
      setError(null)

      const response = await fetch(`/api/bundles/${bundle.id}/publish`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          productMatching: {
            productType: productTypes,
          },
        }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || "Failed to publish bundle")
      }

      const data = await response.json()
      if (data.success) {
        onPublish({ success: true })
        onClose()
      } else {
        throw new Error(data.error || "Failed to publish bundle")
      }
    } catch (err) {
      console.error("Publish error:", err)
      setError(err instanceof Error ? err.message : "Failed to publish bundle")
    } finally {
      setIsPublishing(false)
    }
  }, [bundle.id, productTypes, onPublish, onClose, isPublishing])

  const availableOptions = availableTypes.filter((option) => !productTypes.includes(option.value))

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Publish Bundle"
      primaryAction={{
        content: isPublishing ? "Publishing..." : "Publish to Store",
        onAction: handlePublish,
        loading: isPublishing,
        disabled: productTypes.length === 0 || isLoading || isPublishing,
      }}
      secondaryActions={[
        {
          content: "Cancel",
          onAction: onClose,
          disabled: isPublishing,
        },
      ]}
    >
      <Modal.Section>
        <BlockStack gap="4">
          {error && (
            <Banner status="critical" icon={AlertCircle}>
              {error}
            </Banner>
          )}

          <Card>
            <BlockStack gap="4">
              <Box padding="4" borderBlockEndWidth="1" borderColor="border">
                <InlineStack align="space-between">
                  <BlockStack gap="2">
                    <Text variant="headingMd" as="h2">
                      Product Type Matching
                    </Text>
                    <Text tone="subdued">Select the product types that should show this bundle</Text>
                  </BlockStack>
                  <div className="flex h-10 w-10 items-center justify-center rounded-md bg-primary/10">
                    <Tags className="h-5 w-5 text-primary" />
                  </div>
                </InlineStack>
              </Box>

              <Box padding="4">
                <BlockStack gap="4">
                  {isLoading ? (
                    <div className="flex items-center justify-center p-4">
                      <Spinner size="small" />
                      <Text tone="subdued" as="span" className="ml-2">
                        Loading product types...
                      </Text>
                    </div>
                  ) : (
                    <>
                      <Select
                        label="Select Product Type"
                        options={availableOptions}
                        value={selectedType}
                        onChange={handleTypeChange}
                        disabled={availableOptions.length === 0 || isPublishing}
                        placeholder={
                          availableOptions.length === 0 ? "All product types selected" : "Choose a product type"
                        }
                      />

                      <div className="mt-4">
                        <Text variant="headingSm" as="h3">
                          Selected Product Types:
                        </Text>
                        <div className="mt-2 flex flex-wrap gap-2">
                          {productTypes.map((type) => (
                            <Tag key={type} onRemove={isPublishing ? undefined : () => handleRemoveType(type)}>
                              {type}
                            </Tag>
                          ))}
                        </div>
                        {productTypes.length === 0 && (
                          <Text tone="subdued" as="p" className="mt-2">
                            No product types selected yet
                          </Text>
                        )}
                      </div>

                      {productTypes.length === 0 && (
                        <Banner status="warning">
                          Please select at least one product type to enable bundle matching
                        </Banner>
                      )}
                    </>
                  )}
                </BlockStack>
              </Box>
            </BlockStack>
          </Card>

          <Card>
            <BlockStack gap="4">
              <Box padding="4">
                <BlockStack gap="4">
                  <Text variant="headingMd" as="h2">
                    What happens next?
                  </Text>
                  <List>
                    <List.Item>Bundle will be published to your store</List.Item>
                    <List.Item>It will appear on products with the selected product types</List.Item>
                    <List.Item>You can edit the bundle settings in the theme customizer</List.Item>
                  </List>

                  <Banner status="info">
                    The bundle will automatically appear on all products that match the selected product types
                  </Banner>
                </BlockStack>
              </Box>
            </BlockStack>
          </Card>
        </BlockStack>
      </Modal.Section>
    </Modal>
  )
}

export default PublishBundleModal

