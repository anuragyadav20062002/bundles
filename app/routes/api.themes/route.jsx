import { json } from "@remix-run/node"
import { authenticate } from "../../shopify.server"

export const loader = async ({ request }) => {
  const { admin } = await authenticate.admin(request)

  const response = await admin.graphql(
    `#graphql
      query getThemes {
        themes(first: 1) {
          nodes {
            id
            name
            role
          }
        }
      }
    `,
  )

  const themes = await response.json()
  const mainTheme = themes.data.themes.nodes.find((theme) => theme.role === "main")
  const themeId = mainTheme?.id || themes.data.themes.nodes[0]?.id

  return json({ themeId })
}

