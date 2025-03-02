-- CreateTable
CREATE TABLE "Session" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "shop" TEXT NOT NULL,
    "state" TEXT NOT NULL,
    "isOnline" BOOLEAN NOT NULL DEFAULT false,
    "scope" TEXT,
    "expires" DATETIME,
    "accessToken" TEXT NOT NULL,
    "userId" BIGINT,
    "firstName" TEXT,
    "lastName" TEXT,
    "email" TEXT,
    "accountOwner" BOOLEAN NOT NULL DEFAULT false,
    "locale" TEXT,
    "collaborator" BOOLEAN NOT NULL DEFAULT false,
    "emailVerified" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "Bundle" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "shopId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'draft',
    "active" BOOLEAN NOT NULL DEFAULT false,
    "publishedAt" DATETIME,
    "settings" JSONB,
    "matching" JSONB,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "BundleStep" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "icon" TEXT DEFAULT 'box',
    "position" INTEGER NOT NULL DEFAULT 0,
    "minQuantity" INTEGER NOT NULL DEFAULT 1,
    "maxQuantity" INTEGER NOT NULL DEFAULT 1,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "productCategory" TEXT,
    "collections" TEXT,
    "products" TEXT,
    "bundleId" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "BundleStep_bundleId_fkey" FOREIGN KEY ("bundleId") REFERENCES "Bundle" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "StepProduct" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "stepId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "imageUrl" TEXT,
    "variants" JSONB,
    "minQuantity" INTEGER NOT NULL DEFAULT 1,
    "maxQuantity" INTEGER NOT NULL DEFAULT 1,
    "position" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "StepProduct_stepId_fkey" FOREIGN KEY ("stepId") REFERENCES "BundleStep" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "BundlePricing" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "bundleId" TEXT NOT NULL,
    "type" TEXT NOT NULL DEFAULT 'percentage',
    "status" BOOLEAN NOT NULL DEFAULT false,
    "rules" TEXT,
    "showFooter" BOOLEAN NOT NULL DEFAULT true,
    "showBar" BOOLEAN NOT NULL DEFAULT false,
    "messages" JSONB,
    "published" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "BundlePricing_bundleId_fkey" FOREIGN KEY ("bundleId") REFERENCES "Bundle" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "BundleAnalytics" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "bundleId" TEXT NOT NULL,
    "shopId" TEXT NOT NULL,
    "event" TEXT NOT NULL,
    "metadata" JSONB,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "BundleAnalytics_bundleId_fkey" FOREIGN KEY ("bundleId") REFERENCES "Bundle" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ShopSettings" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "shopId" TEXT NOT NULL,
    "theme" JSONB,
    "defaultSettings" JSONB,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "QueuedJob" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "shopId" TEXT NOT NULL,
    "type" TEXT NOT NULL DEFAULT 'publish',
    "status" TEXT NOT NULL DEFAULT 'pending',
    "data" JSONB,
    "error" TEXT,
    "startedAt" DATETIME,
    "completedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateIndex
CREATE INDEX "Session_shop_idx" ON "Session"("shop");

-- CreateIndex
CREATE INDEX "Bundle_shopId_idx" ON "Bundle"("shopId");

-- CreateIndex
CREATE INDEX "Bundle_status_idx" ON "Bundle"("status");

-- CreateIndex
CREATE INDEX "BundleStep_bundleId_idx" ON "BundleStep"("bundleId");

-- CreateIndex
CREATE INDEX "StepProduct_stepId_idx" ON "StepProduct"("stepId");

-- CreateIndex
CREATE INDEX "StepProduct_productId_idx" ON "StepProduct"("productId");

-- CreateIndex
CREATE UNIQUE INDEX "BundlePricing_bundleId_key" ON "BundlePricing"("bundleId");

-- CreateIndex
CREATE INDEX "BundlePricing_bundleId_idx" ON "BundlePricing"("bundleId");

-- CreateIndex
CREATE INDEX "BundleAnalytics_bundleId_idx" ON "BundleAnalytics"("bundleId");

-- CreateIndex
CREATE INDEX "BundleAnalytics_shopId_idx" ON "BundleAnalytics"("shopId");

-- CreateIndex
CREATE INDEX "BundleAnalytics_event_idx" ON "BundleAnalytics"("event");

-- CreateIndex
CREATE INDEX "BundleAnalytics_createdAt_idx" ON "BundleAnalytics"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "ShopSettings_shopId_key" ON "ShopSettings"("shopId");

-- CreateIndex
CREATE INDEX "ShopSettings_shopId_idx" ON "ShopSettings"("shopId");

-- CreateIndex
CREATE INDEX "QueuedJob_shopId_idx" ON "QueuedJob"("shopId");

-- CreateIndex
CREATE INDEX "QueuedJob_status_idx" ON "QueuedJob"("status");

-- CreateIndex
CREATE INDEX "QueuedJob_type_idx" ON "QueuedJob"("type");
