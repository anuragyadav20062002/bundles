"use client"

import { useState, useCallback, useEffect } from "react"
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
  Checkbox,
  Collapsible,
} from "@shopify/polaris"
import { Search, ChevronDown, ChevronUp } from "lucide-react"

export function ProductSelectionModal({
  open,
  onClose,
  selectedProducts = [],
  onSelect,
  displayVariantsAsProducts = false,
}) {
  const [searchTerm, setSearchTerm] = useState("")
  const [products, setProducts] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [selected, setSelected] = useState(new Map())
  const [expandedProducts, setExpandedProducts] = useState(new Set())
  const [selectedVariants, setSelectedVariants] = useState(new Map())

  // Initialize selected products and variants
  useEffect(() => {
    if (open) {
      console.log("Modal opened, initializing with selected products:", selectedProducts)
      const productMap = new Map()
      const variantMap = new Map()

      selectedProducts.forEach((product) => {
        productMap.set(product.id, product)
        if (product.variants) {
          product.variants.forEach((variant) => {
            if (variant.selected) {
              variantMap.set(variant.id, variant)
            }
          })
        }
      })

      setSelected(productMap)
      setSelectedVariants(variantMap)
      setSearchTerm("")
      handleSearch("")
    }
  }, [open, selectedProducts])

  const transformApiProduct = useCallback((apiProduct) => {
    console.log("Transforming API product:", apiProduct)
    return {
      id: apiProduct.id,
      title: apiProduct.title,
      imageUrl: apiProduct.featuredMedia?.image?.url || null,
      variants:
        apiProduct.variants?.edges?.map((edge) => ({
          id: edge.node.id,
          title: edge.node.title,
          price: edge.node.price,
          compareAtPrice: edge.node.compareAtPrice,
        })) || [],
    }
  }, [])

  const handleSearch = useCallback(
    async (value) => {
      console.log("Searching products with term:", value)
      setSearchTerm(value)
      setLoading(true)
      setError("")

      try {
        const response = await fetch(`/api/products-search?q=${encodeURIComponent(value)}&tab=products`)
        console.log("API Response status:", response.status)

        if (!response.ok) throw new Error("Failed to fetch products")

        const data = await response.json()
        console.log("API Response data:", data)

        // Transform API data to match our component's structure
        const transformedProducts = data.items.map(transformApiProduct)
        console.log("Transformed products:", transformedProducts)

        setProducts(transformedProducts)
      } catch (err) {
        console.error("Search error:", err)
        setError(err.message)
      } finally {
        setLoading(false)
      }
    },
    [transformApiProduct],
  )

  const toggleProduct = useCallback(
    (product) => {
      console.log("Toggling product:", product)
      setSelected((prev) => {
        const next = new Map(prev)
        if (next.has(product.id)) {
          console.log("Removing product:", product.id)
          next.delete(product.id)
          // Remove all variants of this product
          setSelectedVariants((prevVariants) => {
            const nextVariants = new Map(prevVariants)
            product.variants?.forEach((variant) => {
              nextVariants.delete(variant.id)
            })
            return nextVariants
          })
        } else {
          console.log("Adding product:", product.id)
          next.set(product.id, product)
          // If not displaying variants individually, select all variants
          if (!displayVariantsAsProducts && product.variants) {
            setSelectedVariants((prevVariants) => {
              const nextVariants = new Map(prevVariants)
              product.variants.forEach((variant) => {
                nextVariants.set(variant.id, variant)
              })
              return nextVariants
            })
          }
        }
        return next
      })
    },
    [displayVariantsAsProducts],
  )

  const toggleVariant = useCallback((product, variant) => {
    console.log("Toggling variant:", variant, "of product:", product)
    setSelectedVariants((prev) => {
      const next = new Map(prev)
      if (next.has(variant.id)) {
        next.delete(variant.id)
        // If no variants selected, remove product
        if (!next.size) {
          setSelected((prevSelected) => {
            const nextSelected = new Map(prevSelected)
            nextSelected.delete(product.id)
            return nextSelected
          })
        }
      } else {
        next.set(variant.id, variant)
        // Ensure product is selected
        setSelected((prevSelected) => {
          const nextSelected = new Map(prevSelected)
          nextSelected.set(product.id, product)
          return nextSelected
        })
      }
      return next
    })
  }, [])

  const toggleProductExpand = useCallback((productId) => {
    console.log("Toggling product expansion:", productId)
    setExpandedProducts((prev) => {
      const next = new Set(prev)
      if (next.has(productId)) {
        next.delete(productId)
      } else {
        next.add(productId)
      }
      return next
    })
  }, [])

  const handleSave = useCallback(() => {
    const selectedProductsArray = Array.from(selected.values()).map((product) => ({
      ...product,
      variants: product.variants?.map((variant) => ({
        ...variant,
        selected: selectedVariants.has(variant.id),
      })),
    }))
    console.log("Saving selected products:", selectedProductsArray)
    onSelect(selectedProductsArray)
    onClose()
  }, [selected, selectedVariants, onSelect, onClose])

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Select Products"
      primaryAction={{
        content: `Save Selection (${selected.size})`,
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

          <TextField
            label="Search products"
            value={searchTerm}
            onChange={handleSearch}
            prefix={<Search style={{ width: "20px", height: "20px" }} />}
            placeholder="Search by title, SKU, or vendor..."
            autoComplete="off"
          />

          <Card>
            <div style={{ padding: "16px" }}>
              {loading ? (
                <div style={{ display: "flex", justifyContent: "center", padding: "32px" }}>
                  <Spinner accessibilityLabel="Loading products" size="large" />
                </div>
              ) : (
                <ResourceList
                  items={products}
                  renderItem={(product) => {
                    const isSelected = selected.has(product.id)
                    const isExpanded = expandedProducts.has(product.id)
                    const hasSelectedVariants = product.variants?.some((v) => selectedVariants.has(v.id))

                    return (
                      <ResourceItem
                        id={product.id}
                        onClick={() =>
                          displayVariantsAsProducts ? toggleProductExpand(product.id) : toggleProduct(product)
                        }
                        media={<Thumbnail source={product.imageUrl || "/placeholder.svg"} alt={product.title} />}
                      >
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                          <div style={{ flex: 1 }}>
                            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                              {!displayVariantsAsProducts && (
                                <Checkbox checked={isSelected} onChange={() => toggleProduct(product)} />
                              )}
                              <div>
                                <Text variant="bodyMd" fontWeight="bold">
                                  {product.title}
                                </Text>
                                <div style={{ marginTop: "4px" }}>
                                  <Text tone="subdued">{product.variants?.length || 0} variants</Text>
                                </div>
                              </div>
                            </div>

                            <Collapsible open={isExpanded} id={`variants-${product.id}`}>
                              <div style={{ marginTop: "12px", paddingLeft: "32px" }}>
                                {product.variants?.map((variant) => (
                                  <div
                                    key={variant.id}
                                    style={{
                                      display: "flex",
                                      alignItems: "center",
                                      padding: "8px 0",
                                      gap: "8px",
                                    }}
                                  >
                                    <Checkbox
                                      checked={selectedVariants.has(variant.id)}
                                      onChange={() => toggleVariant(product, variant)}
                                    />
                                    <Text>{variant.title}</Text>
                                    <Text tone="subdued">{variant.sku}</Text>
                                    <Text>{variant.price}</Text>
                                  </div>
                                ))}
                              </div>
                            </Collapsible>
                          </div>

                          {product.variants?.length > 0 && displayVariantsAsProducts && (
                            <Button
                              icon={
                                isExpanded ? (
                                  <ChevronUp style={{ width: "20px", height: "20px" }} />
                                ) : (
                                  <ChevronDown style={{ width: "20px", height: "20px" }} />
                                )
                              }
                              onClick={() => toggleProductExpand(product.id)}
                              plain
                            />
                          )}
                        </div>
                      </ResourceItem>
                    )
                  }}
                />
              )}

              {!loading && products.length === 0 && (
                <div style={{ textAlign: "center", padding: "32px" }}>
                  <Text tone="subdued">
                    {searchTerm ? "No products match your search" : "Search for products to add"}
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

