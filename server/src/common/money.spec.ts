import { amountToMinor, minorToAmount } from './money.js';

describe('money helpers', () => {
  it('stores money in minor units and converts only at the API boundary', () => {
    expect(amountToMinor(199.5)).toBe(19950);
    expect(minorToAmount(19950)).toBe(199.5);
  });
});
