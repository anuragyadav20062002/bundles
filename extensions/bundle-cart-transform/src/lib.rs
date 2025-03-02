use serde::{Deserialize, Serialize};
use shopify_function::prelude::*;
use shopify_function::Result;

// Input types
#[derive(Deserialize, Serialize)]
struct Input {
    cart: Cart,
    configuration: Configuration,
}

#[derive(Deserialize, Serialize)]
struct Configuration {
    namespace: String,
    key: String,
}

#[derive(Deserialize, Serialize)]
struct Cart {
    lines: Vec<CartLine>,
    discount_applications: Vec<DiscountApplication>,
}

#[derive(Deserialize, Serialize)]
struct CartLine {
    id: String,
    quantity: i32,
    merchandise: Merchandise,
    attributes: Vec<Attribute>,
}

#[derive(Deserialize, Serialize)]
struct Merchandise {
    id: String,
    price: Price,
    product: Product,
}

#[derive(Deserialize, Serialize)]
struct Product {
    id: String,
    metafields: Vec<Metafield>,
}

#[derive(Deserialize, Serialize)]
struct Metafield {
    namespace: String,
    key: String,
    value: String,
}

#[derive(Deserialize, Serialize)]
struct Price {
    amount: String,
}

#[derive(Deserialize, Serialize)]
struct Attribute {
    key: String,
    value: String,
}

#[derive(Deserialize, Serialize)]
struct DiscountApplication {
    title: String,
    value: DiscountValue,
}

#[derive(Deserialize, Serialize)]
struct DiscountValue {
    amount: String,
    #[serde(rename = "type")]
    discount_type: String,
}

// Output type
#[derive(Serialize)]
struct Output {
    cart: Cart,
}

#[shopify_function]
fn function(input: Input) -> Result<Output> {
    let mut cart = input.cart;
    
    // Find bundle items
    let bundle_items: Vec<&CartLine> = cart.lines.iter()
        .filter(|line| {
            line.attributes.iter().any(|attr| attr.key == "_bundle_id")
        })
        .collect();

    // Process each bundle
    for line in bundle_items {
        if let Some(bundle_attr) = line.attributes.iter().find(|attr| attr.key == "_bundle_id") {
            let bundle_id = &bundle_attr.value;
            
            // Look for bundle configuration in metafields
            if let Some(bundle_meta) = line.merchandise.product.metafields.iter()
                .find(|m| m.namespace == input.configuration.namespace && m.key == *bundle_id) {
                
                // Parse bundle configuration
                if let Ok(config) = serde_json::from_str::<serde_json::Value>(&bundle_meta.value) {
                    // Apply discount if configured
                    if let Some(discount) = config.get("discount") {
                        if let (Some(discount_type), Some(amount)) = (
                            discount.get("type").and_then(|v| v.as_str()),
                            discount.get("amount").and_then(|v| v.as_str())
                        ) {
                            // Calculate line item price
                            let price = line.merchandise.price.amount.parse::<f64>().unwrap_or(0.0);
                            let quantity = line.quantity as f64;
                            let total = price * quantity;
                            
                            // Calculate discount
                            let discount_amount = match discount_type {
                                "percentage" => {
                                    let percentage = amount.parse::<f64>().unwrap_or(0.0);
                                    total * (percentage / 100.0)
                                },
                                "fixed" => amount.parse::<f64>().unwrap_or(0.0),
                                _ => 0.0
                            };

                            // Add discount application
                            if discount_amount > 0.0 {
                                cart.discount_applications.push(DiscountApplication {
                                    title: format!("Bundle Discount: {}", bundle_id),
                                    value: DiscountValue {
                                        amount: discount_amount.to_string(),
                                        discount_type: "fixed_amount".to_string(),
                                    },
                                });
                            }
                        }
                    }
                }
            }
        }
    }

    Ok(Output { cart })
}

// Add this new start function
#[no_mangle]
#[allow(clippy::all)]
pub extern "C" fn _start() {
    use std::ffi::CStr;
    use std::os::raw::c_char;
    
    #[no_mangle]
    pub extern "C" fn alloc(size: usize) -> *mut u8 {
        let mut buf = Vec::with_capacity(size);
        let ptr = buf.as_mut_ptr();
        std::mem::forget(buf);
        ptr
    }

    #[no_mangle]
    pub extern "C" fn dealloc(ptr: *mut u8, size: usize) {
        unsafe {
            let _ = Vec::from_raw_parts(ptr, 0, size);
        }
    }

    #[no_mangle]
    pub extern "C" fn run(data: *const c_char) -> *const c_char {
        let input = unsafe { CStr::from_ptr(data) }.to_str().unwrap();
        
        match serde_json::from_str::<Input>(input) {
            Ok(input) => {
                match function(input) {
                    Ok(output) => {
                        let json = serde_json::to_string(&output).unwrap();
                        let c_str = std::ffi::CString::new(json).unwrap();
                        c_str.into_raw()
                    },
                    Err(e) => {
                        let error = format!("{{\"error\": \"{}\"}}", e);
                        let c_str = std::ffi::CString::new(error).unwrap();
                        c_str.into_raw()
                    }
                }
            },
            Err(e) => {
                let error = format!("{{\"error\": \"Failed to parse input: {}\"}}", e);
                let c_str = std::ffi::CString::new(error).unwrap();
                c_str.into_raw()
            }
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    
    #[test]
    fn test_function() {
        let input = Input {
            cart: Cart {
                lines: vec![],
                discount_applications: vec![],
            },
            configuration: Configuration {
                namespace: "bundles".to_string(),
                key: "cart_transform_config".to_string(),
            },
        };
        
        let result = function(input).unwrap();
        assert_eq!(result.cart.discount_applications.len(), 0);
    }
}