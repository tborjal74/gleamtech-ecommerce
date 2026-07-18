import { calculateDiscountMinor } from './checkout-pricing.js';

describe('calculateDiscountMinor', () => {
  it('rounds a percentage discount to the nearest minor unit', () => {
    expect(calculateDiscountMinor(999, 15)).toBe(150);
  });

  it('rejects invalid discount percentages', () => {
    expect(() => calculateDiscountMinor(1000, 0)).toThrow('Discount percent');
    expect(() => calculateDiscountMinor(1000, 91)).toThrow('Discount percent');
  });
});
