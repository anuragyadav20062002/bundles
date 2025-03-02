"use client"

import { useState, useCallback } from "react"
import { Modal, Card, TextField, Text, BlockStack, Checkbox, ColorPicker } from "@shopify/polaris"

export function AdvancedSettingsModal({ open, onClose, bundle, onSave }) {
  const [settings, setSettings] = useState({
    theme: {
      primaryColor: bundle?.settings?.theme?.primaryColor || "#000000",
      backgroundColor: bundle?.settings?.theme?.backgroundColor || "#ffffff",
    },
    language: {
      addToCartButton: bundle?.settings?.language?.addToCartButton || "Add to Cart",
      nextStepButton: bundle?.settings?.language?.nextStepButton || "Next Step",
    },
    showQuantityRules: bundle?.settings?.showQuantityRules ?? true,
    allowSkipSteps: bundle?.settings?.allowSkipSteps ?? false,
  })

  const handleSave = useCallback(() => {
    onSave(settings)
    onClose()
  }, [settings, onSave, onClose])

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Advanced Settings"
      primaryAction={{
        content: "Save Settings",
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
        <BlockStack gap="4">
          <Card>
            <BlockStack gap="4">
              <Text variant="headingMd" as="h3">
                Theme Customization
              </Text>
              <div>
                <Text>Primary Color</Text>
                <ColorPicker
                  color={settings.theme.primaryColor}
                  onChange={(color) =>
                    setSettings((s) => ({
                      ...s,
                      theme: { ...s.theme, primaryColor: color },
                    }))
                  }
                />
              </div>
              <div>
                <Text>Background Color</Text>
                <ColorPicker
                  color={settings.theme.backgroundColor}
                  onChange={(color) =>
                    setSettings((s) => ({
                      ...s,
                      theme: { ...s.theme, backgroundColor: color },
                    }))
                  }
                />
              </div>
            </BlockStack>
          </Card>

          <Card>
            <BlockStack gap="4">
              <Text variant="headingMd" as="h3">
                Custom Text
              </Text>
              <TextField
                label="Add to Cart Button"
                value={settings.language.addToCartButton}
                onChange={(value) =>
                  setSettings((s) => ({
                    ...s,
                    language: { ...s.language, addToCartButton: value },
                  }))
                }
              />
              <TextField
                label="Next Step Button"
                value={settings.language.nextStepButton}
                onChange={(value) =>
                  setSettings((s) => ({
                    ...s,
                    language: { ...s.language, nextStepButton: value },
                  }))
                }
              />
            </BlockStack>
          </Card>

          <Card>
            <BlockStack gap="4">
              <Text variant="headingMd" as="h3">
                Behavior Settings
              </Text>
              <Checkbox
                label="Show quantity rules"
                checked={settings.showQuantityRules}
                onChange={(checked) => setSettings((s) => ({ ...s, showQuantityRules: checked }))}
              />
              <Checkbox
                label="Allow skipping steps"
                checked={settings.allowSkipSteps}
                onChange={(checked) => setSettings((s) => ({ ...s, allowSkipSteps: checked }))}
              />
            </BlockStack>
          </Card>
        </BlockStack>
      </Modal.Section>
    </Modal>
  )
}

