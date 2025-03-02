/**
 * @typedef {Object} Bundle
 * @property {string} id
 * @property {string} name
 * @property {string} [description]
 * @property {string} status
 * @property {string} shopId
 * @property {BundleStep[]} steps
 * @property {BundlePricing} [pricing]
 * @property {ProductMatching} [productMatching]
 * @property {string} [publishedAt]
 */

/**
 * @typedef {Object} BundleStep
 * @property {string} id
 * @property {string} name
 * @property {number} position
 * @property {number} minQuantity
 * @property {number} maxQuantity
 * @property {string} [collections]
 * @property {string} [products]
 * @property {StepProduct[]} StepProduct
 */

/**
 * @typedef {Object} StepProduct
 * @property {string} id
 * @property {string} productId
 * @property {string} title
 * @property {string} [imageUrl]
 * @property {any} [variants]
 * @property {number} minQuantity
 * @property {number} maxQuantity
 * @property {number} position
 */

/**
 * @typedef {Object} BundlePricing
 * @property {string} id
 * @property {string} bundleId
 * @property {string} type
 * @property {boolean} status
 * @property {string} [rules]
 * @property {boolean} showFooter
 * @property {boolean} showBar
 * @property {any} [messages]
 * @property {boolean} published
 */

/**
 * @typedef {Object} ProductMatching
 * @property {string[]} [tags]
 * @property {string[]} [collections]
 * @property {string[]} [productType]
 * @property {string[]} [vendor]
 * @property {string[]} [specificProducts]
 */

export {}

