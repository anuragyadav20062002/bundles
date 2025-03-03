"use client"

import { useState, useEffect, useCallback } from "react"
import {
  Modal,
  ResourceList,
  ResourceItem,
  Spinner,
  TextField,
  Button,
  Text,
  Thumbnail,
  Banner,
  Card,
} from "@shopify/polaris"
import { Search } from "lucide-react"

export function ProductSelectionFromCollectionsModal({
  open,
  onClose,
  collections = [],
  onSave,
  selectedProducts = [],
}) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [products, setProducts] = useState([])
  const [selectedProductIds, setSelectedProductIds] = useState(new Set(selectedProducts.map((p) => p.id)))
  const [searchTerm, setSearchTerm] = useState("")

  // Debug log for initial props
  useEffect(() => {
    if (open) {
      console.group("ProductSelectionFromCollectionsModal - Initial State")
      console.log("Collections received:", collections)
      console.log("Selected products received:", selectedProducts)
      console.log("Initial selectedProductIds:", selectedProductIds)
      console.groupEnd()
    }
  }, [open, collections, selectedProducts, selectedProductIds])

  const loadCollectionProducts = useCallback(async () => {
    console.group("loadCollectionProducts")
    console.log("Starting to load products for collections:", collections)
    setLoading(true)
    setError("")

    try {
      const collectionIds = collections.map((c) => c.id).join(",")
      console.log("Collection IDs being fetched:", collectionIds)

      const response = await fetch(`/api/collections-products?collections=${collectionIds}`)
      console.log("API Response status:", response.status)

      if (!response.ok) {
        throw new Error("Failed to load products")
      }

      const data = await response.json()
      console.log("Raw API response data:", data)

      if (!data.products) {
        console.warn("No products array in response:", data)
        throw new Error("Invalid response format")
      }

      // Transform products to match our expected structure
      const transformedProducts = data.products.map((product) => {
        const transformed = {
          id: product.id,
          title: product.title,
          imageUrl: product.imageUrl || product.featuredImage?.url,
          variants: product.variants || [],
          priceRange: product.priceRange,
        }
        console.log("Transformed product:", transformed)
        return transformed
      })

      console.log("All transformed products:", transformedProducts)
      setProducts(transformedProducts)

      // Auto-select all products if none were previously selected
      if (selectedProductIds.size === 0) {
        const newSelectedIds = new Set(transformedProducts.map((p) => p.id))
        console.log("Auto-selecting all products:", newSelectedIds)
        setSelectedProductIds(newSelectedIds)
      }
    } catch (err) {
      console.error("Failed to load collection products:", err)
      setError(err.message)
    } finally {
      setLoading(false)
      console.groupEnd()
    }
  }, [collections, selectedProductIds])

  // Load products when collections change
  useEffect(() => {
    if (open && collections.length > 0) {
      console.log("Collections changed, loading products...")
      loadCollectionProducts()
    }
  }, [open, collections, loadCollectionProducts])

  const filteredProducts = products.filter((product) => product.title.toLowerCase().includes(searchTerm.toLowerCase()))

  const toggleProduct = useCallback((productId) => {
    console.log("Toggling product:", productId)
    setSelectedProductIds((prev) => {
      const next = new Set(prev)
      if (next.has(productId)) {
        next.delete(productId)
      } else {
        next.add(productId)
      }
      console.log("Updated selected products:", Array.from(next))
      return next
    })
  }, [])

  const handleSave = useCallback(() => {
    console.group("handleSave")
    // Get full product objects for selected IDs
    const selectedProductsData = products.filter((p) => selectedProductIds.has(p.id))
    console.log("Products being saved:", selectedProductsData)
    onSave(selectedProductsData)
    onClose()
    console.groupEnd()
  }, [products, selectedProductIds, onSave, onClose])

  const handleSelectAll = useCallback(() => {
    console.log("Selecting all products")
    setSelectedProductIds(new Set(products.map((p) => p.id)))
  }, [products])

  const handleDeselectAll = useCallback(() => {
    console.log("Deselecting all products")
    setSelectedProductIds(new Set())
  }, [])

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={`Select Products from ${collections.length} Collection${collections.length !== 1 ? "s" : ""}`}
      primaryAction={{
        content: `Save Selection (${selectedProductIds.size})`,
        onAction: handleSave,
      }}
      secondaryActions={[
        {
          content: "Cancel",
          onAction: onClose,
        },
      ]}
      large
    >
      <Modal.Section>
        <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
          {error && <Banner status="critical">{error}</Banner>}

          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", gap: "16px" }}>
            <div style={{ flex: 1 }}>
              <TextField
                label="Search products"
                value={searchTerm}
                onChange={setSearchTerm}
                prefix={<Search style={{ width: "20px", height: "20px" }} />}
                placeholder="Search by name..."
                autoComplete="off"
              />
            </div>
            <div style={{ display: "flex", gap: "8px" }}>
              <Button onClick={handleSelectAll} disabled={loading}>
                Select All
              </Button>
              <Button onClick={handleDeselectAll} disabled={loading}>
                Deselect All
              </Button>
            </div>
          </div>

          <Card>
            <div style={{ padding: "16px" }}>
              {loading ? (
                <div style={{ display: "flex", justifyContent: "center", padding: "32px" }}>
                  <Spinner accessibilityLabel="Loading products" size="large" />
                </div>
              ) : (
                <ResourceList
                  items={filteredProducts}
                  renderItem={(product) => {
                    const isSelected = selectedProductIds.has(product.id)
                    return (
                      <ResourceItem
                        id={product.id}
                        onClick={() => toggleProduct(product.id)}
                        media={<Thumbnail source={product.imageUrl || "/placeholder.svg"} alt={product.title} />}
                      >
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                          <div>
                            <Text variant="bodyMd" fontWeight="bold">
                              {product.title}
                            </Text>
                            <div style={{ marginTop: "4px" }}>
                              <Text tone="subdued">
                                {product.variants?.length || 0} variants • From{" "}
                                {product.priceRange?.minVariantPrice?.amount || 0}{" "}
                                {product.priceRange?.minVariantPrice?.currencyCode}
                              </Text>
                            </div>
                          </div>
                          <Button pressed={isSelected}>{isSelected ? "Selected" : "Select"}</Button>
                        </div>
                      </ResourceItem>
                    )
                  }}
                />
              )}

              {!loading && filteredProducts.length === 0 && (
                <div style={{ textAlign: "center", padding: "32px" }}>
                  <Text tone="subdued">
                    {searchTerm ? "No products match your search" : "No products found in selected collections"}
                  </Text>
                </div>
              )}
            </div>
          </Card>
        </div>
      </Modal.Section>
    </Modal>
  )
}

