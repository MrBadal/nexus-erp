/**
 * Calculate tax amount on a given base amount.
 *
 * @param amount - The base or gross amount
 * @param rate - Tax rate as a percentage (e.g. 10 for 10%)
 * @param isInclusive - If true, the amount already includes tax
 * @param isCompound - If true, tax is compounded (applied on top of previous taxes)
 * @returns The tax amount
 */
export function calculateTax(
  amount: number,
  rate: number,
  isInclusive: boolean = false,
  isCompound: boolean = false,
): number {
  const rateDecimal = rate / 100;

  if (isInclusive) {
    // Extract tax from a tax-inclusive amount
    return roundCurrency(amount - amount / (1 + rateDecimal));
  }

  if (isCompound) {
    // Compound tax is calculated on the amount + previous taxes
    // The caller should pass the accumulated amount (base + prior taxes)
    return roundCurrency(amount * rateDecimal);
  }

  return roundCurrency(amount * rateDecimal);
}

/**
 * Round a monetary amount to the specified number of decimal places
 * using banker's rounding (round half to even).
 */
export function roundCurrency(amount: number, decimalPlaces: number = 2): number {
  const factor = Math.pow(10, decimalPlaces);
  return Math.round((amount + Number.EPSILON) * factor) / factor;
}

/**
 * Returns true if the given account type normally carries a debit balance.
 * Asset and Expense accounts have debit normal balances.
 */
export function isDebitNormal(accountType: string): boolean {
  const debitNormalTypes = [
    'asset',
    'expense',
    'contra_liability',
    'contra_equity',
    'contra_revenue',
  ];
  return debitNormalTypes.includes(accountType);
}

/**
 * Calculate the total for an invoice given its lines and optional discount.
 *
 * @param lines - Array of line items with quantity, unit_price, discount_percent, and tax_amount
 * @param discountType - 'percentage' or 'fixed' discount on the subtotal
 * @param discountValue - The discount value (percent or fixed amount)
 * @returns Object with subtotal, discountAmount, taxAmount, and total
 */
export function calculateInvoiceTotal(
  lines: {
    quantity: number;
    unit_price: number;
    discount_percent?: number;
    tax_amount?: number;
  }[],
  discountType?: 'percentage' | 'fixed' | null,
  discountValue: number = 0,
): {
  subtotal: number;
  discountAmount: number;
  taxAmount: number;
  total: number;
} {
  let subtotal = 0;
  let taxAmount = 0;

  for (const line of lines) {
    const lineGross = line.quantity * line.unit_price;
    const lineDiscount = lineGross * ((line.discount_percent ?? 0) / 100);
    const lineNet = lineGross - lineDiscount;
    subtotal += lineNet;
    taxAmount += line.tax_amount ?? 0;
  }

  subtotal = roundCurrency(subtotal);
  taxAmount = roundCurrency(taxAmount);

  let discountAmount = 0;
  if (discountType === 'percentage' && discountValue > 0) {
    discountAmount = roundCurrency(subtotal * (discountValue / 100));
  } else if (discountType === 'fixed' && discountValue > 0) {
    discountAmount = roundCurrency(Math.min(discountValue, subtotal));
  }

  const total = roundCurrency(subtotal - discountAmount + taxAmount);

  return { subtotal, discountAmount, taxAmount, total };
}
