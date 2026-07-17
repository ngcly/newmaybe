import { vi } from 'vitest';

export const getEntry = vi.fn().mockResolvedValue(null);
export const getCollection = vi.fn().mockResolvedValue([]);
