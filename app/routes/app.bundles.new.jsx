"use client"

import { json, redirect } from "@remix-run/node"
import { Form, useActionData, useNavigate, useNavigation } from "@remix-run/react"
import {
  Page,
  Layout,
  Card,
  TextField,
  Button,
  Text,
  Banner,
  BlockStack,
  Box,
  InlineStack,
  FormLayout,
} from "@shopify/polaris"
import { AlertCircle, ArrowLeft, Package2, Plus } from "lucide-react"
import { authenticate } from "../shopify.server"
import { createBundle } from "../models/bundle.server"
import { useState } from "react"

/**
 * @typedef {Object} FormValues
 * @property {string} name
 * @property {string} description
 */

/**
 * @typedef {Object} ActionData
 * @property {Object} [errors]
 * @property {string} [errors.name]
 * @property {string} [errors.general]
 */

/**
 * @param {Request} request
 */
export const action = async ({ request }) => {
  const { session } = await authenticate.admin(request)
  const formData = await request.formData()
  const name = formData.get("name")
  const description = formData.get("description")

  if (!name?.length) {
    return json({ errors: { name: "Bundle name is required" } }, { status: 400 })
  }

  if (name.length < 3) {
    return json({ errors: { name: "Bundle name must be at least 3 characters" } }, { status: 400 })
  }

  try {
    const bundle = await createBundle({
      name,
      description,
      shopId: session.shop,
    })
    return redirect(`/app/bundles/${bundle.id}`)
  } catch (error) {
    console.error("Bundle creation error:", error)
    return json({ errors: { general: "Failed to create bundle" } }, { status: 500 })
  }
}

export default function NewBundle() {
  /** @type {ActionData} */
  const actionData = useActionData()
  const navigate = useNavigate()
  const navigation = useNavigation()
  const isCreating = navigation.state === "submitting"

  /** @type {[FormValues, React.Dispatch<React.SetStateAction<FormValues>>]} */
  const [formValues, setFormValues] = useState({
    name: "",
    description: "",
  })

  /**
   * @param {keyof FormValues} field
   */
  const handleChange = (field) => (value) => {
    setFormValues((prev) => ({
      ...prev,
      [field]: value,
    }))
  }

  return (
    <Page
      backAction={{
        content: (
          <span className="flex items-center gap-2">
            <ArrowLeft className="h-5 w-5" />
            Back to bundles
          </span>
        ),
        onAction: () => navigate("/app"),
      }}
      title="Create Bundle"
    >
      <Layout>
        <Layout.Section>
          {actionData?.errors?.general && (
            <Box paddingBlock="4">
              <Banner status="critical" icon={AlertCircle}>
                <p>{actionData.errors.general}</p>
              </Banner>
            </Box>
          )}

          <Card>
            <Form method="post">
              <BlockStack gap="4">
                <Box padding="4" borderBlockEndWidth="1" borderColor="border">
                  <BlockStack gap="4">
                    <InlineStack align="start" gap="4">
                      <div className="flex-1">
                        <Text variant="headingMd" as="h2">
                          Bundle Details
                        </Text>
                        <Text variant="bodyMd" tone="subdued">
                          Give your bundle a name and description that helps identify its purpose.
                        </Text>
                      </div>
                      <div className="flex h-10 w-10 items-center justify-center rounded-md bg-primary/10">
                        <Package2 className="h-5 w-5 text-primary" />
                      </div>
                    </InlineStack>

                    <FormLayout>
                      <TextField
                        label="Bundle name"
                        type="text"
                        name="name"
                        autoComplete="off"
                        placeholder="e.g., Gaming Setup, Home Office Bundle"
                        helpText="A clear name helps customers understand what products they can combine"
                        error={actionData?.errors?.name}
                        value={formValues.name}
                        onChange={handleChange("name")}
                        required
                      />

                      <TextField
                        label="Description"
                        type="text"
                        name="description"
                        autoComplete="off"
                        placeholder="e.g., Build your perfect gaming setup with matching accessories"
                        helpText="Optional: Add more details about what this bundle offers"
                        multiline={3}
                        value={formValues.description}
                        onChange={handleChange("description")}
                      />
                    </FormLayout>
                  </BlockStack>
                </Box>

                <Box padding="4">
                  <InlineStack align="end" gap="3">
                    <Button onClick={() => navigate("/app")}>Cancel</Button>
                    <Button variant="primary" submit loading={isCreating} icon={<Plus className="h-5 w-5" />}>
                      Create bundle
                    </Button>
                  </InlineStack>
                </Box>
              </BlockStack>
            </Form>
          </Card>
        </Layout.Section>

        <Layout.Section variant="oneThird">
          <Card>
            <BlockStack gap="4">
              <Box padding="4" borderBlockEndWidth="1" borderColor="border">
                <Text variant="headingMd" as="h2">
                  What's next?
                </Text>
              </Box>
              <Box padding="4">
                <BlockStack gap="4">
                  <Text variant="bodyMd" as="p">
                    After creating your bundle, you'll be able to:
                  </Text>
                  <ul className="ml-6 list-disc space-y-2">
                    <li>Add product selection steps</li>
                    <li>Configure quantity limits</li>
                    <li>Choose product categories</li>
                    <li>Set up pricing rules</li>
                    <li>Preview and publish</li>
                  </ul>
                </BlockStack>
              </Box>
            </BlockStack>
          </Card>
        </Layout.Section>
      </Layout>
    </Page>
  )
}

