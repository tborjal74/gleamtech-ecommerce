import { canonicalProductImagePath } from './product-assets.js';

describe('product asset canonicalization', () => {
  it.each([
    ['/assets/gleamglow.png', '/assets/gleamglow.webp'],
    ['assets/gleamfresh.png', '/assets/gleamfresh.webp'],
    ['https://shop.example/assets/gleamglow-oldHash.png', '/assets/gleamglow.webp'],
    ['/assets/puregleam-kalamansi-currentHash.webp', '/assets/puregleam-kalamansi.webp'],
  ])('maps bundled product path %s to %s', (input, expected) => {
    expect(canonicalProductImagePath(input)).toBe(expected);
  });

  it('preserves managed uploads and unrelated external images', () => {
    expect(canonicalProductImagePath('/api/products/product-1/image')).toBe('/api/products/product-1/image');
    expect(canonicalProductImagePath('/uploads/products/gleamglow-custom.png')).toBe('/uploads/products/gleamglow-custom.png');
    expect(canonicalProductImagePath('https://cdn.example/product.jpg')).toBe('https://cdn.example/product.jpg');
  });
});
