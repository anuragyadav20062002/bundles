import { json, redirect } from "@remix-run/node"
import { Form, useActionData, useLoaderData, useNavigate, useNavigation } from "@remix-run/react"
import {
  Page,
  Layout,
  Card,
  FormLayout,
  TextField,
  Button,
  Text,
  BlockStack,
  Box,
  InlineStack,
  Select,
} from "@shopify/polaris"
import { BoxIcon } from "lucide-react"
import { authenticate } from "../shopify.server"
import { prisma } from "../db.server"

export const loader = async ({ request, params }) => {
  console.log("Steps new loader called with params:", params)
  const { admin, session } = await authenticate.admin(request)
  const { id } = params

  try {
    // Get the bundle to ensure it exists and belongs to this shop
    const bundle = await prisma.bundle.findFirst({
      where: {
        id,
        shopId: session.shop,
      },
    })

    if (!bundle) {
      return redirect("/app?error=Bundle not found")
    }

    // Use the correct GraphQL query with proper subfields
    const response = await admin.graphql(
      `#graphql
        query GetProductTypes {
          productTypes(first: 250) {
            edges {
              node
            }
          }
        }
      `,
    )

    const data = await response.json()
    const productTypes = data.data.productTypes.edges
      .map((edge) => edge.node)
      .filter(Boolean)
      .sort()

    // Add "All Products" as an option
    productTypes.unshift("All Products")

    return json({
      bundle,
      productTypes: productTypes.map((type) => ({
        label: type || "No Category",
        value: type || "",
      })),
    })
  } catch (error) {
    console.error("Failed to load bundle:", error)
    if (error.message.includes("permission")) {
      return redirect("/auth/login")
    }
    return redirect("/app?error=Failed to load bundle: " + error.message)
  }
}

export const action = async ({ request, params }) => {
  try {
    const { admin, session } = await authenticate.admin(request)
    const { id } = params
    const formData = await request.formData()

    const name = formData.get("name")
    const icon = formData.get("icon")
    const minQuantity = Number.parseInt(formData.get("minQuantity"), 10)
    const maxQuantity = Number.parseInt(formData.get("maxQuantity"), 10)
    const productCategory = formData.get("productCategory")

    // Validation
    const errors = {}
    if (!name?.length) {
      errors.name = "Step name is required"
    }
    if (!productCategory) {
      errors.productCategory = "Product category is required"
    }
    if (minQuantity < 1) {
      errors.minQuantity = "Minimum quantity must be at least 1"
    }
    if (maxQuantity < minQuantity) {
      errors.maxQuantity = "Maximum quantity must be greater than or equal to minimum quantity"
    }

    if (Object.keys(errors).length > 0) {
      return json({ errors }, { status: 400 })
    }

    // Verify bundle ownership
    const bundle = await prisma.bundle.findFirst({
      where: {
        id,
        shopId: session.shop,
      },
    })

    if (!bundle) {
      throw new Error("Bundle not found or access denied")
    }

    // Get the current highest position
    const highestStep = await prisma.bundleStep.findFirst({
      where: { bundleId: id },
      orderBy: { position: "desc" },
    })

    const newPosition = highestStep ? highestStep.position + 1 : 0

    // Create the new step
    const step = await prisma.bundleStep.create({
      data: {
        name,
        icon: icon || "box",
        minQuantity,
        maxQuantity,
        productCategory,
        position: newPosition,
        bundleId: id,
      },
    })

    return redirect(`/app/bundles/${id}`)
  } catch (error) {
    console.error("Failed to create step:", error)
    if (error.message.includes("permission") || error.message.includes("unauthorized")) {
      return redirect("/auth/login")
    }
    return json({ errors: { general: "Failed to create step" } }, { status: 500 })
  }
}

const ICON_OPTIONS = [
  { label: "Box", value: "box" },
  { label: "Shopping Bag", value: "shopping-bag" },
  { label: "Package", value: "package" },
  { label: "Gift", value: "gift" },
  { label: "Star", value: "star" },
]

export default function NewStep() {
  const { bundle, productTypes } = useLoaderData()
  const actionData = useActionData()
  const navigate = useNavigate()
  const navigation = useNavigation()
  const isCreating = navigation.state === "submitting"

  return (
    <Page
      backAction={{
        content: "Back to bundle",
        onAction: () => navigate(`/app/bundles/${bundle.id}`),
      }}
      title="Add Bundle Step"
    >
      <Layout>
        <Layout.Section>
          <Card>
            <Form method="post">
              <BlockStack gap="4">
                <Box padding="4" borderBlockEndWidth="1" borderColor="border">
                  <BlockStack gap="4">
                    <InlineStack align="space-between">
                      <BlockStack gap="2">
                        <Text variant="headingMd" as="h2">
                          Step Details
                        </Text>
                        <Text tone="subdued">Configure how this step will appear in your bundle builder.</Text>
                      </BlockStack>
                      <div className="flex h-10 w-10 items-center justify-center rounded-md bg-primary/10">
                        <BoxIcon className="h-5 w-5 text-primary" />
                      </div>
                    </InlineStack>

                    <FormLayout>
                      <TextField
                        label="Step name"
                        type="text"
                        name="name"
                        autoComplete="off"
                        error={actionData?.errors?.name}
                        helpText="Example: Select Your Monitor, Choose Keyboard"
                        required
                      />

                      <Select
                        label="Step icon"
                        name="icon"
                        options={ICON_OPTIONS}
                        helpText="This icon will appear next to the step name"
                      />
                    </FormLayout>
                  </BlockStack>
                </Box>

                <Box padding="4" borderBlockEndWidth="1" borderColor="border">
                  <BlockStack gap="4">
                    <BlockStack gap="2">
                      <Text variant="headingMd" as="h2">
                        Product Selection
                      </Text>
                      <Text tone="subdued">Define which products can be selected in this step.</Text>
                    </BlockStack>

                    <FormLayout>
                      <Select
                        label="Product category"
                        name="productCategory"
                        options={productTypes}
                        error={actionData?.errors?.productCategory}
                        helpText="Only products from this category will be shown"
                        required
                      />

                      <div className="flex gap-4">
                        <TextField
                          label="Minimum quantity"
                          type="number"
                          name="minQuantity"
                          min={1}
                          max={10}
                          defaultValue={1}
                          error={actionData?.errors?.minQuantity}
                        />
                        <TextField
                          label="Maximum quantity"
                          type="number"
                          name="maxQuantity"
                          min={1}
                          max={10}
                          defaultValue={1}
                          error={actionData?.errors?.maxQuantity}
                        />
                      </div>
                    </FormLayout>
                  </BlockStack>
                </Box>

                <Box padding="4">
                  <InlineStack align="end" gap="3">
                    <Button onClick={() => navigate(`/app/bundles/${bundle.id}`)}>Cancel</Button>
                    <Button variant="primary" submit loading={isCreating}>
                      Add step
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
                  Step Configuration Guide
                </Text>
              </Box>
              <Box padding="4">
                <BlockStack gap="4">
                  <Text variant="bodyMd" as="p">
                    Each step represents a product selection in your bundle:
                  </Text>
                  <ul className="ml-6 list-disc space-y-2">
                    <li>Give your step a clear, descriptive name</li>
                    <li>Choose an icon to help identify the step</li>
                    <li>Select which product category to show</li>
                    <li>Set minimum and maximum quantities</li>
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

