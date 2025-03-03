"use client"
import { Select, TextField, Button } from "@shopify/polaris"
import { Trash2 } from "lucide-react"

export function ConditionsBuilder({ conditions, onChange }) {
  const quantityOperators = [
    { label: "is equal to", value: "equals" },
    { label: "is at least", value: "at_least" },
    { label: "is at most", value: "at_most" },
  ]

  const handleConditionChange = (index, field, value) => {
    const newConditions = [...conditions]
    newConditions[index] = {
      ...newConditions[index],
      [field]: value,
    }
    onChange(newConditions)
  }

  const handleRemoveCondition = (index) => {
    const newConditions = conditions.filter((_, i) => i !== index)
    onChange(newConditions)
  }

  const addCondition = () => {
    onChange([...conditions, { type: "quantity", operator: "equals", value: "1" }])
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
      {conditions.map((condition, index) => (
        <div key={index} style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <Select
            options={[{ label: "Quantity", value: "quantity" }]}
            value={condition.type}
            onChange={(value) => handleConditionChange(index, "type", value)}
          />
          <Select
            options={quantityOperators}
            value={condition.operator}
            onChange={(value) => handleConditionChange(index, "operator", value)}
          />
          <div style={{ width: "100px" }}>
            <TextField
              type="number"
              value={condition.value}
              onChange={(value) => handleConditionChange(index, "value", value)}
              min="0"
            />
          </div>
          {conditions.length > 1 && (
            <Button
              icon={<Trash2 style={{ width: "20px", height: "20px" }} />}
              onClick={() => handleRemoveCondition(index)}
              plain
            />
          )}
        </div>
      ))}
      {conditions.length < 3 && (
        <Button onClick={addCondition} plain>
          Add another condition
        </Button>
      )}
    </div>
  )
}

