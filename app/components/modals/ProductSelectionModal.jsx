"use client"

import { useState, useCallback } from "react"
import {
  Modal,
  Tabs,
  ResourceList,
  ResourceItem,
  Thumbnail,
  Text,
  Button,
  TextField,
  Pagination,
} from "@shopify/polaris"

export function ProductSelectionModal({ open, onClose, step, onSelect }) {
  const [selectedTab, setSelectedTab] = useState("products")
  const [searchValue, setSearchValue] = useState("")
  const [items, setItems] = useState([])
  const [isLoading, setIsLoading] = useState(false)
  const [page, setPage] = useState(1)
  const [hasNextPage, setHasNextPage] = useState(false)
  const [selectedItems, setSelectedItems] = useState([])

  const handleSearch = useCallback(
    async (value) => {
      setSearchValue(value)
      setIsLoading(true)
      try {
        const response = await fetch(`/api/products-search?q=${value}&tab=${selectedTab}&page=${page}`)
        const data = await response.json()
        setItems(data.items)
        setHasNextPage(data.hasNextPage)
      } catch (error) {
        console.error("Search error:", error)
      }
      setIsLoading(false)
    },
    [selectedTab, page],
  )

  const handleTabChange = useCallback(
    (selectedTabIndex) => {
      setSelectedTab(selectedTabIndex === 0 ? "products" : "collections")
      setPage(1)
      handleSearch("")
    },
    [handleSearch],
  )

  const handleItemSelect = useCallback((item) => {
    setSelectedItems((current) => {
      const exists = current.some((i) => i.id === item.id)
      if (exists) {
        return current.filter((i) => i.id !== item.id)
      }
      return [...current, item]
    })
  }, [])

  const handleSave = useCallback(() => {
    onSelect(selectedItems)
    onClose()
  }, [selectedItems, onSelect, onClose])

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Select Products"
      primaryAction={{
        content: "Add Selected Items",
        onAction: handleSave,
        disabled: selectedItems.length === 0,
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
          <Tabs
            tabs={[
              { content: "Products", id: "products" },
              { content: "Collections", id: "collections" },
            ]}
            selected={selectedTab === "products" ? 0 : 1}
            onSelect={handleTabChange}
          />

          <TextField
            label="Search"
            value={searchValue}
            onChange={handleSearch}
            placeholder={`Search ${selectedTab}...`}
            clearButton
            onClearButtonClick={() => handleSearch("")}
          />

          <ResourceList
            loading={isLoading}
            items={items}
            renderItem={(item) => {
              const isSelected = selectedItems.some((i) => i.id === item.id)

              return (
                <ResourceItem
                  id={item.id}
                  media={
                    <Thumbnail
                      source={selectedTab === "products" ? item.featuredMedia?.image?.url : item.image?.url}
                      alt={item.title}
                    />
                  }
                  onClick={() => handleItemSelect(item)}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <Text variant="bodyMd" fontWeight="bold" as="h3">
                        {item.title}
                      </Text>
                      <div className="mt-1">
                        {selectedTab === "products" ? (
                          <Text as="p" tone="subdued">
                            {item.variants?.edges?.length || 0} variants
                          </Text>
                        ) : (
                          <Text as="p" tone="subdued">
                            {item.products?.edges?.length || 0} products
                          </Text>
                        )}
                      </div>
                    </div>
                    <Button pressed={isSelected}>{isSelected ? "Selected" : "Select"}</Button>
                  </div>
                </ResourceItem>
              )
            }}
          />

          <div className="flex justify-center">
            <Pagination
              hasPrevious={page > 1}
              onPrevious={() => setPage((p) => p - 1)}
              hasNext={hasNextPage}
              onNext={() => setPage((p) => p + 1)}
            />
          </div>
        </div>
      </Modal.Section>
    </Modal>
  )
}

