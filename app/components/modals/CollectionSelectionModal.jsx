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
} from "@shopify/polaris"
import { Search } from "lucide-react"

/**
 * @typedef {Object} Collection
 * @property {string} id
 * @property {string} title
 * @property {string} [imageUrl]
 * @property {number} productsCount
 * @property {boolean} hasProducts
 */

/**
 * @typedef {Object} CollectionSelectionModalProps
 * @property {boolean} open
 * @property {() => void} onClose
 * @property {(collections: Collection[]) => void} onSelect
 * @property {Collection[]} [selectedCollections]
 */

/**
 * Modal component for selecting collections
 * @param {CollectionSelectionModalProps} props
 */
export function CollectionSelectionModal({ open, onClose, onSelect, selectedCollections = [] }) {
  /** @type {[string, React.Dispatch<React.SetStateAction<string>>]} */
  const [searchTerm, setSearchTerm] = useState("")
  /** @type {[Collection[], React.Dispatch<React.SetStateAction<Collection[]>>]} */
  const [collections, setCollections] = useState([])
  const [loading, setLoading] = useState(false)
  /** @type {[string, React.Dispatch<React.SetStateAction<string>>]} */
  const [error, setError] = useState("")
  /** @type {[Collection[], React.Dispatch<React.SetStateAction<Collection[]>>]} */
  const [selected, setSelected] = useState(selectedCollections)

  useEffect(() => {
    if (open) {
      handleSearch("")
    }
  }, [open])

  /**
   * @param {string} value
   */
  const handleSearch = useCallback(async (value) => {
    setSearchTerm(value)
    setLoading(true)
    setError("")

    try {
      const response = await fetch(`/api/collections-search?q=${encodeURIComponent(value)}`)
      const data = await response.json()

      if (!response.ok) throw new Error(data.error || "Failed to fetch collections")

      setCollections(data.collections || [])
    } catch (err) {
      console.error("Failed to search collections:", err)
      setError(err instanceof Error ? err.message : "Failed to fetch collections")
      setCollections([])
    } finally {
      setLoading(false)
    }
  }, [])

  /**
   * @param {Collection} collection
   */
  const handleSelect = useCallback((collection) => {
    setSelected((prev) => {
      const exists = prev.some((c) => c.id === collection.id)
      if (exists) {
        return prev.filter((c) => c.id !== collection.id)
      }
      return [...prev, collection]
    })
  }, [])

  const handleSave = useCallback(() => {
    onSelect(selected)
    onClose()
  }, [selected, onSelect, onClose])

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
      title="Select Collections"
      primaryAction={{
        content: `Save Selection${selected.length ? ` (${selected.length})` : ""}`,
        onAction: handleSave,
      }}
      secondaryActions={[
        {
          content: "Cancel",
          onAction: onClose,
        },
      ]}
    >
      <Modal.Section>
        <div className="space-y-4">
          {error && <Banner status="critical">{error}</Banner>}

          <TextField
            label="Search collections"
            value={searchTerm}
            onChange={handleSearch}
            prefix={<Search className="h-5 w-5" />}
            placeholder="Search by name..."
            autoComplete="off"
          />

          {loading ? (
            <div className="flex justify-center py-4">
              <Spinner accessibilityLabel="Loading collections" />
            </div>
          ) : (
            <div className="max-h-[400px] overflow-y-auto">
              <ResourceList
                items={collections}
                renderItem={(collection) => {
                  const isSelected = selected.some((c) => c.id === collection.id)
                  return (
                    <ResourceItem
                      id={collection.id}
                      onClick={() => handleSelect(collection)}
                      media={
                        <Thumbnail
                          source={collection.imageUrl || getPlaceholderImage(collection.title)}
                          alt={collection.title}
                        />
                      }
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <Text variant="bodyMd" fontWeight="bold">
                            {collection.title}
                          </Text>
                          <div className="mt-1">
                            <Text tone={collection.productsCount > 0 ? "default" : "subdued"}>
                              {collection.productsCount} products
                            </Text>
                          </div>
                        </div>
                        <Button
                          pressed={isSelected}
                          disabled={!collection.hasProducts}
                          tone={!collection.hasProducts ? "critical" : undefined}
                        >
                          {!collection.hasProducts ? "Empty" : isSelected ? "Selected" : "Select"}
                        </Button>
                      </div>
                    </ResourceItem>
                  )
                }}
              />
            </div>
          )}

          {collections.length === 0 && !loading && (
            <div className="py-4 text-center">
              <Text tone="subdued">{error ? "An error occurred" : "No collections found"}</Text>
            </div>
          )}
        </div>
      </Modal.Section>
    </Modal>
  )
}

