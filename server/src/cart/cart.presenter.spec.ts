import { presentCart } from './cart.presenter.js';

describe('presentCart', () => {
  it('calculates line totals and subtotal on the backend response', () => {
    const cart = {
      id: 'cart-1',
      userId: 'user-1',
      createdAt: new Date(),
      updatedAt: new Date(),
      items: [
        {
          id: 'item-1',
          cartId: 'cart-1',
          productId: 'p1',
          quantity: 2,
          size: '500ml',
          createdAt: new Date(),
          updatedAt: new Date(),
          product: {
            id: 'p1',
            sku: 'SKU-1',
            name: 'Cleaner',
            description: 'Cleaner',
            shortDescription: 'Cleaner',
            priceMinor: 899,
            originalPriceMinor: null,
            active: true,
            category: 'Kitchen',
            brand: 'SparkleClean',
            scent: 'Citrus',
            isEco: false,
            image: 'image',
            badge: null,
            rating: 4.7,
            reviewCount: 1,
            sizes: ['500ml'],
            tags: ['kitchen'],
            createdAt: new Date(),
            updatedAt: new Date(),
            inventory: {
              productId: 'p1',
              stockQuantity: 5,
              updatedAt: new Date(),
            },
          },
        },
      ],
    };

    expect(presentCart(cart)).toMatchObject({
      id: 'cart-1',
      subtotal: 17.98,
      items: [
        {
          productId: 'p1',
          unitPrice: 8.99,
          quantity: 2,
          lineTotal: 17.98,
          availableQuantity: 5,
        },
      ],
    });
  });
});
