"use client"

import { json } from "@remix-run/node"
import { useLoaderData, useSubmit } from "@remix-run/react"
import {
  Page,
  Layout,
  Card,
  Tabs,
  ResourceList,
  ResourceItem,
  Thumbnail,
  Text,
  Button,
  Modal,
  TextField,
  ButtonGroup,
  Pagination,
} from "@shopify/polaris"
import { useState, useCallback } from "react"
import { prisma } from "../db.server"
import { authenticate } from "../shopify.server"

/**
 * @typedef {import('../types').BundleStep} BundleStep
 */

/**
 * @typedef {Object} ShopifyProduct
 * @property {string} id
 * @property {string} title
 * @property {string} handle
 * @property {{ image?: { url: string } }} [featuredMedia]
 * @property {{ edges: Array<{ node: ShopifyVariant }> }} variants
 */

/**
 * @typedef {Object} ShopifyVariant
 * @property {string} id
 * @property {string} title
 * @property {string} price
 * @property {string} [compareAtPrice]
 */

/**
 * @typedef {Object} ShopifyCollection
 * @property {string} id
 * @property {string} title
 * @property {string} handle
 * @property {{ url: string }} [image]
 * @property {{ edges: Array<{ node: { id: string, title: string } }> }} products
 */

/**
 * @typedef {Object} LoaderData
 * @property {BundleStep} step
 * @property {Array<ShopifyProduct | ShopifyCollection>} items
 * @property {{ hasNextPage: boolean, hasPreviousPage: boolean, currentPage: number }} pagination
 * @property {string} tab
 */

/**
 * @param {{ request: Request, params: { stepId: string } }} param0
 */
export const loader = async ({ request, params }) => {
  const { admin, session } = await authenticate.admin(request)
  const { stepId } = params

  const url = new URL(request.url)
  const searchParams = new URLSearchParams(url.search)
  const searchTerm = searchParams.get("q") || ""
  const tab = searchParams.get("tab") || "products"
  const page = Number.parseInt(searchParams.get("page") || "1", 10)
  const pageSize = 24

  // Get the step to verify ownership
  const step = await prisma.bundleStep.findFirst({
    where: {
      id: stepId,
      bundle: {
        shopId: session.shop,
      },
    },
    include: {
      selections: true,
    },
  })

  if (!step) {
    throw new Response("Step not found", { status: 404 })
  }

  // Fetch products or collections based on tab
  let items = []
  let hasNextPage = false
  let hasPreviousPage = false

  if (tab === "products") {
    const response = await admin.graphql(
      `#graphql
    query GetProducts($query: String!, $first: Int!, $after: String) {
      products(first: $first, after: $after, query: $query) {
        edges {
          node {
            id
            title
            handle
            featuredMedia {
              ... on MediaImage {
                id
                image {
                  url
                }
              }
            }
            variants(first: 10) {
              edges {
                node {
                  id
                  title
                  price
                  compareAtPrice
                }
              }
            }
          }
        }
        pageInfo {
          hasNextPage
          hasPreviousPage
          endCursor
        }
      }
    }
  `,
      {
        variables: {
          query: `${searchTerm} ${step.productCategory !== "All Products" ? `product_type:${step.productCategory}` : ""}`,
          first: pageSize,
          after: page > 1 ? btoa(`page${page - 1}`) : null,
        },
      },
    )

    const data = await response.json()
    items = data.data.products.edges.map((edge) => edge.node)
    hasNextPage = data.data.products.pageInfo.hasNextPage
    hasPreviousPage = data.data.products.pageInfo.hasPreviousPage
  } else {
    const response = await admin.graphql(
      `#graphql
    query GetCollections($query: String!, $first: Int!, $after: String) {
      collections(first: $first, after: $after, query: $query) {
        edges {
          node {
            id
            title
            handle
            image {
              url
            }
            products {
              edges {
                node {
                  id
                  title
                 
                }
              }
            }
          }
        }
        pageInfo {
          hasNextPage
          hasPreviousPage
          endCursor
        }
      }
    }
  `,
      {
        variables: {
          query: searchTerm,
          first: pageSize,
          after: page > 1 ? btoa(`page${page - 1}`) : null,
        },
      },
    )

    const data = await response.json()
    items = data.data.collections.edges.map((edge) => edge.node)
    hasNextPage = data.data.collections.pageInfo.hasNextPage
    hasPreviousPage = data.data.collections.pageInfo.hasPreviousPage
  }

  return json({
    step,
    items,
    pagination: {
      hasNextPage,
      hasPreviousPage,
      currentPage: page,
    },
    tab,
  })
}

/**
 * @param {{ request: Request, params: { stepId: string } }} param0
 */
