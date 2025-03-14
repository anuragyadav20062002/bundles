"use client"

import { useCallback, useEffect, useState } from "react"
import { Card, TextField, Button, Text, BlockStack, Select, Checkbox, Banner, Modal } from "@shopify/polaris"
import { Plus, Trash2, Info } from "lucide-react"
import { useToast } from "~/components/ToastProvider"

const DISCOUNT_TYPES = [
  { label: "Fixed Amount Off", value: "fixed" },
  { label: "Percentage Off", value: "percentage" },
  { label: "Fixed Bundle Price", value: "bundle" },
]

export function PricingConfigModal({ open, onClose, bundle, onSave }) {
  const { showToast } = useToast()
  const [isLoading, setIsLoading] = useState(false)

  // Initialize state from bundle data
  const [discountEnabled, setDiscountEnabled] = useState(bundle?.pricing?.status || false)
  const [discountType, setDiscountType] = useState(bundle?.pricing?.type || "fixed")
  const [rules, setRules] = useState(
    bundle?.pricing?.rules
      ? JSON.parse(bundle.pricing.rules)
      : [
          {
            id: 1,
            minQuantity: "2",
            value: "0",
          },
        ],
  )
  const [showOnFooter, setShowOnFooter] = useState(bundle?.pricing?.showFooter ?? true)
  const [showProgressBar, setShowProgressBar] = useState(bundle?.pricing?.showBar ?? false)

  // Reset state when bundle changes
  useEffect(() => {
    if (bundle?.pricing) {
      setDiscountEnabled(bundle.pricing.status || false)
      setDiscountType(bundle.pricing.type || "fixed")
      setRules(
        bundle.pricing.rules
          ? JSON.parse(bundle.pricing.rules)
          : [
              {
                id: 1,
                minQuantity: "2",
                value: "0",
              },
            ],
      )
      setShowOnFooter(bundle.pricing.showFooter ?? true)
      setShowProgressBar(bundle.pricing.showBar ?? false)
    }
  }, [bundle])

  const handleAddRule = useCallback(() => {
    setRules((current) => [
      ...current,
      {
        id: current.length + 1,
        minQuantity: "",
        value: "",
      },
    ])
  }, [])

  const handleRemoveRule = useCallback((ruleId) => {
    setRules((current) => current.filter((rule) => rule.id !== ruleId))
  }, [])

  const handleRuleChange = useCallback((id, field, value) => {
    setRules((current) => current.map((rule) => (rule.id === id ? { ...rule, [field]: value } : rule)))
  }, [])

  const handleSave = useCallback(async () => {
    try {
      setIsLoading(true)

      const pricingData = {
        bundleId: bundle.id,
        type: discountType,
        status: discountEnabled,
        rules: JSON.stringify(rules),
        showFooter: showOnFooter,
        showBar: showProgressBar,
      }

      const response = await fetch(`/api/bundles/${bundle.id}/pricing`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(pricingData),
      })

      if (!response.ok) {
        throw new Error("Failed to save pricing rules")
      }

      const data = await response.json()

      showToast({ message: "Pricing rules saved successfully" })
      onSave(data)
      onClose()
    } catch (error) {
      console.error("Error saving pricing:", error)
      showToast({ message: "Failed to save pricing rules", error: true })
    } finally {
      setIsLoading(false)
    }
  }, [bundle.id, discountEnabled, discountType, rules, showProgressBar, showOnFooter, showToast, onSave, onClose])

  const renderRuleFields = (rule) => {
    switch (discountType) {
      case "fixed":
        return (
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: "16px",
              width: "100%",
            }}
          >
            <TextField
              label="Minimum quantity"
              type="number"
              value={rule.minQuantity}
              onChange={(value) => handleRuleChange(rule.id, "minQuantity", value)}
              min="1"
              autoComplete="off"
            />
            <TextField
              label="Amount Off"
              type="number"
              value={rule.value}
              onChange={(value) => handleRuleChange(rule.id, "value", value)}
              min="0"
              prefix="$"
              autoComplete="off"
            />
          </div>
        )

      case "percentage":
        return (
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: "16px",
              width: "100%",
            }}
          >
            <TextField
              label="Minimum quantity"
              type="number"
              value={rule.minQuantity}
              onChange={(value) => handleRuleChange(rule.id, "minQuantity", value)}
              min="1"
              autoComplete="off"
            />
            <TextField
              label="Percentage Off"
              type="number"
              value={rule.value}
              onChange={(value) => handleRuleChange(rule.id, "value", value)}
              min="0"
              max="100"
              suffix="%"
              autoComplete="off"
            />
          </div>
        )

      case "bundle":
        return (
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: "16px",
              width: "100%",
            }}
          >
            <TextField
              label="Quantity of Products"
              type="number"
              value={rule.minQuantity}
              onChange={(value) => handleRuleChange(rule.id, "minQuantity", value)}
              min="1"
              autoComplete="off"
            />
            <TextField
              label="Bundle Price"
              type="number"
              value={rule.value}
              onChange={(value) => handleRuleChange(rule.id, "value", value)}
              min="0"
              prefix="$"
              autoComplete="off"
            />
          </div>
        )

      default:
        return null
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Bundle Pricing & Discounts"
      primaryAction={{
        content: "Save Changes",
        onAction: handleSave,
        loading: isLoading,
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
        <div style={{ maxWidth: "800px", margin: "0 auto" }}>
          <BlockStack gap="5">
            {/* Discount Settings Section */}
            <Card>
              <div style={{ padding: "20px" }}>
                <BlockStack gap="4">
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      marginBottom: "16px",
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                      <Text variant="headingMd" as="h2">
                        Discount Settings
                      </Text>
                      <Info size={16} style={{ color: "var(--p-text-subdued)" }} />
                    </div>
                    <Checkbox label="Enable discounts" checked={discountEnabled} onChange={setDiscountEnabled} />
                  </div>

                  {discountEnabled && (
                    <BlockStack gap="4">
                      <Banner status="info">
                        Tip: Discounts are calculated based on the products in cart. Configure your rules from lowest to
                        highest discount.
                      </Banner>

                      <Select
                        label="Discount Type"
                        options={DISCOUNT_TYPES}
                        value={discountType}
                        onChange={setDiscountType}
                      />

                      <div style={{ marginTop: "16px" }}>
                        {rules.map((rule, index) => (
                          <Card key={rule.id}>
                            <div style={{ padding: "16px" }}>
                              <BlockStack gap="4">
                                <div
                                  style={{
                                    display: "flex",
                                    justifyContent: "space-between",
                                    alignItems: "center",
                                    marginBottom: "16px",
                                  }}
                                >
                                  <Text variant="headingSm">Rule #{index + 1}</Text>
                                  {index > 0 && (
                                    <Button
                                      tone="critical"
                                      icon={<Trash2 style={{ height: "20px", width: "20px" }} />}
                                      onClick={() => handleRemoveRule(rule.id)}
                                    >
                                      Remove
                                    </Button>
                                  )}
                                </div>
                                {renderRuleFields(rule)}
                              </BlockStack>
                            </div>
                          </Card>
                        ))}

                        {rules.length < 10 && (
                          <div style={{ marginTop: "16px" }}>
                            <Button icon={<Plus style={{ height: "20px", width: "20px" }} />} onClick={handleAddRule}>
                              Add new rule
                            </Button>
                          </div>
                        )}
                      </div>
                    </BlockStack>
                  )}
                </BlockStack>
              </div>
            </Card>

            {/* Display Settings Section */}
            {discountEnabled && (
              <Card>
                <div style={{ padding: "20px" }}>
                  <BlockStack gap="4">
                    <Text variant="headingMd" as="h2">
                      Display Settings
                    </Text>
                    <div
                      style={{
                        display: "flex",
                        gap: "16px",
                        flexWrap: "wrap",
                        marginTop: "8px",
                      }}
                    >
                      <Checkbox label="Show discount bar" checked={showProgressBar} onChange={setShowProgressBar} />
                      <Checkbox label="Show in footer" checked={showOnFooter} onChange={setShowOnFooter} />
                    </div>
                  </BlockStack>
                </div>
              </Card>
            )}
          </BlockStack>
        </div>
      </Modal.Section>
    </Modal>
  )
}

