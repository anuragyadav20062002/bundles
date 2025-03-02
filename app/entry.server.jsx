import { PassThrough } from "stream"
import { renderToPipeableStream } from "react-dom/server"
import { RemixServer } from "@remix-run/react"
import { createReadableStreamFromReadable } from "@remix-run/node"
import { isbot } from "isbot"
import { addDocumentResponseHeaders } from "./shopify.server"

const ABORT_DELAY = 5000

export default async function handleRequest(request, responseStatusCode, responseHeaders, remixContext) {
  addDocumentResponseHeaders(request, responseHeaders)

  const userAgent = request.headers.get("user-agent")
  const callbackName = isbot(userAgent ?? "") ? "onAllReady" : "onShellReady"

  return new Promise((resolve, reject) => {
    let didError = false

    const { pipe, abort } = renderToPipeableStream(<RemixServer context={remixContext} url={request.url} />, {
      [callbackName]: () => {
        const body = new PassThrough()
        const stream = createReadableStreamFromReadable(body)

        responseHeaders.set("Content-Type", "text/html")

        // Add security headers
        responseHeaders.set("X-Frame-Options", "ALLOWALL")
        responseHeaders.set(
          "Content-Security-Policy",
          "frame-ancestors 'self' https://*.myshopify.com https://admin.shopify.com;",
        )

        resolve(
          new Response(stream, {
            headers: responseHeaders,
            status: didError ? 500 : responseStatusCode,
          }),
        )

        pipe(body)
      },
      onShellError(error) {
        reject(error)
      },
      onError(error) {
        didError = true
        console.error(error)
      },
    })

    setTimeout(abort, ABORT_DELAY)
  })
}

