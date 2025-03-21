use shopify_function::prelude::*;
use shopify_function::Result;
use std::collections::HashMap;

#[allow(clippy::upper_case_acronyms)]
type URL = String;

#[shopify_function_target(query_path = "src/run.graphql", schema_path = "schema.graphql")]
fn run(input: input::ResponseData) -> Result<output::FunctionRunResult> {
    // Group cart lines by bundle ID
    eprintln!("CART TRANSFORM FUNCTION CALLED WITH {} LINES", input.cart.lines.len());
    
    let mut bundle_groups: HashMap<String, Vec<input::InputCartLines>> = HashMap::new();
    
    // First pass: identify bundle items and group them
    for line in &input.cart.lines {
        let bundle_id = line.attribute.iter()
            .find(|attr| attr.key == "bundle_id")
            .and_then(|attr| attr.value.clone())
            .unwrap_or_default();
        
        if !bundle_id.is_empty() {
            // Add to the appropriate bundle group
            bundle_groups.entry(bundle_id).or_insert_with(Vec::new).push(line.clone());
        }
    }
    
    // If no bundles found, return no changes
    if bundle_groups.is_empty() {
        return Ok(output::FunctionRunResult { operations: vec![] });
    }
    
    // Create operations to transform the cart
    let mut operations = Vec::new();
    
    // Process each bundle group
    for (bundle_id, items) in bundle_groups {
        if items.len() < 2 {
            continue; // Need at least 2 items to merge
        }
        
        // Find the parent item (the one with is_bundle_parent property)
        let (parent_line_id, parent_variant_id, bundle_name) = items.iter().fold((String::new(), String::new(), format!("Bundle {}", bundle_id)), |(parent_id, variant_id, name), item| {
            let is_parent = item.attribute.iter().any(|attr| attr.key == "is_bundle_parent" && attr.value.as_deref() == Some("true"));
            let item_name = item.attribute.iter().find(|attr| attr.key == "bundle_name").and_then(|attr| attr.value.clone()).unwrap_or(name.clone());
            
            if is_parent {
                let variant_id = if let input::InputCartLinesMerchandise::ProductVariant(variant) = &item.merchandise {
                    variant.id.clone()
                } else {
                    String::new()
                };
                (item.id.clone(), variant_id, item_name)
            } else {
                (parent_id, variant_id, name)
            }
        });
        
        // If no parent found, use the first item
        let parent_line_id = if parent_line_id.is_empty() && !items.is_empty() {
            items[0].id.clone()
        } else {
            parent_line_id
        };
        
        // Create cart line inputs for all items
        let cart_line_inputs: Vec<output::CartLineInput> = items.iter().map(|item| output::CartLineInput {
            cart_line_id: item.id.clone(),
            quantity: item.quantity,
        }).collect();
        
        // Create attributes for the merged item
        let mut attributes = vec![
            output::AttributeOutput { key: "bundle_id".to_string(), value: bundle_id.clone() },
            output::AttributeOutput { key: "bundle_name".to_string(), value: bundle_name.clone() },
        ];
        
        // Create the merge operation
        operations.push(output::CartOperation::Merge(output::MergeOperation {
            cart_lines: cart_line_inputs,
            parent_variant_id,
            title: Some(bundle_name),
            attributes: Some(attributes),
            image: Some(output::ImageInput {
                url: "https://example.com/bundleimage.jpg".to_string(), // Update with a valid URL
            }),
            price: None,
        }));
    }
    
    Ok(output::FunctionRunResult { operations })
}

