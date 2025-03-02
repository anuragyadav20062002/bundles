import { prisma } from "../db.server"

export async function getBundles(shop) {
  return await prisma.bundle.findMany({
    where: {
      shopId: shop,
    },
    include: {
      steps: {
        orderBy: {
          position: "asc",
        },
      },
    },
    orderBy: {
      updatedAt: "desc",
    },
  })
}

export async function getBundle(id, shop) {
  return await prisma.bundle.findFirst({
    where: {
      id,
      shopId: shop,
    },
    include: {
      steps: {
        orderBy: {
          position: "asc",
        },
      },
    },
  })
}

export async function createBundle(data) {
  try {
    const bundle = await prisma.bundle.create({
      data: {
        name: data.name,
        description: data.description,
        shopId: data.shopId,
        active: false,
      },
    })

    return bundle
  } catch (error) {
    console.error("Bundle creation error:", error)
    throw new Error("Failed to create bundle")
  }
}

export async function updateBundle(id, data, shop) {
  try {
    const bundle = await prisma.bundle.update({
      where: {
        id,
        shopId: shop,
      },
      data,
    })

    return bundle
  } catch (error) {
    console.error("Bundle update error:", error)
    throw new Error("Failed to update bundle")
  }
}

export async function deleteBundle(id, shop) {
  try {
    await prisma.bundle.delete({
      where: {
        id,
        shopId: shop,
      },
    })
    return true
  } catch (error) {
    console.error("Bundle deletion error:", error)
    throw new Error("Failed to delete bundle")
  }
}

