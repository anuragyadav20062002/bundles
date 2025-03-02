"use client"

import { useState, useCallback } from "react"
import {
  Modal,
  Card,
  TextField,
  Button,
  Text,
  BlockStack,
  InlineStack,
  Box,
  Select,
  Checkbox,
  Banner,
} from "@shopify/polaris"
import { Plus, Trash2 } from "lucide-react"
import { useToast } from "../ToastProvider"

const DISCOUNT_TYPES = [
  { label: "Percentage Off", value: "percentage" },
  { label: "Fixed Amount Off", value: "fixed" },
]

/**
 * @typedef {import('../../types').Bundle} Bundle
 */

/**
 * @typedef {Object} Rule
 * @property {number} id
 * @property {string} discountOn
 * @property {string} minQuantity
 * @property {string} value
 * @property {string} code
 */

/**
 * @typedef {Object} Messages
 * @property {string} rule1
 * @property {string} rule2
 * @property {string} success
 */

/**
 * @typedef {Object} PricingModalProps
 * @property {boolean} open
 * @property {() => void} onClose
 * @property {Bundle} bundle
 * @property {(data: any) => void} onSave
 */

/** @type {[Rule[], React.Dispatch<React.SetStateAction<Rule[]>>]} */
export function PricingModal({ open, onClose, bundle, onSave }) {
  const { showToast } = useToast()
  const [discountEnabled, setDiscountEnabled] = useState(bundle?.pricing?.status || false)
  const [discountType, setDiscountType] = useState(bundle?.pricing?.type || "percentage")
  /** @type {[Rule[], React.Dispatch<React.SetStateAction<Rule[]>>]} */
  const [rules, setRules] = useState(
    bundle?.pricing?.rules
      ? JSON.parse(bundle.pricing.rules)
      : [
          {
            id: 1,
            discountOn: "quantity",
            minQuantity: "5",
            value: "10",
            code: "EasyBundle",
          },
        ],
  )
  const [showOnFooter, setShowOnFooter] = useState(bundle?.pricing?.showFooter ?? true)
  const [showProgressBar, setShowProgressBar] = useState(bundle?.pricing?.showBar ?? false)
  const [multiLanguage, setMultiLanguage] = useState(false)
  /** @type {[Messages, React.Dispatch<React.SetStateAction<Messages>>]} */
  const [messages, setMessages] = useState({
    rule1: "Add {{discountConditionDiff}} product(s) to get {{discountValue}}{{discountValueUnit}} discount!",
    rule2:
      "Congrats 🎉 Add {{discountConditionDiff}} product(s) more to get {{discountValue}}{{discountValueUnit}} discount!",
    success: "Congratulations 🎉 you have gotten the best offer on your bundle!",
  })

  const handleAddRule = useCallback(() => {
    setRules((current) => [
      ...current,
      {
        id: current.length + 1,
        discountOn: "quantity",
        minQuantity: "",
        value: "",
        code: "EasyBundle",
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

      if (!response.ok) throw new Error("Failed to save pricing rules")

      showToast({ message: "Pricing rules saved successfully" })
      onClose()
    } catch (error) {
      showToast({ message: "Failed to save pricing rules", error: true })
    }
  }, [bundle.id, discountEnabled, discountType, rules, showProgressBar, showOnFooter, onClose, showToast])

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Bundle Pricing & Discounts"
      primaryAction={{
        content: "Save",
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
          <Card>
            <BlockStack gap="4">
              <Box padding="4" borderBlockEndWidth="1" borderColor="border">
                <InlineStack align="space-between">
                  <Text variant="headingMd" as="h2">
                    Discount Settings
                  </Text>
                  <Checkbox label="Enable discounts" checked={discountEnabled} onChange={setDiscountEnabled} />
                </InlineStack>
              </Box>

              {discountEnabled && (
                <Box padding="4">
                  <BlockStack gap="4">
                    <Text tone="subdued">Set up to 10 discount rules from lowest to highest.</Text>
                    <Banner>
                      Tip: Discounts are calculated based on the products in cart, make sure to add the "Default
                      Product" quantity or amount while configuring discounts.
                    </Banner>

                    <Select
                      label="Discount Type"
                      options={DISCOUNT_TYPES}
                      value={discountType}
                      onChange={setDiscountType}
                    />

                    {rules.map((rule, index) => (
                      <Card key={rule.id}>
                        <Box padding="4">
                          <BlockStack gap="4">
                            <InlineStack align="space-between">
                              <Text variant="headingSm">Rule #{rule.id}</Text>
                              {index > 0 && (
                                <Button
                                  tone="critical"
                                  icon={<Trash2 className="h-5 w-5" />}
                                  onClick={() => handleRemoveRule(rule.id)}
                                >
                                  Remove
                                </Button>
                              )}
                            </InlineStack>

                            <div className="grid grid-cols-4 gap-4">
                              <Select
                                label="Discount on"
                                options={[{ label: "Quantity", value: "quantity" }]}
                                value={rule.discountOn}
                                onChange={(value) => handleRuleChange(rule.id, "discountOn", value)}
                              />
                              <TextField
                                label="Minimum quantity"
                                type="number"
                                value={rule.minQuantity}
                                onChange={(value) => handleRuleChange(rule.id, "minQuantity", value)}
                                min="1"
                              />
                              <TextField
                                label={`${discountType === "percentage" ? "Percentage" : "Amount"} Off`}
                                type="number"
                                value={rule.value}
                                onChange={(value) => handleRuleChange(rule.id, "value", value)}
                                min="0"
                                suffix={discountType === "percentage" ? "%" : "$"}
                              />
                              <TextField
                                label="Code"
                                value={rule.code}
                                onChange={(value) => handleRuleChange(rule.id, "code", value)}
                              />
                            </div>
                          </BlockStack>
                        </Box>
                      </Card>
                    ))}

                    {rules.length < 10 && (
                      <Button icon={<Plus className="h-5 w-5" />} onClick={handleAddRule}>
                        Add new rule
                      </Button>
                    )}
                  </BlockStack>
                </Box>
              )}
            </BlockStack>
          </Card>

          {discountEnabled && (
            <Card>
              <BlockStack gap="4">
                <Box padding="4" borderBlockEndWidth="1" borderColor="border">
                  <InlineStack align="space-between">
                    <Text variant="headingMd" as="h2">
                      Discount Messaging
                    </Text>
                    <Checkbox label="Enable multi-language" checked={multiLanguage} onChange={setMultiLanguage} />
                  </InlineStack>
                </Box>

                <Box padding="4">
                  <BlockStack gap="4">
                    <InlineStack gap="4">
                      <Checkbox label="Show on footer" checked={showOnFooter} onChange={setShowOnFooter} />
                      <Checkbox
                        label="Show discount progress bar"
                        checked={showProgressBar}
                        onChange={setShowProgressBar}
                      />
                    </InlineStack>

                    <BlockStack gap="4">
                      <TextField
                        label="Rule 1"
                        value={messages.rule1}
                        onChange={(value) => setMessages((prev) => ({ ...prev, rule1: value }))}
                        multiline={3}
                      />
                      <TextField
                        label="Rule 2"
                        value={messages.rule2}
                        onChange={(value) => setMessages((prev) => ({ ...prev, rule2: value }))}
                        multiline={3}
                      />
                      <TextField
                        label="Discount Success Message"
                        value={messages.success}
                        onChange={(value) => setMessages((prev) => ({ ...prev, success: value }))}
                        multiline={3}
                      />
                    </BlockStack>
                  </BlockStack>
                </Box>
              </BlockStack>
            </Card>
          )}
        </BlockStack>
      </Modal.Section>
    </Modal>
  )
}

