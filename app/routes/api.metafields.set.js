// app/routes/api.metafields.set.js
import { json } from "@remix-run/node";
import { authenticate } from "../shopify.server";

export const action = async ({ request }) => {
  const { admin } = await authenticate.admin(request);
  const data = await request.json();
  const { variantId, namespace, key, value, type } = data;

  try {
    // First, we need to get the full variant ID in the gid format
    const variantResponse = await admin.graphql(
      `query getVariant($id: ID!) {
        productVariant(id: $id) {
          id
        }
      }`,
      {
        variables: {
          id: variantId.includes("gid://") ? variantId : `gid://shopify/ProductVariant/${variantId}`,
        },
      }
    );

    const variantData = await variantResponse.json();
    const fullVariantId = variantData.data.productVariant?.id;

    if (!fullVariantId) {
      return json({ error: "Variant not found" }, { status: 404 });
    }

    // Now set the metafield
    const metafieldResponse = await admin.graphql(
      `mutation metafieldSet($input: ProductVariantMetafieldInput!) {
        productVariantUpdate(input: {
          id: "${fullVariantId}",
          metafields: [$input]
        }) {
          productVariant {
            id
            metafields(first: 10) {
              edges {
                node {
                  id
                  namespace
                  key
                  value
                }
              }
            }
          }
          userErrors {
            field
            message
          }
        }
      }`,
      {
        variables: {
          input: {
            namespace,
            key,
            value,
            type: type || "json",
          },
        },
      }
    );

    const metafieldData = await metafieldResponse.json();
    
    if (metafieldData.data?.productVariantUpdate?.userErrors?.length > 0) {
      const errors = metafieldData.data.productVariantUpdate.userErrors;
      return json({ error: errors[0].message }, { status: 400 });
    }

    return json({ success: true });
  } catch (error) {
    console.error("Error setting metafield:", error);
    return json({ error: error.message }, { status: 500 });
  }
};