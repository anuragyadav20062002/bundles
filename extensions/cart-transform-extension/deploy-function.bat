@echo off
echo === Deploying cart transformation function ===

REM Navigate to the function directory if needed
cd %~dp0

REM Make sure we have the wasm32-wasip1 target
rustup target add wasm32-wasip1

REM Clean previous builds for a fresh start
cargo clean

REM Build for WebAssembly
echo Building WASM file...
cargo build --target wasm32-wasip1 --release

REM Check if the build was successful
if not exist "target\wasm32-wasip1\release\cart_transform_extension.wasm" (
  echo [31m❌ Build failed: WASM file not found[0m
  exit /b 1
)

echo [32m✅ WASM file built successfully[0m
dir "target\wasm32-wasip1\release\cart_transform_extension.wasm"

REM Deploy with Shopify CLI
echo Deploying function to Shopify...
cd ..\..
npx shopify app deploy

echo [33m⚠️ IMPORTANT: Verify in Shopify admin that the function is enabled[0m
echo Go to: Settings → Checkout → Order processing → App integrations
echo === Deployment complete ===