export const action = async ({ request, params }) => {
  const { stepId } = params
  const { admin, session } = await authenticate.admin(request)
  const formData = await request.formData()
  const intent = formData.get("intent")

  try {
    if (intent === "add-selection") {
      const type = formData.get("type")
      const resourceId = formData.get("resourceId")
      const variants = formData.get("variants")
      const minQuantity = Number.parseInt(formData.get("minQuantity") || "1", 10)
      const maxQuantity = Number.parseInt(formData.get("maxQuantity") || "1", 10)

      // Get the highest position
      const highestSelection = await prisma.stepSelection.findFirst({
        where: { stepId },
        orderBy: { position: "desc" },
      })

      const position = highestSelection ? highestSelection.position + 1 : 0

      // Create the selection
      await prisma.stepSelection.create({
        data: {
          stepId,
          type,
          resourceId,
          variants: variants ? JSON.parse(variants) : null,
          minQuantity,
          maxQuantity,
          position,
        },
      })

      return json({ status: "success" })
    }

    if (intent === "remove-selection") {
      const selectionId = formData.get("selectionId")
      await prisma.stepSelection.delete({
        where: { id: selectionId },
      })
      return json({ status: "success" })
    }

    return json({ status: "error", message: "Invalid intent" }, { status: 400 })
  } catch (error) {
    console.error("Selection action error:", error)
    return json({ status: "error", message: error.message }, { status: 500 })
  }
}

