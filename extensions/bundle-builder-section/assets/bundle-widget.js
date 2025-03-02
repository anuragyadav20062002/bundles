class BundleBuilder {
    constructor(container) {
      this.container = container
      this.bundleId = container.dataset.bundleId
      this.steps = container.querySelectorAll(".bundle-builder__step")
      this.selectedProducts = new Map()
      this.init()
    }
  
    init() {
      this.steps.forEach((step) => {
        const toggle = step.querySelector(".bundle-builder__step-toggle")
        const products = step.querySelectorAll(".bundle-builder__product")
  
        toggle?.addEventListener("click", () => this.toggleStep(step))
        products.forEach((product) => {
          product.addEventListener("click", () => this.toggleProduct(product))
        })
      })
  
      // Add cart button listener
      const addToCartBtn = this.container.querySelector(".bundle-builder__add-cart")
      if (addToCartBtn) {
        addToCartBtn.addEventListener("click", () => this.addToCart())
      }
    }
  
    toggleStep(step) {
      // Close other steps
      this.steps.forEach((otherStep) => {
        if (otherStep !== step && otherStep.classList.contains("is-open")) {
          otherStep.classList.remove("is-open")
        }
      })
  
      // Toggle current step
      step.classList.toggle("is-open")
    }
  
    toggleProduct(product) {
      const step = product.closest(".bundle-builder__step")
      const maxQuantity = Number.parseInt(step.dataset.maxQuantity || "1", 10)
      const selectedInStep = step.querySelectorAll(".bundle-builder__product.is-selected").length
  
      if (!product.classList.contains("is-selected") && selectedInStep >= maxQuantity) {
        return
      }
  
      product.classList.toggle("is-selected")
      this.updateSelection()
    }
  
    updateSelection() {
      const addToCartBtn = this.container.querySelector(".bundle-builder__add-cart")
      const allStepsValid = Array.from(this.steps).every((step) => {
        const minQuantity = Number.parseInt(step.dataset.minQuantity || "1", 10)
        const selected = step.querySelectorAll(".bundle-builder__product.is-selected").length
        return selected >= minQuantity
      })
  
      if (addToCartBtn) {
        addToCartBtn.disabled = !allStepsValid
      }
    }
  
    async addToCart() {
      const items = []
  
      // Collect all selected products
      this.steps.forEach((step) => {
        const selectedProducts = step.querySelectorAll(".bundle-builder__product.is-selected")
        selectedProducts.forEach((product) => {
          try {
            const variants = JSON.parse(product.dataset.variants || "[]")
            if (variants.length > 0) {
              // Get the variant ID from the Shopify product ID
              const variantId = variants[0].id.split("/").pop()
              items.push({
                id: variantId,
                quantity: 1,
                properties: {
                  _bundle_id: this.bundleId,
                  _step_id: step.dataset.stepId,
                },
              })
            }
          } catch (error) {
            console.error("Error parsing variants:", error)
          }
        })
      })
  
      if (items.length === 0) {
        console.error("No items selected")
        return
      }
  
      try {
        const response = await fetch("/cart/add.js", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ items }),
        })
  
        if (!response.ok) {
          throw new Error("Failed to add items to cart")
        }
  
        // Success - redirect to cart
        window.location.href = "/cart"
      } catch (error) {
        console.error("Error adding to cart:", error)
      }
    }
  }
  
  // Initialize on DOM load
  document.addEventListener("DOMContentLoaded", () => {
    const containers = document.querySelectorAll(".bundle-builder")
    containers.forEach((container) => new BundleBuilder(container))
  })
  
  