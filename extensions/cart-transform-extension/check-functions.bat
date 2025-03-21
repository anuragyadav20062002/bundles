@echo off
echo === Checking cart transformation function ===

REM Get app info
echo Getting app info...
npx shopify app info

REM List functions
echo Listing functions...
npx shopify app function list

echo === Check complete ===

