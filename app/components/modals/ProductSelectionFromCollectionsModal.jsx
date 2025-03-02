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
  Checkbox,
} from "@shopify/polaris"
import { Search } from "lucide-react"

/**
 * @typedef {Object} Collection
 * @property {string} id
 * @property {string} title
 */

/**
 * @typedef {Object} PriceRange
 * @property {{ amount: string }} minVariantPrice
 */

/**
 * @typedef {Object} Product
 * @property {string} id
 * @property {string} title
 * @property {string} [imageUrl]
 * @property {any[]} [variants]
 * @property {PriceRange} [priceRange]
 */

/**
 * @typedef {Object} ProductSelectionModalProps
 * @property {boolean} open
 * @property {() => void} onClose
 * @property {Collection[]} collections
 * @property {(products: Product[]) => void} onSave
 */

/**
 * Modal component for selecting products from collections
 * @param {ProductSelectionModalProps} props
 */
export function ProductSelectionFromCollectionsModal({ open, onClose, collections, onSave }) {
  const [loading, setLoading] = useState(false)
  /** @type {[string, React.Dispatch<React.SetStateAction<string>>]} */
  const [error, setError] = useState("")
  /** @type {[Product[], React.Dispatch<React.SetStateAction<Product[]>>]} */
  const [products, setProducts] = useState([])
  /** @type {[string[], React.Dispatch<React.SetStateAction<string[]>>]} */
  const [selectedProducts, setSelectedProducts] = useState([])
  const [searchTerm, setSearchTerm] = useState("")

  useEffect(() => {
    if (open && collections.length > 0) {
      loadProducts()
    }
  }, [open, collections])

  const loadProducts = useCallback(async () => {
    setLoading(true)
    setError("")

    try {
      const collectionIds = collections.map((c) => c.id).join(",")
      const response = await fetch(`/api/collections-products?collections=${collectionIds}`)
      const data = await response.json()

      if (!response.ok) throw new Error(data.error || "Failed to load products")

      setProducts(data.products)
      setSelectedProducts(data.products.map((p) => p.id)) // Select all by default
    } catch (err) {
      console.error("Failed to load products:", err)
      setError(err instanceof Error ? err.message : "Failed to load products")
    } finally {
      setLoading(false)
    }
  }, [collections])

  const filteredProducts = products.filter((product) => product.title.toLowerCase().includes(searchTerm.toLowerCase()))

  /**
   * @param {string} productId
   */
  const toggleProduct = useCallback((productId) => {
    setSelectedProducts((prev) => {
      if (prev.includes(productId)) {
        return prev.filter((id) => id !== productId)
      }
      return [...prev, productId]
    })
  }, [])

  const handleSave = useCallback(() => {
    const selectedProductsData = products.filter((p) => selectedProducts.includes(p.id))
    onSave(selectedProductsData)
    onClose()
  }, [products, selectedProducts, onSave, onClose])

  /**
   * @param {string} title
   * @returns {string}
   */
  const getPlaceholderImage = (title) => {
    return `data:image/svg+xml,${encodeURIComponent(`
      <svg width="40" height="40" viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
        <rect width="40" height="40" rx="20" fill="#F1F1F1"/>
        <text x="50%" y="50%" fontFamily="system-ui" fontSize="16" fill="#666" textAnchor="middle" dy=".3em">
          ${title.charAt(0)}
        </text>
      </svg>
    `)}`
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Select Products from Collections"
      primaryAction={{
        content: `Save Selection (${selectedProducts.length})`,
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
        <div className="space-y-4">
          {error && <Banner status="critical">{error}</Banner>}

          <div className="flex items-center justify-between">
            <TextField
              label="Search products"
              value={searchTerm}
              onChange={setSearchTerm}
              prefix={<Search className="h-5 w-5" />}
              placeholder="Search by name..."
              autoComplete="off"
            />
            <div className="flex items-center gap-2">
              <Button onClick={() => setSelectedProducts(products.map((p) => p.id))} disabled={loading}>
                Select All
              </Button>
              <Button onClick={() => setSelectedProducts([])} disabled={loading}>
                Deselect All
              </Button>
            </div>
          </div>

          {loading ? (
            <div className="flex justify-center py-8">
              <Spinner accessibilityLabel="Loading products" size="large" />
            </div>
          ) : (
            <div className="max-h-[500px] overflow-y-auto">
              <ResourceList
                items={filteredProducts}
                renderItem={(product) => {
                  const isSelected = selectedProducts.includes(product.id)
                  return (
                    <ResourceItem
                      id={product.id}
                      onClick={() => toggleProduct(product.id)}
                      media={
                        <Thumbnail
                          source={product.imageUrl || getPlaceholderImage(product.title)}
                          alt={product.title}
                        />
                      }
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <Checkbox checked={isSelected} onChange={() => toggleProduct(product.id)} />
                          <div>
                            <Text variant="bodyMd" fontWeight="bold">
                              {product.title}
                            </Text>
                            <div className="mt-1">
                              <Text tone="subdued">{product.variants?.length || 0} variants</Text>
                            </div>
                          </div>
                        </div>
                        <Text tone="subdued">From {product.priceRange?.minVariantPrice?.amount || 0}</Text>
                      </div>
                    </ResourceItem>
                  )
                }}
              />
            </div>
          )}

          {!loading && filteredProducts.length === 0 && (
            <div className="py-8 text-center">
              <Text tone="subdued">
                {searchTerm ? "No products match your search" : "No products found in selected collections"}
              </Text>
            </div>
          )}
        </div>
      </Modal.Section>
    </Modal>
  )
}