export default function StepSelections() {
  /** @type {LoaderData} */
  const { step, items, pagination, tab } = useLoaderData()
  const submit = useSubmit()
  const [selectedTab, setSelectedTab] = useState(tab)
  const [searchValue, setSearchValue] = useState("")
  /** @type {[ShopifyProduct | null, React.Dispatch<React.SetStateAction<ShopifyProduct | null>>]} */
  const [selectedItem, setSelectedItem] = useState(null)
  const [showVariantModal, setShowVariantModal] = useState(false)

  const handleTabChange = useCallback(
    (selectedTabIndex) => {
      const newTab = selectedTabIndex === 0 ? "products" : "collections"
      setSelectedTab(newTab)
      const searchParams = new URLSearchParams()
      searchParams.set("tab", newTab)
      submit(searchParams, { replace: true })
    },
    [submit],
  )

  const handleSearch = useCallback(
    (value) => {
      setSearchValue(value)
      const searchParams = new URLSearchParams()
      searchParams.set("q", value)
      searchParams.set("tab", selectedTab)
      submit(searchParams, { replace: true })
    },
    [selectedTab, submit],
  )

  const handleAddSelection = useCallback(
    (item) => {
      if (selectedTab === "products" && item.variants.edges.length > 1) {
        setSelectedItem(item)
        setShowVariantModal(true)
      } else {
        const formData = new FormData()
        formData.append("intent", "add-selection")
        formData.append("type", selectedTab === "products" ? "PRODUCT" : "COLLECTION")
        formData.append("resourceId", item.id)

        if (selectedTab === "products" && item.variants.edges.length === 1) {
          formData.append("variants", JSON.stringify([item.variants.edges[0].node.id]))
        }

        submit(formData, { method: "post" })
      }
    },
    [selectedTab, submit],
  )

  const handleVariantSelection = useCallback(
    (variants) => {
      const formData = new FormData()
      formData.append("intent", "add-selection")
      formData.append("type", "PRODUCT")
      formData.append("resourceId", selectedItem.id)
      formData.append("variants", JSON.stringify(variants))
      submit(formData, { method: "post" })
      setShowVariantModal(false)
      setSelectedItem(null)
    },
    [selectedItem, submit],
  )

  return (
    <Page
      title={`Configure ${step.name}`}
      backAction={{ content: "Back to bundle", url: `/app/bundles/${step.bundle.id}` }}
    >
      <Layout>
        <Layout.Section>
          <Card>
            <Tabs
              tabs={[
                { content: "Products", id: "products" },
                { content: "Collections", id: "collections" },
              ]}
              selected={selectedTab === "products" ? 0 : 1}
              onSelect={handleTabChange}
            />
            <div className="p-4">
              <div className="mb-4">
                <TextField
                  label="Search"
                  value={searchValue}
                  onChange={handleSearch}
                  placeholder={`Search ${selectedTab}...`}
                  clearButton
                  onClearButtonClick={() => handleSearch("")}
                />
              </div>

              <ResourceList
                items={items}
                renderItem={(item) => {
                  const isSelected = step.selections.some((s) => s.resourceId === item.id)

                  return (
                    <ResourceItem
                      id={item.id}
                      media={
                        <Thumbnail
                          source={selectedTab === "products" ? item.featuredMedia?.image?.url : item.image?.url}
                          alt={item.title}
                        />
                      }
                      accessibilityLabel={`View details for ${item.title}`}
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <Text variant="bodyMd" fontWeight="bold" as="h3">
                            {item.title}
                          </Text>
                          <div className="mt-1">
                            {selectedTab === "products" ? (
                              <Text as="p" tone="subdued">
                                {item.variants.edges.length} variants
                              </Text>
                            ) : (
                              <Text as="p" tone="subdued">
                                {item.products.edges.length} products
                              </Text>
                            )}
                          </div>
                        </div>
                        <ButtonGroup>
                          {isSelected ? (
                            <Button
                              tone="critical"
                              onClick={() => {
                                const selection = step.selections.find((s) => s.resourceId === item.id)
                                const formData = new FormData()
                                formData.append("intent", "remove-selection")
                                formData.append("selectionId", selection.id)
                                submit(formData, { method: "post" })
                              }}
                            >
                              Remove
                            </Button>
                          ) : (
                            <Button onClick={() => handleAddSelection(item)}>Add to step</Button>
                          )}
                        </ButtonGroup>
                      </div>
                    </ResourceItem>
                  )
                }}
              />

              <div className="mt-4 flex items-center justify-center">
                <Pagination
                  hasPrevious={pagination.hasPreviousPage}
                  onPrevious={() => {
                    const searchParams = new URLSearchParams()
                    searchParams.set("page", String(pagination.currentPage - 1))
                    searchParams.set("tab", selectedTab)
                    if (searchValue) searchParams.set("q", searchValue)
                    submit(searchParams)
                  }}
                  hasNext={pagination.hasNextPage}
                  onNext={() => {
                    const searchParams = new URLSearchParams()
                    searchParams.set("page", String(pagination.currentPage + 1))
                    searchParams.set("tab", selectedTab)
                    if (searchValue) searchParams.set("q", searchValue)
                    submit(searchParams)
                  }}
                />
              </div>
            </div>
          </Card>
        </Layout.Section>

        <Layout.Section variant="oneThird">
          <Card>
            <div className="p-4">
              <Text variant="headingMd" as="h2">
                Selected Items
              </Text>
              <div className="mt-4">
                {step.selections.length === 0 ? (
                  <Text tone="subdued">No items selected yet</Text>
                ) : (
                  <div className="space-y-4">
                    {step.selections.map((selection) => (
                      <div key={selection.id} className="flex items-center justify-between">
                        <div>
                          <Text variant="bodyMd" as="h3">
                            {selection.type === "PRODUCT" ? "Product" : "Collection"}
                          </Text>
                          <Text tone="subdued">
                            {selection.type === "PRODUCT" &&
                              selection.variants &&
                              `${JSON.parse(selection.variants).length} variants selected`}
                          </Text>
                        </div>
                        <Button
                          tone="critical"
                          onClick={() => {
                            const formData = new FormData()
                            formData.append("intent", "remove-selection")
                            formData.append("selectionId", selection.id)
                            submit(formData, { method: "post" })
                          }}
                        >
                          Remove
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </Card>
        </Layout.Section>
      </Layout>

      {showVariantModal && selectedItem && (
        <VariantSelectionModal
          product={selectedItem}
          onClose={() => {
            setShowVariantModal(false)
            setSelectedItem(null)
          }}
          onSelect={handleVariantSelection}
        />
      )}
    </Page>
  )
}

/**
 * @typedef {Object} VariantSelectionModalProps
 * @property {ShopifyProduct} product
 * @property {() => void} onClose
 * @property {(variants: string[]) => void} onSelect
 */

/**
 * @param {VariantSelectionModalProps} props
 */
function VariantSelectionModal({ product, onClose, onSelect }) {
  /** @type {[string[], React.Dispatch<React.SetStateAction<string[]>>]} */
  const [selectedVariants, setSelectedVariants] = useState([])

  /**
   * @param {string} variantId
   */
  const handleVariantToggle = (variantId) => {
    setSelectedVariants((current) =>
      current.includes(variantId) ? current.filter((id) => id !== variantId) : [...current, variantId],
    )
  }

  return (
    <Modal
      open
      onClose={onClose}
      title="Select Variants"
      primaryAction={{
        content: "Add selected variants",
        onAction: () => onSelect(selectedVariants),
        disabled: selectedVariants.length === 0,
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
          {product.variants.edges.map(({ node: variant }) => (
            <div key={variant.id} className="flex items-center justify-between p-2 hover:bg-surface rounded">
              <div>
                <Text variant="bodyMd" as="h3">
                  {variant.title}
                </Text>
                <Text tone="subdued">
                  ${variant.price}
                  {variant.compareAtPrice && <span className="ml-2 line-through">${variant.compareAtPrice}</span>}
                </Text>
              </div>
              <Button onClick={() => handleVariantToggle(variant.id)} pressed={selectedVariants.includes(variant.id)}>
                {selectedVariants.includes(variant.id) ? "Selected" : "Select"}
              </Button>
            </div>
          ))}
        </div>
      </Modal.Section>
    </Modal>
  )
}

