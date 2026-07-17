import { CatalogService } from './catalog.service.js';

describe('CatalogService homepage content', () => {
  it('returns live reviews and does not create content during a public read', async () => {
    const content = {
      id: 'home',
      eyebrow: 'Eyebrow',
      headline: 'Headline',
      subheadline: 'Subheadline',
      primaryCta: 'Shop',
      secondaryCta: 'Browse',
      heroImage: '/hero.png',
      subHeroImageLeft: '/left.png',
      subHeroImageRight: '/right.png',
      promoLabel: 'Promo',
      promoHeadline: 'Headline',
      promoText: 'Text',
      promiseOneTitle: 'Promise one',
      promiseOneText: 'Promise one text',
      promiseTwoTitle: 'Promise two',
      promiseTwoText: 'Promise two text',
      updatedAt: new Date('2026-07-17T00:00:00.000Z'),
    };
    const reviews = [{
      id: 'review-1',
      rating: 5,
      comment: 'Excellent product.',
      createdAt: new Date('2026-07-16T00:00:00.000Z'),
      user: { firstName: 'Ada', lastName: 'Lovelace' },
      product: { name: 'Live Product' },
    }];
    const prisma = {
      homepageContent: {
        findUnique: jest.fn().mockResolvedValue(content),
        upsert: jest.fn(),
      },
      productReview: {
        findMany: jest.fn().mockResolvedValue(reviews),
        aggregate: jest.fn().mockResolvedValue({ _avg: { rating: 5 }, _count: { _all: 1 } }),
      },
    };
    const service = new CatalogService(prisma as never);

    const result = await service.homepageContent();

    expect(prisma.homepageContent.findUnique).toHaveBeenCalledWith({ where: { id: 'home' } });
    expect(prisma.homepageContent.upsert).not.toHaveBeenCalled();
    expect(prisma.productReview.findMany).toHaveBeenCalledWith(expect.objectContaining({ take: 4 }));
    expect(result).toEqual(expect.objectContaining({
      content: expect.objectContaining({ headline: 'Headline' }),
      reviews: [expect.objectContaining({ customerName: 'Ada L.', productName: 'Live Product' })],
      reviewSummary: { average: 5, count: 1 },
    }));
  });

  it('returns no public content or reviews when the database has none', async () => {
    const prisma = {
      homepageContent: { findUnique: jest.fn().mockResolvedValue(null) },
      productReview: {
        findMany: jest.fn().mockResolvedValue([]),
        aggregate: jest.fn().mockResolvedValue({ _avg: { rating: null }, _count: { _all: 0 } }),
      },
    };
    const service = new CatalogService(prisma as never);

    await expect(service.homepageContent()).resolves.toEqual({
      content: null,
      reviews: [],
      reviewSummary: { average: 0, count: 0 },
    });
  });
});
