import { json } from "@remix-run/node"
import { useLoaderData, useNavigate } from "@remix-run/react"
import { Page, Text, Button, Card, Icon } from "@shopify/polaris"
import { WandIcon, OrderDraftFilledIcon } from "@shopify/polaris-icons"
import { authenticate } from "../shopify.server"
import { prisma } from "../db.server"
import { useToast } from "~/components/ToastProvider"

export const loader = async ({ request }) => {
  const { session } = await authenticate.admin(request)
  try {
    const bundles = await prisma.bundle.findMany({
      where: { shopId: session.shop },
      include: {
        steps: true,
        pricing: true,
      },
      orderBy: { updatedAt: "desc" },
    })
    return json({ bundles })
  } catch (error) {
    return json({ bundles: [] })
  }
}

function BundleCard({ bundle, onToggle }) {
  const navigate = useNavigate()
  const { showToast } = useToast()

  const handleToggle = async () => {
    const newActiveState = !bundle.active
    console.log("Attempting to toggle bundle:", {
      bundleId: bundle.id,
      currentState: bundle.active,
      newState: newActiveState,
    })

    const formData = new FormData()
    formData.append("bundleId", bundle.id)
    formData.append("active", newActiveState.toString())

    try {
      console.log("Sending request to toggle endpoint with data:", {
        bundleId: bundle.id,
        active: newActiveState,
      })

      const response = await fetch("/api/bundles/toggle", {
        method: "POST",
        body: formData,
      })

      console.log("Received response:", {
        status: response.status,
        ok: response.ok,
      })

      if (!response.ok) {
        const errorData = await response.json()
        console.error("Error response:", errorData)
        throw new Error(errorData.error || "Failed to update bundle status")
      }

      const data = await response.json()
      console.log("Success response:", data)

      if (data.success) {
        onToggle(bundle.id, newActiveState)
        showToast({
          message: `Bundle ${newActiveState ? "activated" : "deactivated"} successfully`,
          error: false,
        })
      } else {
        throw new Error(data.error || "Update failed")
      }
    } catch (error) {
      console.error("Toggle error:", error)
      showToast({
        message: "Failed to update bundle status",
        error: true,
      })
    }
  }

  return (
    <Card>
      <div style={{ padding: "16px" }}>
        <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
          <Text variant="headingMd" as="h3">
            {bundle.name}
          </Text>
          <div style={{ fontSize: "14px", color: "var(--p-text-subdued)" }}>
            {bundle.steps.length} steps • {bundle.pricing ? `${bundle.pricing.type} pricing` : "No pricing"}
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <div
              style={{
                width: "8px",
                height: "8px",
                borderRadius: "50%",
                backgroundColor: bundle.active ? "rgb(34, 197, 94)" : "rgb(234, 179, 8)",
                boxShadow: bundle.active ? "0 0 8px rgba(34, 197, 94, 0.6)" : "0 0 8px rgba(234, 179, 8, 0.6)",
              }}
            />
            <span style={{ fontSize: "14px", fontWeight: "500" }}>{bundle.active ? "Active" : "Draft"}</span>
          </div>
        </div>

        <div style={{ marginTop: "16px", display: "flex", gap: "8px" }}>
          <Button onClick={handleToggle} size="slim">
            Toggle bundle status
          </Button>
          <Button onClick={() => navigate(`/app/bundles/${bundle.id}`)} size="slim">
            Edit
          </Button>
          <Button onClick={() => navigate(`/app/bundles/${bundle.id}/preview`)} size="slim">
            Preview
          </Button>
          <Button tone="critical" size="slim">
            Delete
          </Button>
        </div>
      </div>
    </Card>
  )
}

