import { PrismaClient } from "@prisma/client"

let prisma

// Prevent multiple instances of Prisma Client in development
/** @type {import('@prisma/client').PrismaClient} */
let globalPrisma

if (process.env.NODE_ENV === "production") {
  prisma = new PrismaClient()
} else {
  if (!globalPrisma) {
    globalPrisma = new PrismaClient({
      log: ["query", "error", "warn"],
    })
  }
  prisma = globalPrisma
}

// Add error handling for database operations
prisma.$use(async (params, next) => {
  try {
    return await next(params)
  } catch (error) {
    console.error("Database error:", {
      model: params.model,
      action: params.action,
      error: error.message,
    })
    throw error
  }
})

// Export both default and named export
export { prisma }
export default prisma