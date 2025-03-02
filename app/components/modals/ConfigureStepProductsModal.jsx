"use client"

import { useState, useCallback, useEffect } from "react"
import {
  Modal,
  Card,
  ResourceList,
  ResourceItem,
  Thumbnail,
  Text,
  Button,
  ButtonGroup,
  TextField,
  BlockStack,
  InlineStack,
  Spinner,
  EmptyState,
  Banner,
} from "@shopify/polaris"
import { ChevronUp, ChevronDown, Trash2, Plus, Search, X, AlertCircle, Package2 } from "lucide-react"

export function ConfigureStepProductsModal({ open, onClose, step = {}, onSave }) {
  const [products, setProducts] = useState(step?.selections || [])
  const [searchTerm, setSearchTerm] = useState("")
  const [searchResults, setSearchResults] = useState([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState(null)

  // Load search results
  const handleSearch = useCallback(
    async (value) => {
      setSearchTerm(value)
      setIsLoading(true)
      setError(null)

      try {
        // Add category to query if it exists
        const categoryParam = step?.productCategory ? `&category=${encodeURIComponent(step.productCategory)}` : ""

        const response = await fetch(`/api/products-search?q=${encodeURIComponent(value)}${categoryParam}`)
        if (!response.ok) throw new Error("Search failed")
        const data = await response.json()
        setSearchResults(data.items || [])
      } catch (err) {
        setError(err.message)
        setSearchResults([])
      } finally {
        setIsLoading(false)
      }
    },
    [step?.productCategory],
  )

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => {
      if (searchTerm) {
        handleSearch(searchTerm)
      }
    }, 300)

    return () => clearTimeout(timer)
  }, [searchTerm, handleSearch])

  const moveProduct = (index, direction) => {
    const newProducts = [...products]
    const newIndex = direction === "up" ? index - 1 : index + 1

    if (newIndex >= 0 && newIndex < products.length) {
      const temp = newProducts[index]
      newProducts[index] = newProducts[newIndex]
      newProducts[newIndex] = temp
      setProducts(newProducts)
    }
  }

  const handleAddProduct = (product) => {
    setProducts((current) => {
      // Check if product already exists
      if (current.some((p) => p.id === product.id)) {
        return current
      }

      return [
        ...current,
        {
          id: product.id,
          title: product.title,
          imageUrl: product.featuredMedia?.image?.url || product.image?.url,
          variants: product.variants?.edges?.map((edge) => edge.node) || [],
          minQuantity: 1,
          maxQuantity: 1,
          variantMode: "all",
          selectedVariants: [],
        },
      ]
    })
  }

  const handleRemoveProduct = (productId) => {
    setProducts((current) => current.filter((p) => p.id !== productId))
  }

  const handleSave = useCallback(() => {
    onSave(products)
    onClose()
  }, [products, onSave, onClose])

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={`Configure Products${step?.name ? ` for ${step.name}` : ""}`}
      primaryAction={{
        content: "Save Changes",
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
        <BlockStack gap="4">
          {/* Search Section */}
          <Card>
            <BlockStack gap="4">
              <div className="flex items-center justify-between">
                <Text variant="headingMd" as="h3">
                  Add Products
                </Text>
                <div className="flex h-8 w-8 items-center justify-center rounded-md bg-primary/10">
                  <Package2 className="h-5 w-5 text-primary" />
                </div>
              </div>

              <div className="relative">
                <TextField
                  label="Search products"
                  value={searchTerm}
                  onChange={setSearchTerm}
                  placeholder="Search by name..."
                  prefix={<Search className="h-5 w-5" />}
                  clearButton
                  onClearButtonClick={() => setSearchTerm("")}
                />
              </div>

              {error && (
                <Banner status="critical">
                  <div className="flex items-center gap-2">
                    <AlertCircle className="h-5 w-5" />
                    <p>Error loading products: {error}</p>
                  </div>
                </Banner>
              )}

              <div className="min-h-[200px]">
                {isLoading ? (
                  <div className="flex items-center justify-center h-[200px]">
                    <Spinner accessibilityLabel="Loading products" size="large" />
                  </div>
                ) : searchResults.length > 0 ? (
                  <ResourceList
                    items={searchResults}
                    renderItem={(item) => {
                      const isSelected = products.some((p) => p.id === item.id)

                      return (
                        <ResourceItem
                          id={item.id}
                          media={
                            <Thumbnail
                              source={item.featuredMedia?.image?.url || item.image?.url || ""}
                              alt={item.title}
                            />
                          }
                        >
                          <div className="flex items-center justify-between">
                            <div>
                              <Text variant="bodyMd" fontWeight="bold" as="h4">
                                {item.title}
                              </Text>
                              <div className="mt-1">
                                <Text as="p" tone="subdued">
                                  {item.variants?.edges?.length || 0} variants
                                </Text>
                              </div>
                            </div>
                            <Button
                              onClick={() => handleAddProduct(item)}
                              disabled={isSelected}
                              icon={isSelected ? <X className="h-5 w-5" /> : <Plus className="h-5 w-5" />}
                            >
                              {isSelected ? "Added" : "Add"}
                            </Button>
                          </div>
                        </ResourceItem>
                      )
                    }}
                  />
                ) : searchTerm ? (
                  <EmptyState heading="No products found" image="">
                    <p>Try changing your search terms</p>
                  </EmptyState>
                ) : null}
              </div>
            </BlockStack>
          </Card>

          {/* Selected Products Section */}
          <Card>
            <BlockStack gap="4">
              <Text variant="headingMd" as="h3">
                Selected Products ({products.length})
              </Text>

              {products.length === 0 ? (
                <EmptyState heading="No products selected" image="">
                  <p>Search and add products above</p>
                </EmptyState>
              ) : (
                products.map((product, index) => (
                  <Card key={product.id}>
                    <BlockStack gap="4">
                      <ResourceItem media={<Thumbnail source={product.imageUrl || ""} alt={product.title} />}>
                        <div className="flex items-center justify-between">
                          <Text variant="bodyMd" fontWeight="bold" as="h4">
                            {product.title}
                          </Text>
                          <ButtonGroup>
                            <Button
                              icon={<ChevronUp className="h-5 w-5" />}
                              onClick={() => moveProduct(index, "up")}
                              disabled={index === 0}
                            />
                            <Button
                              icon={<ChevronDown className="h-5 w-5" />}
                              onClick={() => moveProduct(index, "down")}
                              disabled={index === products.length - 1}
                            />
                            <Button
                              tone="critical"
                              onClick={() => handleRemoveProduct(product.id)}
                              icon={<Trash2 className="h-5 w-5" />}
                            >
                              Remove
                            </Button>
                          </ButtonGroup>
                        </div>
                      </ResourceItem>

                      <BlockStack gap="4">
                        <InlineStack gap="4">
                          <TextField
                            label="Minimum Quantity"
                            type="number"
                            value={String(product.minQuantity || 1)}
                            onChange={(value) =>
                              setProducts((current) =>
                                current.map((p) =>
                                  p.id === product.id ? { ...p, minQuantity: Number.parseInt(value, 10) } : p,
                                ),
                              )
                            }
                            min="0"
                          />
                          <TextField
                            label="Maximum Quantity"
                            type="number"
                            value={String(product.maxQuantity || 1)}
                            onChange={(value) =>
                              setProducts((current) =>
                                current.map((p) =>
                                  p.id === product.id ? { ...p, maxQuantity: Number.parseInt(value, 10) } : p,
                                ),
                              )
                            }
                            min="1"
                          />
                        </InlineStack>
                      </BlockStack>
                    </BlockStack>
                  </Card>
                ))
              )}
            </BlockStack>
          </Card>
        </BlockStack>
      </Modal.Section>
    </Modal>
  )
}

