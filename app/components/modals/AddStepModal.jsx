"use client"

import { useState, useCallback, useEffect } from "react"
import { Modal, TextField, Button, Text, Banner, Box, LegacyStack, Card } from "@shopify/polaris"
import { CollectionSelectionModal } from "./CollectionSelectionModal"
import { ProductSelectionFromCollectionsModal } from "./ProductSelectionFromCollectionsModal"
import { useToast } from "../ToastProvider"

/**
 * @typedef {import('../../types').Bundle} Bundle
 * @typedef {import('../../types').BundleStep} BundleStep
 */

/**
 * @typedef {Object} FormData
 * @property {string} name
 * @property {string} minQuantity
 * @property {string} maxQuantity
 */

/**
 * @typedef {Object} AddStepModalProps
 * @property {boolean} open
 * @property {() => void} onClose
 * @property {Bundle} bundle
 * @property {(data: any) => void} onSubmit
 * @property {BundleStep | null} [step]
 * @property {boolean} [isEditing]
 */

/**
 * @param {AddStepModalProps} props
 */
export function AddStepModal({ open, onClose, bundle, onSubmit, step = null, isEditing = false }) {
  const { showToast } = useToast()
  /** @type {[FormData, React.Dispatch<React.SetStateAction<FormData>>]} */
  const [formData, setFormData] = useState({
    name: step?.name || "",
    minQuantity: String(step?.minQuantity || "1"),
    maxQuantity: String(step?.maxQuantity || "1"),
  })
  /** @type {[BundleStep[], React.Dispatch<React.SetStateAction<BundleStep[]>>]} */
  const [selectedCollections, setSelectedCollections] = useState(step ? JSON.parse(step.collections || "[]") : [])
  /** @type {[Product[], React.Dispatch<React.SetStateAction<Product[]>>]} */
  const [selectedProducts, setSelectedProducts] = useState(step ? JSON.parse(step.products || "[]") : [])
  /** @type {[string, React.Dispatch<React.SetStateAction<string>>]} */
  const [error, setError] = useState("")
  const [showCollections, setShowCollections] = useState(false)
  const [showProducts, setShowProducts] = useState(false)

  // Load step data when editing
  useEffect(() => {
    if (isEditing && step) {
      setFormData({
        name: step.name,
        minQuantity: String(step.minQuantity),
        maxQuantity: String(step.maxQuantity),
      })
      try {
        setSelectedCollections(JSON.parse(step.collections || "[]"))
        setSelectedProducts(JSON.parse(step.products || "[]"))
      } catch (error) {
        console.error("Failed to parse step data:", error)
        showToast({ message: "Failed to load step data", error: true })
      }
    }
  }, [isEditing, step, showToast])

  // Reset form when modal closes
  useEffect(() => {
    if (!open) {
      setFormData({
        name: "",
        minQuantity: "1",
        maxQuantity: "1",
      })
      setSelectedCollections([])
      setSelectedProducts([])
      setError("")
    }
  }, [open])

  const handleSubmit = useCallback(() => {
    // Validation
    if (!formData.name) {
      setError("Step name is required")
      showToast({ message: "Please enter a step name", error: true })
      return
    }

    if (selectedCollections.length === 0) {
      setError("Please select at least one collection")
      showToast({ message: "Please select at least one collection", error: true })
      return
    }

    if (selectedProducts.length === 0) {
      setError("Please select at least one product")
      showToast({ message: "Please select at least one product", error: true })
      return
    }

    try {
      onSubmit({
        ...formData,
        collections: JSON.stringify(selectedCollections),
        products: JSON.stringify(selectedProducts),
      })
    } catch (error) {
      console.error("Failed to save step:", error)
      showToast({ message: "Failed to save step", error: true })
    }
  }, [formData, selectedCollections, selectedProducts, onSubmit, showToast])

  return (
    <>
      <Modal
        open={open}
        onClose={onClose}
        title={isEditing ? "Edit Step" : "Add Step"}
        primaryAction={{
          content: isEditing ? "Save Changes" : "Add Step",
          onAction: handleSubmit,
        }}
        secondaryActions={[
          {
            content: "Cancel",
            onAction: onClose,
          },
        ]}
      >
        <Modal.Section>
          <LegacyStack vertical spacing="4">
            {error && <Banner status="critical">{error}</Banner>}

            <TextField
              label="Step Name"
              value={formData.name}
              onChange={(value) => {
                setFormData((prev) => ({ ...prev, name: value }))
                setError("")
              }}
              autoComplete="off"
              placeholder="e.g., Select Monitor"
              helpText="Will be visible on the storefront"
            />

            <LegacyStack distribution="equalSpacing">
              <TextField
                label="Minimum Quantity"
                type="number"
                value={formData.minQuantity}
                onChange={(value) => setFormData((prev) => ({ ...prev, minQuantity: value }))}
                min="1"
              />
              <TextField
                label="Maximum Quantity"
                type="number"
                value={formData.maxQuantity}
                onChange={(value) => setFormData((prev) => ({ ...prev, maxQuantity: value }))}
                min="1"
              />
            </LegacyStack>

            <Card>
              <Box padding="4">
                <LegacyStack vertical spacing="2">
                  <Text variant="headingSm" as="h3">
                    Product Selection
                  </Text>
                  <Text tone="subdued">Select collections and customize available products</Text>
                  <Box paddingBlockStart="4">
                    <Button onClick={() => setShowCollections(true)}>
                      {selectedCollections.length > 0 ? "Change Collections" : "Select Collections"}
                    </Button>
                    {selectedCollections.length > 0 && (
                      <Box paddingBlockStart="4">
                        <LegacyStack vertical spacing="2">
                          <LegacyStack distribution="equalSpacing" alignment="center">
                            <Text variant="bodyMd">
                              {selectedCollections.length} collection{selectedCollections.length !== 1 ? "s" : ""}{" "}
                              selected
                            </Text>
                            <Button onClick={() => setShowProducts(true)}>
                              {selectedProducts.length > 0 ? "Edit Products" : "Select Products"}
                            </Button>
                          </LegacyStack>
                          {selectedProducts.length > 0 && (
                            <Text tone="subdued">
                              {selectedProducts.length} product{selectedProducts.length !== 1 ? "s" : ""} selected
                            </Text>
                          )}
                        </LegacyStack>
                      </Box>
                    )}
                  </Box>
                </LegacyStack>
              </Box>
            </Card>
          </LegacyStack>
        </Modal.Section>
      </Modal>

      <CollectionSelectionModal
        open={showCollections}
        onClose={() => setShowCollections(false)}
        onSelect={(collections) => {
          setSelectedCollections(collections)
          setShowCollections(false)
          setShowProducts(true)
          setError("")
        }}
        selectedCollections={selectedCollections}
      />

      <ProductSelectionFromCollectionsModal
        open={showProducts}
        onClose={() => setShowProducts(false)}
        collections={selectedCollections}
        onSave={(products) => {
          setSelectedProducts(products)
          setShowProducts(false)
          setError("")
        }}
        selectedProducts={selectedProducts}
      />
    </>
  )
}

