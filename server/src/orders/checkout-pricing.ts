export function calculateDiscountMinor(subtotalMinor: number, percentOff: number): number {
  if (!Number.isInteger(subtotalMinor) || subtotalMinor < 0) throw new Error('Subtotal must be a non-negative integer.');
  if (!Number.isInteger(percentOff) || percentOff < 1 || percentOff > 90) throw new Error('Discount percent must be between 1 and 90.');
  return Math.round((subtotalMinor * percentOff) / 100);
}
