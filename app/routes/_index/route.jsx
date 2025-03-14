"use client"

import { redirect } from "@remix-run/node"
import { Form, useLoaderData, useSearchParams } from "@remix-run/react"
import { authenticate } from "../../shopify.server"
import styles from "./styles.module.css"

export const loader = async ({ request }) => {
  console.log("=== INDEX ROUTE LOADER CALLED ===")
  console.log("Request URL:", request.url)

  const url = new URL(request.url)
  const shop = url.searchParams.get("shop")
  console.log("Shop from URL params:", shop)

  // If shop is provided, redirect to app or auth
  if (shop) {
    console.log("Shop parameter found, redirecting to app")
    return redirect(`/app?${url.searchParams.toString()}`)
  }

  // Check if user is authenticated
  const isAuthenticated = await authenticate.isAuthenticated(request)
  console.log("Is authenticated:", isAuthenticated)

  return {
    showForm: true, // Always show the form for simplicity
    shop: shop || "",
  }
}

export default function App() {
  const { showForm, shop } = useLoaderData()
  const [searchParams] = useSearchParams()
  const error = searchParams.get("error")

  return (
    <div className={styles.index}>
      <div className={styles.content}>
        <h1 className={styles.heading}>Bundle Builder for Shopify</h1>
        <p className={styles.text}>Create customizable product bundles for your Shopify store.</p>

        {error && (
          <div className={styles.error}>
            <p>Error: {error}</p>
          </div>
        )}

        {showForm && (
          <Form className={styles.form} method="post" action="/auth/login">
            <label className={styles.label}>
              <span>Shop domain</span>
              <input
                className={styles.input}
                type="text"
                name="shop"
                defaultValue={shop}
                placeholder="your-shop.myshopify.com"
              />
              <span>e.g: my-shop.myshopify.com</span>
            </label>
            <button className={styles.button} type="submit">
              Log in
            </button>
          </Form>
        )}
      </div>
    </div>
  )
}

