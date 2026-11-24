import { describe, expect, it } from 'vitest';
import { getDriverPhotos } from '../../src/api/photos';

describe('driver photos', () => {
  it('gives no photos (a silhouette on every card) when the copy is not there', async () => {
    // No site is running in the unit tests, so the manifest request fails.
    expect(await getDriverPhotos()).toEqual({});
  });
});
