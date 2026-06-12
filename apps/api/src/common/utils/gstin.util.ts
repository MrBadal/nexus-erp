/**
 * Indian GSTIN (Goods and Services Tax Identification Number) utilities.
 *
 * GSTIN format: 2-digit state code + 10-char PAN + 1 entity code + 1 'Z' + 1 check digit
 * Example: 27AAPFU0939F1ZV
 *
 * State codes: 01-37 (valid Indian state/UT codes)
 */

const GSTIN_REGEX = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/;

const VALID_STATE_CODES = new Set([
  '01', '02', '03', '04', '05', '06', '07', '08', '09', '10',
  '11', '12', '13', '14', '15', '16', '17', '18', '19', '20',
  '21', '22', '23', '24', '25', '26', '27', '28', '29', '30',
  '31', '32', '33', '34', '35', '36', '37',
  // Special codes
  '97', // Other territory
]);

const STATE_NAME_MAP: Record<string, string> = {
  '01': 'Jammu & Kashmir', '02': 'Himachal Pradesh', '03': 'Punjab',
  '04': 'Chandigarh', '05': 'Uttarakhand', '06': 'Haryana',
  '07': 'Delhi', '08': 'Rajasthan', '09': 'Uttar Pradesh',
  '10': 'Bihar', '11': 'Sikkim', '12': 'Arunachal Pradesh',
  '13': 'Nagaland', '14': 'Manipur', '15': 'Mizoram',
  '16': 'Tripura', '17': 'Meghalaya', '18': 'Assam',
  '19': 'West Bengal', '20': 'Jharkhand', '21': 'Odisha',
  '22': 'Chhattisgarh', '23': 'Madhya Pradesh', '24': 'Gujarat',
  '25': 'Daman & Diu', '26': 'Dadra & Nagar Haveli', '27': 'Maharashtra',
  '28': 'Andhra Pradesh', '29': 'Karnataka', '30': 'Goa',
  '31': 'Lakshadweep', '32': 'Kerala', '33': 'Tamil Nadu',
  '34': 'Puducherry', '35': 'Andaman & Nicobar', '36': 'Telangana',
  '37': 'Andhra Pradesh (New)', '97': 'Other Territory',
};

/**
 * Validate a GSTIN string.
 * Returns { valid: true } or { valid: false, reason: string }
 */
export function validateGstin(gstin: string): { valid: boolean; reason?: string } {
  if (!gstin || gstin.length !== 15) {
    return { valid: false, reason: 'GSTIN must be exactly 15 characters' };
  }

  const upper = gstin.toUpperCase();

  if (!GSTIN_REGEX.test(upper)) {
    return { valid: false, reason: 'GSTIN format is invalid' };
  }

  const stateCode = upper.substring(0, 2);
  if (!VALID_STATE_CODES.has(stateCode)) {
    return { valid: false, reason: `Invalid state code: ${stateCode}` };
  }

  return { valid: true };
}

/**
 * Extract the state code from a GSTIN.
 */
export function getStateCodeFromGstin(gstin: string): string {
  return gstin.substring(0, 2);
}

/**
 * Get the state name for a GSTIN's state code.
 */
export function getStateNameFromGstin(gstin: string): string | undefined {
  return STATE_NAME_MAP[gstin.substring(0, 2)];
}

/**
 * Determine if a transaction between two GSTINs is intra-state (same state → CGST+SGST)
 * or inter-state (different states → IGST).
 */
export function isIntraState(sellerGstin: string, buyerGstin: string): boolean {
  return getStateCodeFromGstin(sellerGstin) === getStateCodeFromGstin(buyerGstin);
}

/**
 * Extract the PAN from a GSTIN (characters 3-12).
 */
export function extractPanFromGstin(gstin: string): string {
  return gstin.substring(2, 12);
}

export { STATE_NAME_MAP, VALID_STATE_CODES };
