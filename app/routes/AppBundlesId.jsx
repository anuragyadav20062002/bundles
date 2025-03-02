import { ArrowLeft, Copy, Edit, Plus, Trash2 } from "lucide-react"
import { useNavigate } from "react-router-dom"
import { Badge, Button, Text } from "@shopify/polaris"
import { PricingModal } from "../components/modals/PricingModal"
import { AddStepModal } from "../components/modals/AddStepModal"

function AppBundlesId({
  bundle,
  setShowPricing,
  setShowAddStep,
  pricingModalProps,
  addStepModalProps,
  handleStepDelete,
}) {
  const navigate = useNavigate()

  return (
    <div className="h-full w-full bg-white">
      <div className="mx-auto max-w-6xl px-4 py-6">
        {/* Header */}
        <div className="mb-6 flex items-center justify-between">
          <button
            onClick={() => navigate("/app")}
            className="flex items-center gap-2 text-sm font-medium text-gray-900"
          >
            <ArrowLeft className="h-4 w-4" />
            {bundle.name}
          </button>
          <div className="flex items-center gap-2">
            <Button size="slim" onClick={() => setShowPricing(true)}>
              Configure Pricing
            </Button>
            <Button size="slim" variant="primary">
              Publish Bundle
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-6">
          {/* Main Content */}
          <div className="col-span-2">
            <div className="rounded-lg border border-gray-200 bg-white p-5">
              <div className="mb-4 flex items-center justify-between">
                <Text variant="headingMd" as="h2">
                  Bundle Steps
                </Text>
                <Button size="slim" onClick={() => setShowAddStep(true)} icon={<Plus className="h-4 w-4" />}>
                  Add Step
                </Button>
              </div>

              <div className="space-y-3">
                {bundle.steps.map((step) => (
                  <div
                    key={step.id}
                    className="flex items-center justify-between rounded-lg border border-gray-200 bg-white p-4"
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <Text variant="bodyMd" fontWeight="semibold">
                          {step.name}
                        </Text>
                        <Badge tone="warning">Disabled</Badge>
                      </div>
                      <Text variant="bodySm" tone="subdued" as="p">
                        {step.collections?.length || 0} collections, {step.products?.length || 0} products
                      </Text>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => console.log("Edit step", step.id)}
                        className="inline-flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
                      >
                        <Edit className="h-4 w-4" />
                        Edit
                      </button>
                      <button
                        onClick={() => console.log("Clone step", step.id)}
                        className="inline-flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
                      >
                        <Copy className="h-4 w-4" />
                        Clone
                      </button>
                      <button
                        onClick={() => handleStepDelete(step.id)}
                        className="inline-flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium text-critical hover:bg-critical/10"
                      >
                        <Trash2 className="h-4 w-4" />
                        Delete
                      </button>
                    </div>
                  </div>
                ))}

                {bundle.steps.length === 0 && (
                  <div className="rounded-lg border border-gray-200 p-4 text-center">
                    <Text tone="subdued">No steps added yet. Click "Add Step" to create your first bundle step.</Text>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Sidebar */}
          <div className="col-span-1">
            <div className="rounded-lg border border-gray-200 bg-white p-5">
              <Text variant="headingMd" as="h2" className="mb-4">
                Bundle Status
              </Text>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Text variant="bodyMd">Status</Text>
                  <Badge tone="warning">Draft</Badge>
                </div>
                <div className="flex items-center justify-between">
                  <Text variant="bodyMd">Steps</Text>
                  <Text variant="bodyMd">{bundle.steps.length}</Text>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Keep modals as is */}
      <PricingModal {...pricingModalProps} />
      <AddStepModal {...addStepModalProps} />
    </div>
  )
}

export default AppBundlesId 