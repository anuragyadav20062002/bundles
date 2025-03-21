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

    // Add cart page detection
    if (window.location.pathname.includes("/cart")) {
      this.addCartDebugInfo()
    }
  }

  // Add debug info directly to the cart page
  addCartDebugInfo() {
    console.log("Adding cart debug info")

    // Create a visible debug element
    const debugDiv = document.createElement("div")
    debugDiv.style.margin = "20px 0"
    debugDiv.style.padding = "15px"
    debugDiv.style.border = "2px solid red"
    debugDiv.style.backgroundColor = "#ffeeee"

    // Add content
    debugDiv.innerHTML = `
    <h3 style="margin-top: 0;">Bundle Cart Debug</h3>
    <p>Cart page detected. Checking for bundle items...</p>
  `

    // Find cart items
    const cartItems = document.querySelectorAll(".cart-item")
    const itemsList = document.createElement("ul")

    if (cartItems.length === 0) {
      itemsList.innerHTML = "<li>No cart items found</li>"
    } else {
      let bundleItemsFound = 0

      cartItems.forEach((item, index) => {
        const itemLi = document.createElement("li")
        const itemTitle = item.querySelector(".cart-item__name")?.textContent || `Item ${index + 1}`

        // Check for bundle properties
        const properties = item.querySelectorAll("[data-property], .cart-item__properties li, .product-option")
        const bundleProps = []

        properties.forEach((prop) => {
          const propText = prop.textContent.trim()
          if (propText.includes("bundle_id") || propText.includes("bundle_name") || propText.includes("is_bundle")) {
            bundleProps.push(propText)
          }
        })

        if (bundleProps.length > 0) {
          bundleItemsFound++
          itemLi.innerHTML = `${itemTitle} - <strong>Bundle item</strong> (${bundleProps.length} bundle properties)`
        } else {
          itemLi.textContent = `${itemTitle} - Regular item`
        }

        itemsList.appendChild(itemLi)
      })

      // Add summary
      const summary = document.createElement("p")
      summary.innerHTML = `<strong>Found ${bundleItemsFound} bundle items out of ${cartItems.length} total items</strong>`
      debugDiv.appendChild(summary)
    }

    debugDiv.appendChild(itemsList)

    // Add troubleshooting info
    const troubleshooting = document.createElement("div")
    troubleshooting.innerHTML = `
    <h4>Troubleshooting Steps:</h4>
    <ol>
      <li>Check if bundle properties are visible above</li>
      <li>Verify function is deployed: <code>npm run shopify app function build && npm run shopify app deploy</code></li>
      <li>Verify function is enabled in Shopify admin: Settings → Checkout → Order processing</li>
      <li>Check if the function is registered: Go to Shopify admin → Settings → Apps and sales channels → Develop apps → Your app → Extensions</li>
    </ol>
  `
    debugDiv.appendChild(troubleshooting)

    // Insert into the page
    const cartContainer = document.querySelector(".cart")
    if (cartContainer) {
      cartContainer.insertBefore(debugDiv, cartContainer.firstChild)
    } else {
      document.body.insertBefore(debugDiv, document.body.firstChild)
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
    console.log("=== Adding bundle to cart ===")

    // Create items array for cart API
    const items = []
    let hasValidItems = false

    // Collect all selected products from each step
    this.steps.forEach((step) => {
      const stepId = step.dataset.stepId
      const selectedProducts = step.querySelectorAll(
        ".bundle-builder__step-products .bundle-builder__product.is-selected",
      )

      selectedProducts.forEach((product) => {
        try {
          const productId = product.dataset.productId
          console.log("Processing product:", productId)

          // Get variant ID directly from the data attribute
          let variantId = product.dataset.variantId
          if (variantId) {
            variantId = this.cleanVariantId(variantId)
            console.log("Using variant ID:", variantId)

            // Get product title for better display in cart
            const productTitle = product.querySelector(".bundle-builder__product-title")?.textContent || "Bundle Item"

            // Add to cart with properties
            items.push({
              id: variantId,
              quantity: 1,
              properties: {
                bundle_id: this.bundleId,
                step_id: stepId,
                bundle_name: this.bundleName,
                is_bundle_component: "true",
                item_name: productTitle, // Add product title for better display
              },
            })

            hasValidItems = true
          } else {
            console.error("No variant ID found for product:", productId)
          }
        } catch (error) {
          console.error("Error processing product:", error, product)
        }
      })
    })

    if (!hasValidItems || items.length === 0) {
      console.error("No valid items to add to cart")
      alert("Please select products for all steps before adding to cart.")
      return
    }

    try {
      // Show loading state
      const addToCartBtn = this.container.querySelector(".bundle-builder__add-cart")
      if (addToCartBtn) {
        addToCartBtn.textContent = "Adding to cart..."
        addToCartBtn.disabled = true
      }

      console.log("Final items to add to cart:", items)

      // Create a list of component names for display
      const componentNames = items.map((item) => item.properties.item_name || "Bundle Item").join(", ")

      // First, add a "parent" bundle item that will be transformed
      const parentItem = {
        id: items[0].id, // Use the first item as the parent
        quantity: 1,
        properties: {
          bundle_id: this.bundleId,
          bundle_name: this.bundleName,
          is_bundle_parent: "true",
          component_count: items.length.toString(),
          components: componentNames, // Add list of components
        },
      }

      console.log("Adding parent item:", parentItem)

      // Add the parent item first
      const parentResponse = await fetch("/cart/add.js", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify({ items: [parentItem] }),
      })

      if (!parentResponse.ok) {
        const errorData = await parentResponse.json()
        console.error("Cart error response (parent):", errorData)
        throw new Error(errorData.description || "Failed to add parent item to cart")
      }

      // Then add the component items
      const componentsResponse = await fetch("/cart/add.js", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify({ items }),
      })

      if (!componentsResponse.ok) {
        const errorData = await componentsResponse.json()
        console.error("Cart error response (components):", errorData)
        throw new Error(errorData.description || "Failed to add component items to cart")
      }

      const result = await componentsResponse.json()
      console.log("Cart response:", result)

      // Redirect to cart page
      window.location.href = "/cart?bundle_added=true"
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

  // Helper method to clean variant IDs
  cleanVariantId(variantId) {
    if (!variantId) return null

    // Convert to string if it's not already
    variantId = String(variantId)

    // Handle different ID formats
    if (variantId.includes("gid://shopify/ProductVariant/")) {
      // GraphQL ID format: gid://shopify/ProductVariant/12345
      return variantId.split("/").pop()
    } else if (variantId.includes("/")) {
      // Another possible GraphQL format
      return variantId.split("/").pop()
    } else if (variantId.includes(":")) {
      // Another possible format: shopify:variant:12345
      return variantId.split(":").pop()
    }

    return variantId
  }
}

// Initialize on DOM load
document.addEventListener("DOMContentLoaded", () => {
  console.log("Bundle Builder script loaded")

  // Initialize bundle builders
  const containers = document.querySelectorAll(".bundle-builder")
  containers.forEach((container) => new BundleBuilder(container))

  // Store product variants for debugging
  window.bundleBuilderVariants = {}
})

