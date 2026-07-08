import { createCsrfToken, createSessionToken, hashSessionToken } from './session.util.js';

describe('session utilities', () => {
  it('creates high-entropy session tokens and hashes them without storing raw values', () => {
    const token = createSessionToken();
    const hash = hashSessionToken(token);

    expect(token).toHaveLength(43);
    expect(hash).toHaveLength(64);
    expect(hash).not.toBe(token);
    expect(hashSessionToken(token)).toBe(hash);
  });

  it('creates csrf tokens that are distinct from session tokens', () => {
    expect(createCsrfToken()).not.toBe(createSessionToken());
  });
});
