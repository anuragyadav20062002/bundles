"use client"

import { useState, useEffect, useCallback } from "react"
import {
  Modal,
  Card,
  Text,
  BlockStack,
  Box,
  InlineStack,
  Banner,
  List,
  Tabs,
  Button,
  Spinner,
  Checkbox,
  Scrollable,
} from "@shopify/polaris"
import { XIcon } from "@shopify/polaris-icons"

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
  const [isLoading, setIsLoading] = useState(false)
  const [selectedTab, setSelectedTab] = useState(0)

  // State for products and collections
  const [selectedProducts, setSelectedProducts] = useState([])
  const [selectedCollections, setSelectedCollections] = useState([])

  // List state
  const [products, setProducts] = useState([])
  const [collections, setCollections] = useState([])
  const [loadingProducts, setLoadingProducts] = useState(false)
  const [loadingCollections, setLoadingCollections] = useState(false)
  const [hasMoreProducts, setHasMoreProducts] = useState(false)
  const [hasMoreCollections, setHasMoreCollections] = useState(false)
  const [productsCursor, setProductsCursor] = useState(null)
  const [collectionsCursor, setCollectionsCursor] = useState(null)

  useEffect(() => {
    if (open) {
      setError(null)
      setIsPublishing(false)
      setSelectedProducts([])
      setSelectedCollections([])
      setSelectedTab(0)

      // Reset pagination
      setProductsCursor(null)
      setCollectionsCursor(null)

      // Load initial data
      fetchProducts()
      fetchCollections()

      // If bundle already has matching settings, load them
      if (bundle.matching) {
        try {
          const matching = typeof bundle.matching === "string" ? JSON.parse(bundle.matching) : bundle.matching

          if (matching.type === "products" && matching.rules) {
            setSelectedProducts(Array.isArray(matching.rules) ? matching.rules : [])
            setSelectedTab(0)
          } else if (matching.type === "collections" && matching.rules) {
            setSelectedCollections(Array.isArray(matching.rules) ? matching.rules : [])
            setSelectedTab(1)
          }
        } catch (err) {
          console.error("Error parsing bundle matching:", err)
        }
      }
    }
  }, [open, bundle])

  const fetchProducts = async (cursor = null) => {
    try {
      setLoadingProducts(true)
      const url = `/api/publish/products/list${cursor ? `?cursor=${encodeURIComponent(cursor)}` : ""}`
      const response = await fetch(url)

      if (!response.ok) {
        throw new Error("Failed to fetch products")
      }

      const data = await response.json()

      if (cursor) {
        // Append to existing products
        setProducts((prev) => [...prev, ...data.products])
      } else {
        // Replace products
        setProducts(data.products)
      }

      setHasMoreProducts(data.pageInfo.hasNextPage)
      setProductsCursor(data.pageInfo.endCursor)
    } catch (err) {
      console.error("Error fetching products:", err)
      setError("Failed to load products: " + err.message)
    } finally {
      setLoadingProducts(false)
    }
  }

  const fetchCollections = async (cursor = null) => {
    try {
      setLoadingCollections(true)
      const url = `/api/publish/collections/list${cursor ? `?cursor=${encodeURIComponent(cursor)}` : ""}`
      const response = await fetch(url)

      if (!response.ok) {
        throw new Error("Failed to fetch collections")
      }

      const data = await response.json()

      if (cursor) {
        // Append to existing collections
        setCollections((prev) => [...prev, ...data.collections])
      } else {
        // Replace collections
        setCollections(data.collections)
      }

      setHasMoreCollections(data.pageInfo.hasNextPage)
      setCollectionsCursor(data.pageInfo.endCursor)
    } catch (err) {
      console.error("Error fetching collections:", err)
      setError("Failed to load collections: " + err.message)
    } finally {
      setLoadingCollections(false)
    }
  }

  const handleLoadMoreProducts = () => {
    if (hasMoreProducts && productsCursor) {
      fetchProducts(productsCursor)
    }
  }

  const handleLoadMoreCollections = () => {
    if (hasMoreCollections && collectionsCursor) {
      fetchCollections(collectionsCursor)
    }
  }

  const isProductSelected = (productId) => {
    return selectedProducts.some((p) => p.id === productId)
  }

  const isCollectionSelected = (collectionId) => {
    return selectedCollections.some((c) => c.id === collectionId)
  }

  const handleToggleProduct = (product) => {
    if (isProductSelected(product.id)) {
      handleRemoveProduct(product.id)
    } else {
      // Only add if not already selected
      if (!selectedProducts.some((p) => p.id === product.id)) {
        setSelectedProducts((prev) => [...prev, product])
      }
    }
  }

  const handleToggleCollection = (collection) => {
    if (isCollectionSelected(collection.id)) {
      handleRemoveCollection(collection.id)
    } else {
      // Only add if not already selected
      if (!selectedCollections.some((c) => c.id === collection.id)) {
        setSelectedCollections((prev) => [...prev, collection])
      }
    }
  }

  const handleRemoveProduct = (productId) => {
    setSelectedProducts((prev) => prev.filter((product) => product.id !== productId))
  }

  const handleRemoveCollection = (collectionId) => {
    setSelectedCollections((prev) => prev.filter((collection) => collection.id !== collectionId))
  }

  const handlePublish = useCallback(async () => {
    if (isPublishing) return

    // Validate based on selected tab
    if (selectedTab === 0 && selectedProducts.length === 0) {
      setError("Please select at least one product before publishing")
      return
    } else if (selectedTab === 1 && selectedCollections.length === 0) {
      setError("Please select at least one collection before publishing")
      return
    }

    try {
      setIsPublishing(true)
      setError(null)

      // Prepare the matching data based on the selected tab
      let matchingData = {}

      if (selectedTab === 0) {
        matchingData = {
          type: "products",
          rules: selectedProducts,
        }
      } else if (selectedTab === 1) {
        matchingData = {
          type: "collections",
          rules: selectedCollections,
        }
      }

      const response = await fetch(`/api/bundles/${bundle.id}/publish`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          productMatching: matchingData,
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
  }, [bundle.id, selectedProducts, selectedCollections, selectedTab, onPublish, onClose, isPublishing])

  const tabs = [
    {
      id: "products",
      content: "Products",
      accessibilityLabel: "Products",
      panelID: "products-panel",
    },
    {
      id: "collections",
      content: "Collections",
      accessibilityLabel: "Collections",
      panelID: "collections-panel",
    },
  ]

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Publish Bundle"
      primaryAction={{
        content: isPublishing ? "Publishing..." : "Publish to Store",
        onAction: handlePublish,
        loading: isPublishing,
        disabled:
          (selectedTab === 0 && selectedProducts.length === 0) ||
          (selectedTab === 1 && selectedCollections.length === 0) ||
          isLoading ||
          isPublishing,
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
          {error && <Banner status="critical">{error}</Banner>}

          <Card>
            <BlockStack gap="4">
              <Box padding="4" borderBlockEndWidth="1" borderColor="border">
                <InlineStack align="space-between">
                  <BlockStack gap="2">
                    <Text variant="headingMd" as="h2">
                      Bundle Visibility
                    </Text>
                    <Text tone="subdued">Select where this bundle should appear in your store</Text>
                  </BlockStack>
                  <div
                    style={{
                      width: "40px",
                      height: "40px",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      borderRadius: "8px",
                      backgroundColor: "rgba(0, 128, 96, 0.1)",
                    }}
                  >
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <path
                        d="M9 7H7C5.89543 7 5 7.89543 5 9V17C5 18.1046 5.89543 19 7 19H15C16.1046 19 17 18.1046 17 17V15"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                      <path
                        d="M9 15H13L20 8C21.1046 6.89543 21.1046 5.10457 20 4C18.8954 2.89543 17.1046 2.89543 16 4L9 11V15Z"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                      <path
                        d="M16 4L20 8"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  </div>
                </InlineStack>
              </Box>

              <Box padding="4">
                <BlockStack gap="4">
                  <Tabs tabs={tabs} selected={selectedTab} onSelect={setSelectedTab} />

                  {/* Products Tab */}
                  {selectedTab === 0 && (
                    <div style={{ marginTop: "16px" }}>
                      <div
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "center",
                          marginBottom: "12px",
                        }}
                      >
                        <Text variant="headingSm" as="h3">
                          Available Products
                        </Text>
                        <Text variant="bodySm" as="span">
                          {selectedProducts.length} selected
                        </Text>
                      </div>

                      {/* Products List */}
                      <div
                        style={{ border: "1px solid var(--p-border-subdued)", borderRadius: "4px", height: "300px" }}
                      >
                        <Scrollable shadow style={{ height: "300px" }}>
                          {loadingProducts && products.length === 0 ? (
                            <div style={{ display: "flex", justifyContent: "center", padding: "20px" }}>
                              <Spinner size="small" />
                            </div>
                          ) : (
                            <div>
                              {products.map((product) => (
                                <div
                                  key={product.id}
                                  style={{
                                    padding: "8px 12px",
                                    display: "flex",
                                    alignItems: "center",
                                    borderBottom: "1px solid var(--p-border-subdued)",
                                    cursor: "pointer",
                                    backgroundColor: isProductSelected(product.id)
                                      ? "var(--p-surface-selected)"
                                      : "transparent",
                                  }}
                                  onClick={() => handleToggleProduct(product)}
                                >
                                  <Checkbox
                                    label=""
                                    checked={isProductSelected(product.id)}
                                    onChange={() => handleToggleProduct(product)}
                                    labelHidden
                                  />
                                  {product.image && (
                                    <img
                                      src={product.image || "/placeholder.svg"}
                                      alt={product.title}
                                      style={{
                                        width: "32px",
                                        height: "32px",
                                        objectFit: "cover",
                                        marginLeft: "8px",
                                        marginRight: "12px",
                                        borderRadius: "4px",
                                      }}
                                    />
                                  )}
                                  <div style={{ flex: 1 }}>
                                    <Text variant="bodyMd" fontWeight="medium">
                                      {product.title}
                                    </Text>
                                  </div>
                                </div>
                              ))}

                              {hasMoreProducts && (
                                <div style={{ padding: "12px", textAlign: "center" }}>
                                  <Button onClick={handleLoadMoreProducts} loading={loadingProducts}>
                                    Load more products
                                  </Button>
                                </div>
                              )}
                            </div>
                          )}
                        </Scrollable>
                      </div>

                      {/* Selected Products */}
                      <div style={{ marginTop: "16px" }}>
                        <Text variant="headingSm" as="h3">
                          Selected Products:
                        </Text>
                        <div style={{ marginTop: "8px" }}>
                          {selectedProducts.length > 0 ? (
                            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px" }}>
                              {selectedProducts.map((product) => (
                                <div
                                  key={product.id}
                                  style={{
                                    display: "flex",
                                    alignItems: "center",
                                    border: "1px solid var(--p-border-subdued)",
                                    borderRadius: "4px",
                                    padding: "8px",
                                  }}
                                >
                                  {product.image && (
                                    <img
                                      src={product.image || "/placeholder.svg"}
                                      alt={product.title}
                                      style={{
                                        width: "40px",
                                        height: "40px",
                                        objectFit: "cover",
                                        marginRight: "8px",
                                      }}
                                    />
                                  )}
                                  <div style={{ flex: "1", minWidth: "0" }}>
                                    <Text variant="bodyMd" fontWeight="medium" as="p" truncate>
                                      {product.title}
                                    </Text>
                                  </div>
                                  {!isPublishing && (
                                    <Button
                                      plain
                                      destructive
                                      onClick={() => handleRemoveProduct(product.id)}
                                      accessibilityLabel={`Remove ${product.title}`}
                                      icon={XIcon}
                                    />
                                  )}
                                </div>
                              ))}
                            </div>
                          ) : (
                            <Text tone="subdued" as="p" style={{ marginTop: "8px" }}>
                              No products selected yet
                            </Text>
                          )}
                        </div>

                        {selectedProducts.length === 0 && (
                          <Banner status="warning" style={{ marginTop: "16px" }}>
                            Please select at least one product to enable bundle matching
                          </Banner>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Collections Tab */}
                  {selectedTab === 1 && (
                    <div style={{ marginTop: "16px" }}>
                      <div
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "center",
                          marginBottom: "12px",
                        }}
                      >
                        <Text variant="headingSm" as="h3">
                          Available Collections
                        </Text>
                        <Text variant="bodySm" as="span">
                          {selectedCollections.length} selected
                        </Text>
                      </div>

                      {/* Collections List */}
                      <div
                        style={{ border: "1px solid var(--p-border-subdued)", borderRadius: "4px", height: "300px" }}
                      >
                        <Scrollable shadow style={{ height: "300px" }}>
                          {loadingCollections && collections.length === 0 ? (
                            <div style={{ display: "flex", justifyContent: "center", padding: "20px" }}>
                              <Spinner size="small" />
                            </div>
                          ) : (
                            <div>
                              {collections.map((collection) => (
                                <div
                                  key={collection.id}
                                  style={{
                                    padding: "8px 12px",
                                    display: "flex",
                                    alignItems: "center",
                                    borderBottom: "1px solid var(--p-border-subdued)",
                                    cursor: "pointer",
                                    backgroundColor: isCollectionSelected(collection.id)
                                      ? "var(--p-surface-selected)"
                                      : "transparent",
                                  }}
                                  onClick={() => handleToggleCollection(collection)}
                                >
                                  <Checkbox
                                    label=""
                                    checked={isCollectionSelected(collection.id)}
                                    onChange={() => handleToggleCollection(collection)}
                                    labelHidden
                                  />
                                  {collection.image && (
                                    <img
                                      src={collection.image || "/placeholder.svg"}
                                      alt={collection.title}
                                      style={{
                                        width: "32px",
                                        height: "32px",
                                        objectFit: "cover",
                                        marginLeft: "8px",
                                        marginRight: "12px",
                                        borderRadius: "4px",
                                      }}
                                    />
                                  )}
                                  <div style={{ flex: 1 }}>
                                    <Text variant="bodyMd" fontWeight="medium">
                                      {collection.title}
                                    </Text>
                                  </div>
                                </div>
                              ))}

                              {hasMoreCollections && (
                                <div style={{ padding: "12px", textAlign: "center" }}>
                                  <Button onClick={handleLoadMoreCollections} loading={loadingCollections}>
                                    Load more collections
                                  </Button>
                                </div>
                              )}
                            </div>
                          )}
                        </Scrollable>
                      </div>

                      {/* Selected Collections */}
                      <div style={{ marginTop: "16px" }}>
                        <Text variant="headingSm" as="h3">
                          Selected Collections:
                        </Text>
                        <div style={{ marginTop: "8px" }}>
                          {selectedCollections.length > 0 ? (
                            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px" }}>
                              {selectedCollections.map((collection) => (
                                <div
                                  key={collection.id}
                                  style={{
                                    display: "flex",
                                    alignItems: "center",
                                    border: "1px solid var(--p-border-subdued)",
                                    borderRadius: "4px",
                                    padding: "8px",
                                  }}
                                >
                                  {collection.image && (
                                    <img
                                      src={collection.image || "/placeholder.svg"}
                                      alt={collection.title}
                                      style={{
                                        width: "40px",
                                        height: "40px",
                                        objectFit: "cover",
                                        marginRight: "8px",
                                      }}
                                    />
                                  )}
                                  <div style={{ flex: "1", minWidth: "0" }}>
                                    <Text variant="bodyMd" fontWeight="medium" as="p" truncate>
                                      {collection.title}
                                    </Text>
                                  </div>
                                  {!isPublishing && (
                                    <Button
                                      plain
                                      destructive
                                      onClick={() => handleRemoveCollection(collection.id)}
                                      accessibilityLabel={`Remove ${collection.title}`}
                                      icon={XIcon}
                                    />
                                  )}
                                </div>
                              ))}
                            </div>
                          ) : (
                            <Text tone="subdued" as="p" style={{ marginTop: "8px" }}>
                              No collections selected yet
                            </Text>
                          )}
                        </div>

                        {selectedCollections.length === 0 && (
                          <Banner status="warning" style={{ marginTop: "16px" }}>
                            Please select at least one collection to enable bundle matching
                          </Banner>
                        )}
                      </div>
                    </div>
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
                    <List.Item>It will appear on products based on your selection</List.Item>
                    <List.Item>You can edit the bundle settings in the theme customizer</List.Item>
                  </List>

                  <Banner status="info">
                    {selectedTab === 0 && "The bundle will appear only on the specific products you selected"}
                    {selectedTab === 1 && "The bundle will appear on all products within the selected collections"}
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

