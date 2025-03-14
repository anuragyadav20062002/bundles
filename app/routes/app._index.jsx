"use client"

import { json } from "@remix-run/node"
import { useLoaderData, useNavigate } from "@remix-run/react"
import { Page, Text, Button, Card, Icon, ButtonGroup, Divider } from "@shopify/polaris"
import { WandIcon, OrderDraftFilledIcon } from "@shopify/polaris-icons"
import { authenticate } from "../shopify.server"
import { prisma } from "../db.server"
import { useToast } from "~/components/ToastProvider"
import { useEffect, useState } from "react"

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

export default function Index() {
  const { bundles } = useLoaderData()
  const navigate = useNavigate()
  const { showToast } = useToast()
  const [isMounted, setIsMounted] = useState(false)
  const [bundleToDelete, setBundleToDelete] = useState(null)

  useEffect(() => {
    setIsMounted(true)
  }, [])

  // Add a function to handle bundle deletion after the handleToggle function
  const handleDeleteBundle = async (bundleId) => {
    try {
      showToast({ message: "Deleting bundle...", error: false })

      const response = await fetch("/api/bundles/delete", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ bundleId }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || "Failed to delete bundle")
      }

      const data = await response.json()

      if (data.success) {
        // Remove the bundle from the UI
        const updatedBundles = bundles.filter((bundle) => bundle.id !== bundleId)
        // Force a refresh to update the UI
        window.location.reload()

        showToast({
          message: "Bundle deleted successfully",
          error: false,
        })
      } else {
        throw new Error(data.error || "Delete failed")
      }
    } catch (error) {
      console.error("Delete error:", error)
      showToast({
        message: "Failed to delete bundle: " + error.message,
        error: true,
      })
    } finally {
      setBundleToDelete(null)
    }
  }

  const handleToggle = (bundleId, active) => {
    const bundleEl = document.querySelector(`[data-bundle-id="${bundleId}"]`)
    if (bundleEl) {
      const statusText = bundleEl.querySelector('[style*="font-weight: 500"]')
      if (statusText) {
        statusText.textContent = active ? "Active" : "Draft"
      }

      const indicator = bundleEl.querySelector('[style*="border-radius: 50%"]')
      if (indicator) {
        indicator.style.backgroundColor = active ? "rgb(34, 197, 94)" : "rgb(234, 179, 8)"
        indicator.style.boxShadow = active ? "0 0 8px rgba(34, 197, 94, 0.6)" : "0 0 8px rgba(234, 179, 8, 0.6)"
      }
    }
  }

  // Separate DeleteConfirmDialog into its own component
  function DeleteConfirmDialog({ bundleId, onClose, onConfirm }) {
    if (!bundleId) return null

    return (
      <div
        style={{
          position: "fixed",
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: "rgba(0, 0, 0, 0.5)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          zIndex: 9999, // Ensure it's above everything
        }}
      >
        <div
          style={{
            backgroundColor: "white",
            padding: "20px",
            borderRadius: "8px",
            maxWidth: "400px",
            width: "100%",
            boxShadow: "0 4px 8px rgba(0, 0, 0, 0.1)",
          }}
        >
          <Text variant="headingMd" as="h2" style={{ marginBottom: "16px" }}>
            Delete Bundle
          </Text>
          <Text variant="bodyMd" as="p" style={{ marginBottom: "20px" }}>
            Are you sure you want to delete this bundle? This action cannot be undone.
          </Text>
          <div style={{ display: "flex", justifyContent: "flex-end", gap: "8px" }}>
            <Button onClick={onClose}>No</Button>
            <Button
              tone="critical"
              onClick={() => {
                onConfirm(bundleId)
                onClose()
              }}
            >
              Yes
            </Button>
          </div>
        </div>
      </div>
    )
  }

  // Modified BundleRow to use the state
  function BundleRow({ bundle, onToggle, isLast, onDelete }) {
    const navigate = useNavigate()
    const { showToast } = useToast()
    const [isPreviewLoading, setIsPreviewLoading] = useState(false)

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

    const handlePreview = async () => {
      try {
        setIsPreviewLoading(true)
        showToast({ message: "Creating preview...", error: false })

        const response = await fetch("/api/bundles/preview", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ bundleId: bundle.id }),
        })

        if (!response.ok) {
          const errorData = await response.json()
          throw new Error(errorData.error || "Failed to create preview")
        }

        const data = await response.json()

        if (data.success) {
          // Open in new tab with the full store URL
          window.open(data.productUrl, "_blank")
          showToast({ message: "Preview created successfully", error: false })
        } else {
          throw new Error(data.error)
        }
      } catch (error) {
        console.error("Preview error:", error)
        showToast({
          message: "Failed to create preview: " + error.message,
          error: true,
        })
      } finally {
        setIsPreviewLoading(false)
      }
    }

    return (
      <>
        <div
          style={{
            padding: "16px",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            width: "100%",
          }}
        >
          {/* Bundle Name and Status Section */}
          <div style={{ display: "flex", alignItems: "center", gap: "16px", flex: "1" }}>
            <Text variant="headingMd" as="h3">
              {bundle.name}
            </Text>
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

          {/* Action Buttons Section */}
          <div>
            <ButtonGroup>
              <Button onClick={handleToggle} size="slim">
                Toggle status
              </Button>
              <Button onClick={() => navigate(`/app/bundles/${bundle.id}`)} size="slim">
                Edit
              </Button>
              <Button onClick={handlePreview} size="slim" loading={isPreviewLoading} disabled={isPreviewLoading}>
                Preview
              </Button>
              <Button tone="critical" size="slim" onClick={() => setBundleToDelete(bundle.id)}>
                Delete
              </Button>
            </ButtonGroup>
          </div>
        </div>
        {!isLast && <Divider />}
      </>
    )
  }

  if (!isMounted) {
    return <div>Loading...</div>
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
            <Card>
              <div style={{ padding: "24px", display: "flex", flexDirection: "column", alignItems: "center" }}>
                <div
                  style={{
                    width: "80px",
                    height: "80px",
                    borderRadius: "50%",
                    backgroundColor: "#66D2CE",
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
                <div style={{ width: "100%", maxWidth: "400px" }}>
                  <Button onClick={() => navigate("/app/bundles/new")} variant="primary" fullWidth>
                    Quick Setup
                  </Button>
                </div>
              </div>
            </Card>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: "20px",
                marginTop: "20px",
              }}
            >
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
              <Card>
                <div style={{ padding: "20px", backgroundColor: "#fff" }}>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                    <div>
                      <Text variant="headingMd" as="h2">
                        Your account manager
                      </Text>
                      <div style={{ display: "flex", alignItems: "center", marginTop: "8px" }}>
                        <div
                          style={{
                            width: "10px",
                            height: "10px",
                            borderRadius: "50%",
                            backgroundColor: "#10B981",
                            marginRight: "8px",
                          }}
                        ></div>
                        <Text variant="headingLg" as="h3">
                          Yash
                        </Text>
                      </div>
                      <div style={{ marginTop: "16px" }}>
                        <Text variant="bodyMd" as="p">
                          Stuck? Reach out to your Account Manager!
                        </Text>
                      </div>
                    </div>
                    <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: "12px" }}>
                      <div
                        style={{
                          width: "60px",
                          height: "60px",
                          borderRadius: "50%",
                          overflow: "hidden",
                          border: "2px solid #10B981",
                        }}
                      >
                        <img
                          src="https://hebbkx1anhila5yf.public.blob.vercel-storage.com/image-DyuG8hKSYoLu2K9MSiX3DFRMCDdjQe.png"
                          alt="Yash - Account Manager"
                          style={{ width: "100%", height: "100%", objectFit: "cover" }}
                        />
                      </div>
                      <Button
                        onClick={() =>
                          window.open("https://tidycal.com/wolfpackshopifyapp/15-minute-meeting", "_blank")
                        }
                        size="slim"
                      >
                        Schedule Meeting
                      </Button>
                    </div>
                  </div>
                </div>
              </Card>
            </div>
          </>
        ) : (
          <>
            <Card>
              {bundles.map((bundle, index) => (
                <div key={bundle.id} data-bundle-id={bundle.id}>
                  <BundleRow
                    bundle={bundle}
                    onToggle={handleToggle}
                    isLast={index === bundles.length - 1}
                    onDelete={handleDeleteBundle}
                  />
                </div>
              ))}
            </Card>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: "20px",
                marginTop: "20px",
              }}
            >
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
              <Card>
                <div style={{ padding: "20px", backgroundColor: "#fff" }}>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                    <div>
                      <Text variant="headingMd" as="h2">
                        Your account manager
                      </Text>
                      <div style={{ display: "flex", alignItems: "center", marginTop: "8px" }}>
                        <div
                          style={{
                            width: "10px",
                            height: "10px",
                            borderRadius: "50%",
                            backgroundColor: "#10B981",
                            marginRight: "8px",
                          }}
                        ></div>
                        <Text variant="headingLg" as="h3">
                          Yash
                        </Text>
                      </div>
                      <div style={{ marginTop: "16px" }}>
                        <Text variant="bodyMd" as="p">
                          Stuck? Reach out to your Account Manager!
                        </Text>
                      </div>
                    </div>
                    <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: "12px" }}>
                      <div
                        style={{
                          width: "60px",
                          height: "60px",
                          borderRadius: "50%",
                          overflow: "hidden",
                          border: "2px solid #10B981",
                        }}
                      >
                        <img
                          src="https://hebbkx1anhila5yf.public.blob.vercel-storage.com/image-DyuG8hKSYoLu2K9MSiX3DFRMCDdjQe.png"
                          alt="Yash - Account Manager"
                          style={{ width: "100%", height: "100%", objectFit: "cover" }}
                        />
                      </div>
                      <Button
                        onClick={() =>
                          window.open("https://tidycal.com/wolfpackshopifyapp/15-minute-meeting", "_blank")
                        }
                        size="slim"
                      >
                        Schedule Meeting
                      </Button>
                    </div>
                  </div>
                </div>
              </Card>
            </div>
          </>
        )}

        {/* Move DeleteConfirmDialog to the end of the component */}
        <DeleteConfirmDialog
          bundleId={bundleToDelete}
          onClose={() => setBundleToDelete(null)}
          onConfirm={handleDeleteBundle}
        />
      </div>
    </Page>
  )
}