export default function Index() {
  const { bundles } = useLoaderData()
  const navigate = useNavigate()
  const { showToast } = useToast()

  const handleToggle = (bundleId, active) => {
    // Find and update the bundle in the UI
    const bundleEl = document.querySelector(`[data-bundle-id="${bundleId}"]`)
    if (bundleEl) {
      // Update status text and indicator
      const statusText = bundleEl.querySelector('[style*="font-weight: 500"]')
      if (statusText) {
        statusText.textContent = active ? "Active" : "Draft"
      }

      // Update indicator light
      const indicator = bundleEl.querySelector('[style*="border-radius: 50%"]')
      if (indicator) {
        indicator.style.backgroundColor = active ? "rgb(34, 197, 94)" : "rgb(234, 179, 8)"
        indicator.style.boxShadow = active ? "0 0 8px rgba(34, 197, 94, 0.6)" : "0 0 8px rgba(234, 179, 8, 0.6)"
      }
    }
  }

  return (
    <Page
      title="Your Bundles"
      primaryAction={{
        content: "Create Bundle",
        onAction: () => navigate("/app/bundles/new"),
      }}
    >
      <div style={{ marginTop: "20px" }}>
        {bundles.length === 0 ? (
          <>
            <div style={{ marginLeft: "150px", width: "600px" }}>
              <Card>
                <div style={{ padding: "24px", display: "flex", flexDirection: "column", alignItems: "center" }}>
                  <div
                    style={{
                      width: "80px",
                      height: "80px",
                      borderRadius: "50%",
                      backgroundColor: "#FFB200",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      marginBottom: "16px",
                    }}
                  >
                    <div style={{ transform: "scale(2.0)" }}>
                      <Icon source={WandIcon} color="base" />
                    </div>
                  </div>
                  <Text variant="headingMd" as="h2">
                    Setup your bundles quickly
                  </Text>
                  <Text variant="bodyMd" as="p" color="subdued" style={{ margin: "4px 0 16px 0" }}>
                    Get your bundles up and running in 2 easy steps!
                  </Text>
                  <div style={{ marginTop: "10px", width: "100%" }}>
                    <Button onClick={() => navigate("/app/bundles/new")} variant="primary" fullWidth>
                      Quick Setup
                    </Button>
                  </div>
                </div>
              </Card>
            </div>
            <div style={{ marginLeft: "150px", width: "600px", marginTop: "20px" }}>
              <Card>
                <div
                  style={{
                    padding: "20px",
                    display: "flex",
                    alignItems: "flex-start",
                    justifyContent: "space-between",
                  }}
                >
                  <div>
                    <Text variant="headingMd" as="h2">
                      Design services
                    </Text>
                    <div style={{ marginTop: "8px" }}>
                      <Text variant="bodyMd" as="p" color="subdued">
                        Transform the bundle builder for your store using our expert bundle design services
                      </Text>
                      <ul style={{ marginTop: "12px", marginBottom: "16px", paddingLeft: "20px" }}>
                        <li style={{ color: "var(--p-text-subdued)" }}>
                          <Text variant="bodyMd" as="span">
                            A fixed price of $100 (one-time cost) for any advanced CSS customization.
                          </Text>
                        </li>
                        <li style={{ color: "var(--p-text-subdued)", marginTop: "4px" }}>
                          <Text variant="bodyMd" as="span">
                            No hidden charges, ensuring transparency.
                          </Text>
                        </li>
                        <li style={{ color: "var(--p-text-subdued)", marginTop: "4px" }}>
                          <Text variant="bodyMd" as="span">
                            Professional bundle design services available.
                          </Text>
                        </li>
                      </ul>
                      <Button variant="primary" size="slim">
                        Get a quote
                      </Button>
                    </div>
                  </div>
                  <div
                    style={{
                      width: "48px",
                      height: "48px",
                      borderRadius: "50%",
                      backgroundColor: "#FFF5EA",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      flexShrink: 0,
                    }}
                  >
                    <Icon source={OrderDraftFilledIcon} color="base" />
                  </div>
                </div>
              </Card>
            </div>
          </>
        ) : (
          <>
            <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
              {bundles.map((bundle) => (
                <div key={bundle.id} data-bundle-id={bundle.id}>
                  <BundleCard bundle={bundle} onToggle={handleToggle} />
                </div>
              ))}
            </div>
            <div style={{ marginLeft: "100px", width: "600px", marginTop: "20px" }}>
              <Card>
                <div
                  style={{
                    padding: "20px",
                    display: "flex",
                    alignItems: "flex-start",
                    justifyContent: "space-between",
                  }}
                >
                  <div>
                    <Text variant="headingMd" as="h2">
                      Design services
                    </Text>
                    <div style={{ marginTop: "8px" }}>
                      <Text variant="bodyMd" as="p" color="subdued">
                        Transform the bundle builder for your store using our expert bundle design services
                      </Text>
                      <ul style={{ marginTop: "12px", marginBottom: "16px", paddingLeft: "20px" }}>
                        <li style={{ color: "var(--p-text-subdued)" }}>
                          <Text variant="bodyMd" as="span">
                            A fixed price of $100 (one-time cost) for any advanced CSS customization.
                          </Text>
                        </li>
                        <li style={{ color: "var(--p-text-subdued)", marginTop: "4px" }}>
                          <Text variant="bodyMd" as="span">
                            No hidden charges, ensuring transparency.
                          </Text>
                        </li>
                        <li style={{ color: "var(--p-text-subdued)", marginTop: "4px" }}>
                          <Text variant="bodyMd" as="span">
                            Professional bundle design services available.
                          </Text>
                        </li>
                      </ul>
                      <Button variant="primary" size="slim">
                        Get a quote
                      </Button>
                    </div>
                  </div>
                  <div
                    style={{
                      width: "48px",
                      height: "48px",
                      borderRadius: "50%",
                      backgroundColor: "#FFF5EA",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      flexShrink: 0,
                    }}
                  >
                    <Icon source={OrderDraftFilledIcon} color="base" />
                  </div>
                </div>
              </Card>
            </div>
          </>
        )}
      </div>
    </Page>
  )
}

