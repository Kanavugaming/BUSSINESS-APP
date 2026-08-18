// Builds a simple, printable plain-text receipt from a sale + its line items.
// Kept separate from the AI invoice summary — this is the deterministic,
// always-accurate version; the AI summary is a friendly narrative on top of it.
function buildReceiptText({ sale, items, customer }) {
  const lines = [];
  lines.push('==============================');
  lines.push('           RECEIPT');
  lines.push('==============================');
  lines.push(`Date: ${new Date(sale.created_at).toLocaleString()}`);
  lines.push(`Bill #: ${sale.id}`);
  if (customer) lines.push(`Customer: ${customer.name} (${customer.phone})`);
  lines.push('------------------------------');

  items.forEach(item => {
    lines.push(`${item.product_name} x${item.quantity}  ₹${item.line_total.toFixed(2)}`);
  });

  lines.push('------------------------------');
  lines.push(`Subtotal:   ₹${sale.subtotal.toFixed(2)}`);
  lines.push(`Discount:  -₹${sale.discount_amount.toFixed(2)}`);
  lines.push(`Tax:        ₹${sale.tax_amount.toFixed(2)}`);
  lines.push(`TOTAL:      ₹${sale.total_amount.toFixed(2)}`);
  lines.push(`Payment:    ${sale.payment_mode.toUpperCase()}`);
  lines.push('==============================');
  lines.push('     Thank you for visiting!');
  lines.push('==============================');

  return lines.join('\n');
}

module.exports = { buildReceiptText };
