const fs = require('fs');
const path = require('path');

// Read the current cart service file
const cartServicePath = path.join(__dirname, 'src/services/cartService.ts');
let content = fs.readFileSync(cartServicePath, 'utf8');

// Add broadcast to addItem method (after line 231: const savedCart = await cartService.saveCart(newCart);)
const addItemBroadcast = `
    // Broadcast cart update for cross-device sync
    try {
      await BroadcastHelper.sendCartUpdate('cart-item-added', {
        productId: product.id,
        quantity,
        cartTotal: savedCart.total,
        itemCount: savedCart.items.length
      });
    } catch (error) {
      console.warn('Failed to broadcast cart update:', error);
    }
`;

// Add broadcast to updateQuantity method (after the saveCart call)
const updateQuantityBroadcast = `
    // Broadcast cart update for cross-device sync
    try {
      await BroadcastHelper.sendCartUpdate('cart-quantity-updated', {
        productId,
        quantity,
        cartTotal: savedCart.total,
        itemCount: savedCart.items.length
      });
    } catch (error) {
      console.warn('Failed to broadcast cart update:', error);
    }
`;

// Find and replace the addItem method
content = content.replace(
  /(\s+const savedCart = await cartService\.saveCart\(newCart\);\s+)(return \{)/,
  `$1${addItemBroadcast}\n    $2`
);

// Find and replace the updateQuantity method
content = content.replace(
  /(\s+const savedCart = await cartService\.saveCart\(newCart\);\s+)(return \{\s+success: true,\s+cart: savedCart\s+\};\s+\},\s+\/\/ Clear cart)/,
  `$1${updateQuantityBroadcast}\n    return {\n      success: true,\n      cart: savedCart\n    };\n  },\n\n  $2`
);

// Write the updated content back
fs.writeFileSync(cartServicePath, content, 'utf8');
console.log('Cart broadcast events added successfully!');
