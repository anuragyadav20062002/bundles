"use client"

import { useState, useCallback, useEffect } from "react"
import { Modal, TextField, Button, Text, Banner, Card, Tabs, Checkbox, SkeletonBodyText } from "@shopify/polaris"
import { ProductSelectionModal } from "./ProductSelectionModal"
import { CollectionSelectionModal } from "./CollectionSelectionModal"
import { ConditionsBuilder } from "./ConditionsBuilder"
import { useToast } from "../ToastProvider"
import { ProductSelectionFromCollectionsModal } from "./ProductSelectionFromCollectionsModal"

export function AddStepModal({ open, onClose, bundle, onSubmit, step = null, isEditing = false }) {
  const { showToast } = useToast()
  const [selectedTab, setSelectedTab] = useState(0)
  const [isLoading, setIsLoading] = useState(isEditing && open)
  const [formData, setFormData] = useState({
    name: "",
    conditions: [{ type: "quantity", operator: "equals", value: "1" }],
    displayVariants: false,
  })
  const [selectedProducts, setSelectedProducts] = useState([])
  const [selectedCollections, setSelectedCollections] = useState([])
  const [error, setError] = useState("")
  const [showProductSelection, setShowProductSelection] = useState(false)
  const [showCollectionSelection, setShowCollectionSelection] = useState(false)
  const [showCollectionProductsModal, setShowCollectionProductsModal] = useState(false)
  const [collectionProducts, setCollectionProducts] = useState([])

  // Initialize form data when editing
  useEffect(() => {
    if (open && isEditing && step) {
      console.group("AddStepModal - Initializing Edit Mode")
      console.log("Step data:", step)

      try {
        // Parse products and collections from JSON strings
        const products = step.products ? JSON.parse(step.products) : []
        const collections = step.collections ? JSON.parse(step.collections) : []

        console.log("Parsed products:", products)
        console.log("Parsed collections:", collections)

        // Convert minQuantity/maxQuantity to conditions
        let conditions = [{ type: "quantity", operator: "equals", value: "1" }]

        if (step.minQuantity && step.maxQuantity) {
          if (step.minQuantity === step.maxQuantity) {
            conditions = [
              {
                type: "quantity",
                operator: "equals",
                value: step.minQuantity.toString(),
              },
            ]
          } else if (step.maxQuantity === 99 || step.maxQuantity > step.minQuantity) {
            conditions = [
              {
                type: "quantity",
                operator: "at_least",
                value: step.minQuantity.toString(),
              },
            ]
          }
        }

        console.log("Converted conditions:", conditions)

        // Set form data
        setFormData({
          name: step.name || "",
          conditions: conditions,
          displayVariants: step.displayVariants || false,
        })

        // Set selected products and collections
        setSelectedProducts(products)
        setSelectedCollections(collections)

        // If collections exist, also set collection products
        if (collections.length > 0) {
          // Filter products that came from collections
          const productsFromCollections = products.filter(
            (product) =>
              product.fromCollection ||
              collections.some(
                (c) => product.collectionId === c.id || (product.collections && product.collections.includes(c.id)),
              ),
          )
          setCollectionProducts(productsFromCollections)
          console.log("Extracted collection products:", productsFromCollections)
        }

        // Set the appropriate tab based on what's selected
        if (collections.length > 0 && products.length === 0) {
          setSelectedTab(1) // Collections tab
        }
      } catch (error) {
        console.error("Error initializing edit form:", error)
        showToast({ message: "Error loading step data", error: true })
      }

      setIsLoading(false)
      console.groupEnd()
    }
  }, [open, isEditing, step, showToast])

  // Reset form when modal closes
  useEffect(() => {
    if (!open) {
      setFormData({
        name: "",
        conditions: [{ type: "quantity", operator: "equals", value: "1" }],
        displayVariants: false,
      })
      setSelectedProducts([])
      setSelectedCollections([])
      setError("")
      setSelectedTab(0)
      setCollectionProducts([])
      setShowCollectionProductsModal(false)
      setIsLoading(false)
    }
  }, [open])

  // Debug log for initial state
  useEffect(() => {
    if (open) {
      console.group("AddStepModal - Current State")
      console.log("Form data:", formData)
      console.log("Selected products:", selectedProducts)
      console.log("Selected collections:", selectedCollections)
      console.log("Collection products:", collectionProducts)
      console.groupEnd()
    }
  }, [open, formData, selectedProducts, selectedCollections, collectionProducts])

  const transformConditionsToMinMax = useCallback((conditions) => {
    const condition = conditions[0]
    if (condition.type === "quantity") {
      switch (condition.operator) {
        case "equals":
          return {
            minQuantity: Number.parseInt(condition.value),
            maxQuantity: Number.parseInt(condition.value),
          }
        case "at_least":
          return {
            minQuantity: Number.parseInt(condition.value),
            maxQuantity: 99,
          }
        default:
          return {
            minQuantity: 1,
            maxQuantity: 1,
          }
      }
    }
    return { minQuantity: 1, maxQuantity: 1 }
  }, [])

  const handleCollectionSelect = useCallback((collections) => {
    console.group("handleCollectionSelect")
    console.log("Selected collections:", collections)
    setSelectedCollections(collections)
    setShowCollectionSelection(false)

    // Automatically show the collection products modal if collections were selected
    if (collections.length > 0) {
      console.log("Opening collection products modal")
      setShowCollectionProductsModal(true)
    }

    setError("")
    console.groupEnd()
  }, [])

  const handleCollectionProductsSelect = useCallback((products) => {
    console.group("handleCollectionProductsSelect")
    console.log("Selected collection products:", products)
    setCollectionProducts(products)
    setShowCollectionProductsModal(false)
    setError("")
    console.groupEnd()
  }, [])

  const handleSubmit = useCallback(() => {
    console.group("handleSubmit")
    console.log("Current form data:", formData)
    console.log("Selected products:", selectedProducts)
    console.log("Collection products:", collectionProducts)
    console.log("Selected collections:", selectedCollections)

    if (!formData.name) {
      setError("Step name is required")
      showToast({ message: "Please enter a step name", error: true })
      console.groupEnd()
      return
    }

    try {
      const { minQuantity, maxQuantity } = transformConditionsToMinMax(formData.conditions)
      console.log("Transformed conditions:", { minQuantity, maxQuantity })

      // Combine directly selected products with collection products
      const allProducts = [...selectedProducts]

      // Add collection products if they're not already selected
      const selectedProductIds = new Set(selectedProducts.map((p) => p.id))
      collectionProducts.forEach((product) => {
        if (!selectedProductIds.has(product.id)) {
          allProducts.push(product)
        }
      })

      console.log("Final combined products:", allProducts)

      const submitData = {
        name: formData.name,
        minQuantity,
        maxQuantity,
        collections: JSON.stringify(selectedCollections),
        products: JSON.stringify(allProducts),
        displayVariants: formData.displayVariants,
      }

      console.log("Submitting data:", submitData)
      onSubmit(submitData)
    } catch (error) {
      console.error("Failed to save step:", error)
      showToast({ message: "Failed to save step", error: true })
    }
    console.groupEnd()
  }, [
    formData,
    selectedProducts,
    selectedCollections,
    collectionProducts,
    onSubmit,
    showToast,
    transformConditionsToMinMax,
  ])

  const tabs = [
    {
      id: "products",
      content: `Products${selectedProducts.length ? ` (${selectedProducts.length})` : ""}`,
      accessibilityLabel: "Products tab",
    },
    {
      id: "collections",
      content: `Collections${selectedCollections.length ? ` (${selectedCollections.length})` : ""}`,
      accessibilityLabel: "Collections tab",
    },
  ]

  return (
    <>
      <Modal
        open={open}
        onClose={onClose}
        title={isEditing ? "Edit Step" : "Add Step"}
        primaryAction={{
          content: isEditing ? "Save Changes" : "Add Step",
          onAction: handleSubmit,
          disabled: isLoading,
        }}
        secondaryActions={[
          {
            content: "Cancel",
            onAction: onClose,
          },
        ]}
      >
        <Modal.Section>
          {isLoading ? (
            <div style={{ padding: "16px" }}>
              <SkeletonBodyText lines={6} />
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
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

              <Card>
                <div style={{ padding: "16px" }}>
                  <Tabs tabs={tabs} selected={selectedTab} onSelect={setSelectedTab} />

                  <div style={{ marginTop: "16px" }}>
                    {selectedTab === 0 ? (
                      <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
                        <Text>Products selected here will be displayed on this step</Text>
                        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                          <Button onClick={() => setShowProductSelection(true)}>
                            {selectedProducts.length > 0 ? "Edit Products" : "Add Products"}
                          </Button>
                          {selectedProducts.length > 0 && (
                            <Text>
                              {selectedProducts.length} Product{selectedProducts.length !== 1 ? "s" : ""} Selected
                            </Text>
                          )}
                        </div>
                        {selectedProducts.length > 0 && (
                          <div style={{ marginTop: "8px", maxHeight: "200px", overflowY: "auto" }}>
                            <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                              {selectedProducts.slice(0, 5).map((product) => (
                                <div key={product.id} style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                                  {product.imageUrl && (
                                    <img
                                      src={product.imageUrl || "/placeholder.svg"}
                                      alt={product.title}
                                      style={{ width: "40px", height: "40px", objectFit: "cover" }}
                                    />
                                  )}
                                  <Text>{product.title}</Text>
                                </div>
                              ))}
                              {selectedProducts.length > 5 && (
                                <Text>And {selectedProducts.length - 5} more products...</Text>
                              )}
                            </div>
                          </div>
                        )}
                        <div style={{ marginTop: "8px" }}>
                          <Checkbox
                            label="Display variants as individual products"
                            checked={formData.displayVariants}
                            onChange={(checked) => setFormData((prev) => ({ ...prev, displayVariants: checked }))}
                          />
                        </div>
                      </div>
                    ) : (
                      <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
                        <Text>Collections selected here will have all their products available in this step</Text>
                        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                          <Button onClick={() => setShowCollectionSelection(true)}>
                            {selectedCollections.length > 0 ? "Edit Collections" : "Select Collections"}
                          </Button>
                          {selectedCollections.length > 0 && (
                            <>
                              <Text>
                                {selectedCollections.length} Collection{selectedCollections.length !== 1 ? "s" : ""}{" "}
                                Selected
                              </Text>
                              <Button onClick={() => setShowCollectionProductsModal(true)}>
                                {collectionProducts.length > 0
                                  ? "Edit Collection Products"
                                  : "Select Collection Products"}
                              </Button>
                            </>
                          )}
                        </div>
                        {selectedCollections.length > 0 && (
                          <div style={{ marginTop: "8px", maxHeight: "200px", overflowY: "auto" }}>
                            <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                              {selectedCollections.map((collection) => (
                                <div key={collection.id} style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                                  <Text>{collection.title}</Text>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                        {collectionProducts.length > 0 && (
                          <Text>Selected {collectionProducts.length} products from collections</Text>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </Card>

              <Card>
                <div style={{ padding: "16px" }}>
                  <div style={{ marginBottom: "16px" }}>
                    <Text variant="headingMd">Conditions</Text>
                    <Text tone="subdued" style={{ marginTop: "4px" }}>
                      Create conditions based on amount or quantity of products added on this step.
                      <br />
                      <strong>Note:</strong> Conditions are only valid on this step
                    </Text>
                  </div>
                  <ConditionsBuilder
                    conditions={formData.conditions}
                    onChange={(conditions) => setFormData((prev) => ({ ...prev, conditions }))}
                  />
                </div>
              </Card>
            </div>
          )}
        </Modal.Section>
      </Modal>

      <ProductSelectionModal
        open={showProductSelection}
        onClose={() => setShowProductSelection(false)}
        selectedProducts={selectedProducts}
        onSelect={(products) => {
          setSelectedProducts(products)
          setShowProductSelection(false)
          setError("")
        }}
      />

      <CollectionSelectionModal
        open={showCollectionSelection}
        onClose={() => setShowCollectionSelection(false)}
        onSelect={handleCollectionSelect}
        selectedCollections={selectedCollections}
      />

      <ProductSelectionFromCollectionsModal
        open={showCollectionProductsModal}
        onClose={() => setShowCollectionProductsModal(false)}
        collections={selectedCollections}
        onSave={handleCollectionProductsSelect}
        selectedProducts={collectionProducts}
      />
    </>
  )
}

