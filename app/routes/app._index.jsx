import { json } from "@remix-run/node"
import { useLoaderData, useNavigate } from "@remix-run/react"
import { Page, Text, Button, Card } from "@shopify/polaris"
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
      <div className="p-4">
        <div className="space-y-2">
          <Text variant="headingMd" as="h3">
            {bundle.name}
          </Text>
          <div className="text-sm text-gray-500">
            {bundle.steps.length} steps • {bundle.pricing ? `${bundle.pricing.type} pricing` : "No pricing"}
          </div>
          <div className="flex items-center gap-2">
            <div
              className={`w-2 h-2 rounded-full ${
                bundle.active
                  ? "bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.6)]"
                  : "bg-yellow-500 shadow-[0_0_8px_rgba(234,179,8,0.6)]"
              }`}
            />
            <span className="text-sm font-medium">{bundle.active ? "Active" : "Draft"}</span>
          </div>
        </div>

        <div className="mt-4 flex gap-2">
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
      const statusText = bundleEl.querySelector(".text-sm.font-medium")
      if (statusText) {
        statusText.textContent = active ? "Active" : "Draft"
      }

      // Update indicator light
      const indicator = bundleEl.querySelector(".rounded-full")
      if (indicator) {
        indicator.className = `w-2 h-2 rounded-full ${
          active
            ? "bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.6)]"
            : "bg-yellow-500 shadow-[0_0_8px_rgba(234,179,8,0.6)]"
        }`
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
      <div className="mt-4 space-y-4">
        {bundles.length === 0 ? (
          <Card>
            <div className="p-16 text-center">
              <div className="space-y-4">
                <Text variant="headingMd">Create your first bundle</Text>
                <Button onClick={() => navigate("/app/bundles/new")}>Create Bundle</Button>
              </div>
            </div>
          </Card>
        ) : (
          <div className="space-y-4">
            {bundles.map((bundle) => (
              <div key={bundle.id} data-bundle-id={bundle.id}>
                <BundleCard bundle={bundle} onToggle={handleToggle} />
              </div>
            ))}
          </div>
        )}
      </div>
    </Page>
  )
}

