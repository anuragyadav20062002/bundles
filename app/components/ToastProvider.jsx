"use client"

import { createContext, useContext, useState, useCallback } from "react"
import { Toast, Frame } from "@shopify/polaris"

const ToastContext = createContext(null)

export function ToastProvider({ children }) {
  const [activeToast, setActiveToast] = useState(null)

  const showToast = useCallback(({ message, error = false }) => {
    setActiveToast({ content: message, error })
  }, [])

  const dismissToast = useCallback(() => {
    setActiveToast(null)
  }, [])

  return (
    <ToastContext.Provider value={{ showToast }}>
      <Frame>
        {children}
        {activeToast && (
          <Toast content={activeToast.content} error={activeToast.error} onDismiss={dismissToast} duration={3000} />
        )}
      </Frame>
    </ToastContext.Provider>
  )
}

export const useToast = () => {
  const context = useContext(ToastContext)
  if (!context) {
    throw new Error("useToast must be used within a ToastProvider")
  }
  return context
}

