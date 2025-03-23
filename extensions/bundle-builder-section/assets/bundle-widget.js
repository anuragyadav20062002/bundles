class BundleBuilder {
  constructor(container) {
    this.container = container
    this.bundleId = container.dataset.bundleId || this.generateBundleId()
    this.steps = container.querySelectorAll(".bundle-builder__step")
    this.modal = container.querySelector(".bundle-builder__modal")
    this.modalContent = this.modal?.querySelector(".bundle-builder__modal-content")
    this.modalTitle = this.modal?.querySelector(".bundle-builder__modal-title")
    this.modalSubtitle = this.modal?.querySelector(".bundle-builder__modal-subtitle-main")
    this.modalSubtitleSub = this.modal?.querySelector(".bundle-builder__modal-subtitle-sub")
    this.modalProductsContainer = this.modal?.querySelector(".bundle-builder__products-row")
    this.selectedProducts = new Map()
    this.bundleName = container.dataset.bundleName || "Custom Bundle"
    this.currentStep = null
    this.shopifyMoneyFormat = window.Shopify?.money_format || "Rs. {{amount}}"
    this.defaultImageUrl = "https://cdn.shopify.com/s/files/1/0533/2089/files/placeholder-images-image_large.png"

    console.log("Bundle Builder initialized with bundle ID:", this.bundleId)
    this.init()

    // Load product images from Shopify CDN
    this.loadProductImages()
  }

  // Generate a unique bundle ID if none provided
  generateBundleId() {
    return "bundle_" + Math.random().toString(36).substring(2, 10)
  }

  // Load product images from Shopify CDN
  loadProductImages() {
    // Get all product IDs from the page
    const productElements = document.querySelectorAll("[data-product-id]")

    // Try to load images for each product
    productElements.forEach((el) => {
      const fullId = el.getAttribute("data-product-id")
      if (!fullId) return

      const cleanId = fullId.replace("gid://shopify/Product/", "")

      // Try to load image from Shopify CDN
      const img = new Image()
      img.onload = () => {
        // Update all instances of this product image
        const productImages = document.querySelectorAll(
          `.bundle-builder__product-image img[data-product-id="${cleanId}"]`,
        )
        productImages.forEach((imgEl) => {
          imgEl.src = img.src
        })
      }

      // Set source to Shopify CDN with product ID
      img.src = `https://cdn.shopify.com/s/files/1/0533/2089/products/${cleanId}.jpg`
    })
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

    this.currentStep = step
    const stepId = step.dataset.stepId
    const stepTitle = step.querySelector(".bundle-builder__step-title")?.textContent
    const stepProducts = step.querySelector(".bundle-builder__step-products")
    const minQuantity = Number.parseInt(step.dataset.minQuantity || "1", 10)
    const maxQuantity = Number.parseInt(step.dataset.maxQuantity || "1", 10)

    console.log("Opening modal for step:", stepId, "with", stepProducts?.children.length || 0, "products")

    // Set modal title
    if (this.modalTitle) {
      this.modalTitle.textContent = stepTitle || "Select Products"
    }

    // Set modal subtitle
    if (this.modalSubtitle) {
      const stepName = stepTitle?.replace("Add ", "") || "Products"
      this.modalSubtitle.textContent = `${stepName} ${minQuantity}`
    }

    if (this.modalSubtitleSub) {
      if (minQuantity === maxQuantity) {
        this.modalSubtitleSub.textContent = `Select ${minQuantity} product(s) to continue`
      } else {
        this.modalSubtitleSub.textContent = `Select ${minQuantity}-${maxQuantity} product(s) to continue`
      }
    }

    // Store current step ID
    this.modal.dataset.currentStepId = stepId

    // Clear previous products
    this.modalProductsContainer.innerHTML = ""

    // Move products to modal
    if (stepProducts) {
      const products = stepProducts.querySelectorAll(".bundle-builder__product")
      console.log(`Found ${products.length} products in step ${stepId}`)

      products.forEach((product, index) => {
        const productId = product.dataset.productId
        console.log(`Processing product ${index + 1}:`, productId)

        // Log the full HTML to debug
        console.log("Product HTML:", product.outerHTML)

        const clone = this.createProductCard(product, minQuantity, maxQuantity)
        this.modalProductsContainer.appendChild(clone)
      })
    }

    // Show modal
    this.modal.classList.add("is-open")
    document.body.style.overflow = "hidden"
  }

  // Format money according to Shopify's format
  formatMoney(cents, format) {
    if (typeof cents === "string") {
      cents = cents.replace(".", "")
    }

    let value = ""
    const placeholderRegex = /\{\{\s*(\w+)\s*\}\}/
    const formatString = format || this.shopifyMoneyFormat

    function formatWithDelimiters(number, precision, thousands, decimal) {
      thousands = thousands || ","
      decimal = decimal || "."

      if (isNaN(number) || number === null) {
        return 0
      }

      number = (number / 100.0).toFixed(precision)

      const parts = number.split(".")
      const dollarsAmount = parts[0].replace(/(\d)(?=(\d\d\d)+(?!\d))/g, "$1" + thousands)
      const centsAmount = parts[1] ? decimal + parts[1] : ""

      return dollarsAmount + centsAmount
    }

    switch (formatString.match(placeholderRegex)[1]) {
      case "amount":
        value = formatWithDelimiters(cents, 2)
        break
      case "amount_no_decimals":
        value = formatWithDelimiters(cents, 0)
        break
      case "amount_with_comma_separator":
        value = formatWithDelimiters(cents, 2, ".", ",")
        break
      case "amount_no_decimals_with_comma_separator":
        value = formatWithDelimiters(cents, 0, ".", ",")
        break
      case "amount_with_space_separator":
        value = formatWithDelimiters(cents, 2, " ", ".")
        break
    }

    return formatString.replace(placeholderRegex, value)
  }

  // Create a product card for the modal
  createProductCard(product, minQuantity, maxQuantity) {
    // Create a new product card element
    const clone = document.createElement("div")
    clone.className = "bundle-builder__product"

    // Copy all data attributes
    for (const attr of product.attributes) {
      if (attr.name.startsWith("data-")) {
        clone.setAttribute(attr.name, attr.value)
      }
    }

    const productId = product.dataset.productId
    const productTitle = product.querySelector(".bundle-builder__product-title")?.textContent || "Product"
    const cleanProductId = this.cleanProductId(productId)

    console.log("Creating product card for:", productId, productTitle)

    // Get variants data
    let variantsData = []
    try {
      const variantsAttr = product.dataset.variants
      if (variantsAttr) {
        variantsData = JSON.parse(variantsAttr)
        console.log("Parsed variants data:", variantsData)
      }
    } catch (error) {
      console.error("Error parsing variants data:", error)
    }

    // Determine if product has multiple variants
    const hasMultipleVariants = Array.isArray(variantsData) && variantsData.length > 1

    // Get the default variant
    let defaultVariant = null
    const defaultVariantId = product.dataset.variantId

    if (variantsData.length > 0) {
      defaultVariant =
        variantsData.find((v) => this.cleanVariantId(v.id) === this.cleanVariantId(defaultVariantId)) || variantsData[0]
    }

    // Get price display
    let priceDisplay = ""
    if (defaultVariant) {
      console.log("Default variant price:", defaultVariant.price)
      // Multiply by 100 to convert dollars to cents for the formatMoney function
      const priceInCents = Number.parseFloat(defaultVariant.price) * 100
      priceDisplay = this.formatMoney(priceInCents)

      // Add compare at price if available
      if (defaultVariant.compareAtPrice) {
        const compareAtPriceInCents = Number.parseFloat(defaultVariant.compareAtPrice) * 100
        priceDisplay = `<span class="bundle-builder__product-compare-price">${this.formatMoney(compareAtPriceInCents)}</span> ${priceDisplay}`
      }
    }

    // Create variant selector options if needed
    let variantOptions = ""
    if (hasMultipleVariants) {
      variantsData.forEach((variant) => {
        const variantId = this.cleanVariantId(variant.id)
        const isSelected = variantId === this.cleanVariantId(defaultVariantId)
        const priceInCents = Number.parseFloat(variant.price) * 100
        variantOptions += `<option value="${variantId}" ${isSelected ? "selected" : ""}>${variant.title} - ${this.formatMoney(priceInCents)}</option>`
      })
    }

    // Build variant selector HTML if needed
    const variantSelectorHtml = hasMultipleVariants
      ? `<div class="bundle-builder__variant-selector">
      <select class="bundle-builder__variant-select">
        ${variantOptions}
      </select>
    </div>`
      : ""

    // Try to get image from Shopify CDN
    const imageUrl = `https://cdn.shopify.com/s/files/1/0533/2089/products/${cleanProductId}.jpg`
    console.log("Using Shopify CDN image URL:", imageUrl)

    // Build the HTML structure
    clone.innerHTML = `
  <div class="bundle-builder__product-image-container">
    <div class="bundle-builder__product-image">
      <img src="${imageUrl}" 
           alt="${productTitle}" 
           loading="lazy"
           data-product-id="${cleanProductId}"
           onerror="this.onerror=null; this.src='https://cdn.shopify.com/s/files/1/0533/2089/files/placeholder-images-image_large.png';">
    </div>
  </div>
  <div class="bundle-builder__product-info">
    <h4 class="bundle-builder__product-title">${productTitle}</h4>
    <div class="bundle-builder__product-price">${priceDisplay}</div>
    ${variantSelectorHtml}
    <div class="bundle-builder__product-actions">
      <button type="button" class="bundle-builder__product-add">Add to Cart</button>
      <div class="bundle-builder__quantity-selector">
        <button type="button" class="bundle-builder__quantity-btn bundle-builder__quantity-decrease">-</button>
        <input type="number" class="bundle-builder__quantity-value" value="1" min="1" max="${maxQuantity}" readonly>
        <button type="button" class="bundle-builder__quantity-btn bundle-builder__quantity-increase">+</button>
      </div>
    </div>
  </div>
`

    // Store the current variant ID
    if (defaultVariant) {
      clone.dataset.currentVariantId = this.cleanVariantId(defaultVariant.id)
    }

    // Add event listeners
    const addButton = clone.querySelector(".bundle-builder__product-add")
    if (addButton) {
      addButton.addEventListener("click", (e) => {
        e.stopPropagation() // Prevent event bubbling
        this.selectProduct(clone)
      })
    }

    // Add variant selector event listener
    const variantSelect = clone.querySelector(".bundle-builder__variant-select")
    if (variantSelect) {
      variantSelect.addEventListener("change", (e) => {
        e.stopPropagation() // Prevent event bubbling
        this.updateVariant(clone, e.target.value, variantsData)
      })
    }

    // Make the product image and container clickable for selection/deselection
    const productImageContainer = clone.querySelector(".bundle-builder__product-image-container")
    if (productImageContainer) {
      productImageContainer.addEventListener("click", (e) => {
        e.stopPropagation() // Prevent event bubbling
        if (clone.classList.contains("is-selected")) {
          this.deselectProduct(clone)
        } else {
          this.selectProduct(clone)
        }
      })
    }

    const productTitleEl = clone.querySelector(".bundle-builder__product-title")
    if (productTitleEl) {
      productTitleEl.addEventListener("click", (e) => {
        e.stopPropagation() // Prevent event bubbling
        if (clone.classList.contains("is-selected")) {
          this.deselectProduct(clone)
        } else {
          this.selectProduct(clone)
        }
      })
    }

    const decreaseBtn = clone.querySelector(".bundle-builder__quantity-decrease")
    if (decreaseBtn) {
      decreaseBtn.addEventListener("click", (e) => {
        e.stopPropagation() // Prevent event bubbling
        this.changeQuantity(clone, -1)
      })
    }

    const increaseBtn = clone.querySelector(".bundle-builder__quantity-increase")
    if (increaseBtn) {
      increaseBtn.addEventListener("click", (e) => {
        e.stopPropagation() // Prevent event bubbling
        this.changeQuantity(clone, 1)
      })
    }

    // Restore selected state if product was previously selected
    if (product.classList.contains("is-selected")) {
      clone.classList.add("is-selected")
      const quantity = Number.parseInt(product.dataset.quantity || "1", 10)
      const quantityInput = clone.querySelector(".bundle-builder__quantity-value")
      if (quantityInput) {
        quantityInput.value = quantity
      }
      this.updateQuantityButtons(clone)
    }

    return clone
  }

  // Clean product ID from various formats
  cleanProductId(productId) {
    if (!productId) return null

    // Convert to string if it's not already
    productId = String(productId)

    // Handle different ID formats
    if (productId.includes("gid://shopify/Product/")) {
      // GraphQL ID format: gid://shopify/Product/12345
      return productId.split("/").pop()
    } else if (productId.includes("/")) {
      // Another possible GraphQL format
      return productId.split("/").pop()
    } else if (productId.includes(":")) {
      // Another possible format: shopify:product:12345
      return productId.split(":").pop()
    }

    return productId
  }

  // Add method to update variant
  updateVariant(product, variantId, variantsData) {
    // Find the variant in the data
    const variant = variantsData.find((v) => this.cleanVariantId(v.id) === variantId)
    if (!variant) return

    console.log("Updating variant to:", variant)

    // Update the current variant ID
    product.dataset.currentVariantId = variantId

    // Update price display
    const priceElement = product.querySelector(".bundle-builder__product-price")
    if (priceElement) {
      let priceHtml = ""

      // Add compare at price if available
      if (variant.compareAtPrice) {
        const compareAtPriceInCents = Number.parseFloat(variant.compareAtPrice) * 100
        priceHtml += `<span class="bundle-builder__product-compare-price">${this.formatMoney(compareAtPriceInCents)}</span> `
      }

      const priceInCents = Number.parseFloat(variant.price) * 100
      priceHtml += this.formatMoney(priceInCents)
      priceElement.innerHTML = priceHtml
    }

    // Update image if variant has a different image
    if (variant.imageUrl) {
      const imgElement = product.querySelector(".bundle-builder__product-image img")
      if (imgElement) {
        imgElement.src = variant.imageUrl
      }
    }

    // Update the original product's variant ID
    const stepId = this.modal?.dataset.currentStepId
    if (stepId) {
      const step = this.getStepByID(stepId)
      const productId = product.dataset.productId
      const originalProduct = step?.querySelector(
        `.bundle-builder__step-products .bundle-builder__product[data-product-id="${productId}"]`,
      )
      if (originalProduct) {
        originalProduct.dataset.variantId = variant.id
        originalProduct.dataset.currentVariantId = variantId
      }
    }
  }

  // Fix the selectProduct method to ensure products can be selected
  selectProduct(product) {
    const stepId = this.modal?.dataset.currentStepId
    if (!stepId) return

    const step = this.getStepByID(stepId)
    if (!step) return

    const maxQuantity = Number.parseInt(step.dataset.maxQuantity || "1", 10)
    const selectedInModal =
      this.modalProductsContainer?.querySelectorAll(".bundle-builder__product.is-selected").length || 0

    // Check if this product is already selected
    if (product.classList.contains("is-selected")) {
      // If already selected, deselect it
      this.deselectProduct(product)
      return
    }

    // Check if we've reached the maximum allowed selections
    if (selectedInModal >= maxQuantity) {
      alert(`You can only select up to ${maxQuantity} products for this step.`)
      return
    }

    // Add selected class
    product.classList.add("is-selected")
    product.dataset.quantity = "1"

    // Update quantity buttons
    this.updateQuantityButtons(product)

    // Update the original product's selected state
    const productId = product.dataset.productId
    const currentVariantId = product.dataset.currentVariantId || product.dataset.variantId
    const originalProduct = step.querySelector(
      `.bundle-builder__step-products .bundle-builder__product[data-product-id="${productId}"]`,
    )
    if (originalProduct) {
      originalProduct.classList.add("is-selected")
      originalProduct.dataset.quantity = "1"
      if (currentVariantId) {
        originalProduct.dataset.currentVariantId = currentVariantId
      }
    }

    console.log(`Selected product: ${productId} with variant: ${currentVariantId}`)
  }

  // Add a new method to deselect a product
  deselectProduct(product) {
    const stepId = this.modal?.dataset.currentStepId
    if (!stepId) return

    const step = this.getStepByID(stepId)
    if (!step) return

    product.classList.remove("is-selected")
    delete product.dataset.quantity

    // Update the original product's selected state
    const productId = product.dataset.productId
    const originalProduct = step.querySelector(
      `.bundle-builder__step-products .bundle-builder__product[data-product-id="${productId}"]`,
    )
    if (originalProduct) {
      originalProduct.classList.remove("is-selected")
      delete originalProduct.dataset.quantity
    }
  }

  // Update the changeQuantity method to handle deselection when quantity is 0
  changeQuantity(product, change) {
    const quantityInput = product.querySelector(".bundle-builder__quantity-value")
    if (!quantityInput) return

    const currentQuantity = Number.parseInt(quantityInput.value, 10)
    const minQuantity = Number.parseInt(quantityInput.min, 10) || 1
    const maxQuantity = Number.parseInt(quantityInput.max, 10) || 99

    let newQuantity = currentQuantity + change

    // If decreasing to 0, deselect the product
    if (newQuantity < 1) {
      this.deselectProduct(product)
      return
    }

    // Enforce min/max constraints
    newQuantity = Math.max(minQuantity, Math.min(maxQuantity, newQuantity))

    // Update quantity
    quantityInput.value = newQuantity
    product.dataset.quantity = newQuantity.toString()

    // Update the original product
    const stepId = this.modal?.dataset.currentStepId
    if (stepId) {
      const step = this.getStepByID(stepId)
      const productId = product.dataset.productId
      const originalProduct = step?.querySelector(
        `.bundle-builder__step-products .bundle-builder__product[data-product-id="${productId}"]`,
      )
      if (originalProduct) {
        originalProduct.dataset.quantity = newQuantity.toString()
      }
    }

    this.updateQuantityButtons(product)
  }

  updateQuantityButtons(product) {
    const quantityInput = product.querySelector(".bundle-builder__quantity-value")
    const decreaseBtn = product.querySelector(".bundle-builder__quantity-decrease")
    const increaseBtn = product.querySelector(".bundle-builder__quantity-increase")

    if (!quantityInput || !decreaseBtn || !increaseBtn) return

    const currentQuantity = Number.parseInt(quantityInput.value, 10)
    const minQuantity = Number.parseInt(quantityInput.min, 10) || 1
    const maxQuantity = Number.parseInt(quantityInput.max, 10) || 99

    decreaseBtn.disabled = currentQuantity <= minQuantity
    increaseBtn.disabled = currentQuantity >= maxQuantity
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

  closeModal() {
    if (!this.modal) return

    this.modal.classList.remove("is-open")
    document.body.style.overflow = ""
    delete this.modal.dataset.currentStepId
    this.currentStep = null
  }

  // Add a new method to handle cart display
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

          // Get variant ID - use currentVariantId if available, otherwise fall back to variantId
          let variantId = product.dataset.currentVariantId || product.dataset.variantId
          if (variantId) {
            variantId = this.cleanVariantId(variantId)
            console.log("Using variant ID:", variantId)

            // Get quantity
            const quantity = Number.parseInt(product.dataset.quantity || "1", 10)

            // Add to cart with minimal properties - no bundle information
            items.push({
              id: variantId,
              quantity: quantity,
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

      // Add all items directly without parent/child relationship
      const response = await fetch("/cart/add.js", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify({ items }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        console.error("Cart error response:", errorData)
        throw new Error(errorData.description || "Failed to add items to cart")
      }

      const result = await response.json()
      console.log("Cart response:", result)

      // Redirect to cart page
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

  // Create a global object to store product data
  window.bundleBuilderData = window.bundleBuilderData || {}
  window.bundleBuilderData.products = window.bundleBuilderData.products || {}

  // Initialize bundle builders
  const containers = document.querySelectorAll(".bundle-builder")
  containers.forEach((container) => new BundleBuilder(container))
})

