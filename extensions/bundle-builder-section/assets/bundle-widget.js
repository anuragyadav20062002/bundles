class BundleBuilder {
  constructor(container) {
    this.container = container
    this.bundleId = container.dataset.bundleId
    this.steps = container.querySelectorAll(".bundle-builder__step")
    this.modal = container.querySelector(".bundle-builder__modal")
    this.modalContent = this.modal?.querySelector(".bundle-builder__modal-content")
    this.modalTitle = this.modal?.querySelector(".bundle-builder__modal-title")
    this.modalProductsContainer = this.modal?.querySelector(".bundle-builder__products-row")
    this.selectedProducts = new Map()
    this.bundleName = container.dataset.bundleName || "Custom Bundle"

    console.log("Bundle Builder initialized with bundle ID:", this.bundleId)
    this.init()
  }

  init() {
    // Step toggle buttons open modal
    this.steps.forEach((step) => {
      const toggle = step.querySelector(".bundle-builder__step-toggle")
      toggle?.addEventListener("click", () => this.openModal(step))
    })

    // Modal close button
    const closeBtn = this.modal?.querySelector(".bundle-builder__modal-close")
    closeBtn?.addEventListener("click", () => this.closeModal())

    // Modal cancel button
    const cancelBtn = this.modal?.querySelector(".bundle-builder__modal-cancel")
    cancelBtn?.addEventListener("click", () => this.closeModal())

    // Modal confirm button
    const confirmBtn = this.modal?.querySelector(".bundle-builder__modal-confirm")
    confirmBtn?.addEventListener("click", () => this.confirmSelection())

    // Close modal on outside click
    this.modal?.addEventListener("click", (e) => {
      if (e.target === this.modal) {
        this.closeModal()
      }
    })

    // Add cart button listener
    const addToCartBtn = this.container.querySelector(".bundle-builder__add-cart")
    if (addToCartBtn) {
      addToCartBtn.addEventListener("click", () => this.addToCart())
    }
  }

  openModal(step) {
    if (!this.modal || !this.modalProductsContainer) return

    const stepId = step.dataset.stepId
    const stepTitle = step.querySelector(".bundle-builder__step-title")?.textContent
    const stepProducts = step.querySelector(".bundle-builder__step-products")

    // Set modal title
    if (this.modalTitle) {
      this.modalTitle.textContent = stepTitle || "Select Products"
    }

    // Store current step ID
    this.modal.dataset.currentStepId = stepId

    // Clear previous products
    this.modalProductsContainer.innerHTML = ""

    // Move products to modal
    if (stepProducts) {
      const products = stepProducts.querySelectorAll(".bundle-builder__product")
      products.forEach((product) => {
        const clone = product.cloneNode(true)
        clone.addEventListener("click", () => this.toggleProduct(clone))
        this.modalProductsContainer.appendChild(clone)

        // Restore selected state if product was previously selected
        if (product.classList.contains("is-selected")) {
          clone.classList.add("is-selected")
        }
      })
    }

    // Show modal
    this.modal.classList.add("is-open")
    document.body.style.overflow = "hidden"
  }

  closeModal() {
    if (!this.modal) return

    this.modal.classList.remove("is-open")
    document.body.style.overflow = ""
    delete this.modal.dataset.currentStepId
  }

  toggleProduct(product) {
    const stepId = this.modal?.dataset.currentStepId
    if (!stepId) return

    const step = this.getStepByID(stepId)
    if (!step) return

    const maxQuantity = Number.parseInt(step.dataset.maxQuantity || "1", 10)
    const selectedInModal =
      this.modalProductsContainer?.querySelectorAll(".bundle-builder__product.is-selected").length || 0

    if (!product.classList.contains("is-selected") && selectedInModal >= maxQuantity) {
      return
    }

    product.classList.toggle("is-selected")

    // Update the original product's selected state
    const productId = product.dataset.productId
    const originalProduct = step.querySelector(
      `.bundle-builder__step-products .bundle-builder__product[data-product-id="${productId}"]`,
    )
    if (originalProduct) {
      if (product.classList.contains("is-selected")) {
        originalProduct.classList.add("is-selected")
      } else {
        originalProduct.classList.remove("is-selected")
      }
    }
  }

  confirmSelection() {
    const stepId = this.modal?.dataset.currentStepId
    if (!stepId) return

    const step = this.getStepByID(stepId)
    if (!step) return

    const selectedProducts = this.modalProductsContainer?.querySelectorAll(".bundle-builder__product.is-selected")
    const countBadge = step.querySelector(".bundle-builder__selected-count")

    if (countBadge && selectedProducts) {
      countBadge.textContent = selectedProducts.length
      countBadge.style.display = selectedProducts.length > 0 ? "block" : "none"
    }

    this.updateSelection()
    this.closeModal()
  }

  getStepByID(stepId) {
    return this.container.querySelector(`.bundle-builder__step[data-step-id="${stepId}"]`)
  }

  updateSelection() {
    const addToCartBtn = this.container.querySelector(".bundle-builder__add-cart")
    const allStepsValid = Array.from(this.steps).every((step) => {
      const minQuantity = Number.parseInt(step.dataset.minQuantity || "1", 10)
      const selectedCount = Number.parseInt(
        step.querySelector(".bundle-builder__selected-count")?.textContent || "0",
        10,
      )
      return selectedCount >= minQuantity
    })

    if (addToCartBtn) {
      addToCartBtn.disabled = !allStepsValid
    }
  }

  async addToCart() {
    const items = []

    // Collect all selected products from the original step products
    this.steps.forEach((step) => {
      const stepId = step.dataset.stepId
      const selectedProducts = step.querySelectorAll(
        ".bundle-builder__step-products .bundle-builder__product.is-selected",
      )
      console.log(`Step ${stepId}: Found ${selectedProducts.length} selected products`)

      selectedProducts.forEach((product) => {
        try {
          const variants = JSON.parse(product.dataset.variants || "[]")
          console.log("Product variants:", variants)

          if (variants.length > 0) {
            // Get the numeric variant ID
            let variantId = variants[0].id

            // Handle different ID formats
            if (variantId.includes("/")) {
              // GraphQL ID format: gid://shopify/ProductVariant/12345
              variantId = variantId.split("/").pop()
            } else if (variantId.includes(":")) {
              // Another possible format: shopify:variant:12345
              variantId = variantId.split(":").pop()
            }

            // Ensure it's a valid ID
            if (!variantId || isNaN(Number(variantId))) {
              console.error("Invalid variant ID:", variantId)
              return
            }

            const item = {
              id: variantId,
              quantity: 1,
              properties: {
                _bundle_id: this.bundleId,
                _step_id: stepId,
                _bundle_name: this.bundleName,
              },
            }
            console.log("Adding item to cart:", item)
            items.push(item)
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
      console.log("Sending cart request with items:", items)

      // Show loading state
      const addToCartBtn = this.container.querySelector(".bundle-builder__add-cart")
      if (addToCartBtn) {
        const originalText = addToCartBtn.textContent
        addToCartBtn.textContent = "Adding to cart..."
        addToCartBtn.disabled = true
      }

      const response = await fetch("/cart/add.js", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ items }),
      })

      const result = await response.json()

      if (!response.ok) {
        console.error("Cart error response:", result)
        throw new Error(result.description || "Failed to add items to cart")
      }

      console.log("Cart response:", result)

      // Success - redirect to cart
      window.location.href = "/cart"
    } catch (error) {
      console.error("Error adding to cart:", error)

      // Reset button state
      const addToCartBtn = this.container.querySelector(".bundle-builder__add-cart")
      if (addToCartBtn) {
        addToCartBtn.textContent = "Add Bundle to Cart"
        addToCartBtn.disabled = false
      }

      // Show error message to user
      alert(`Failed to add items to cart: ${error.message}`)
    }
  }
}

// Initialize on DOM load
document.addEventListener("DOMContentLoaded", () => {
  const containers = document.querySelectorAll(".bundle-builder")
  containers.forEach((container) => new BundleBuilder(container))
})

