import { canonicalHomepageImagePath, canonicalizeHomepageImages } from './homepage-assets.js';

describe('homepage asset canonicalization', () => {
  it.each([
    ['/assets/hero-image-1.png', '/assets/hero-image-1.webp'],
    ['assets/sub-hero-image-2.png', '/assets/sub-hero-image-2.webp'],
    ['https://shop.example/assets/sub-hero-image-3-oldHash.png', '/assets/sub-hero-image-3.webp'],
    ['/assets/hero-image-1-currentHash.webp', '/assets/hero-image-1.webp'],
  ])('maps bundled legacy path %s to %s', (input, expected) => {
    expect(canonicalHomepageImagePath(input)).toBe(expected);
  });

  it('preserves uploaded and external images', () => {
    expect(canonicalHomepageImagePath('/uploads/products/hero-image-1-custom.png')).toBe('/uploads/products/hero-image-1-custom.png');
    expect(canonicalHomepageImagePath('https://cdn.example/hero.png')).toBe('https://cdn.example/hero.png');
  });

  it('canonicalizes every bundled homepage image field', () => {
    expect(canonicalizeHomepageImages({
      heroImage: '/assets/hero-image-1.png',
      subHeroImageLeft: '/assets/sub-hero-image-2-old.png',
      subHeroImageRight: '/assets/sub-hero-image-3.webp',
      headline: 'Keep this field',
    })).toEqual({
      heroImage: '/assets/hero-image-1.webp',
      subHeroImageLeft: '/assets/sub-hero-image-2.webp',
      subHeroImageRight: '/assets/sub-hero-image-3.webp',
      headline: 'Keep this field',
    });
  });
});
