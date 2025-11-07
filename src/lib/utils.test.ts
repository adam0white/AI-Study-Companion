/**
 * Unit tests for utility functions
 */

import { describe, it, expect } from 'vitest';
import { cn } from './utils';

describe('cn utility', () => {
  it('merges class names correctly', () => {
    const result = cn('text-red-500', 'bg-blue-500');
    expect(result).toContain('text-red-500');
    expect(result).toContain('bg-blue-500');
  });

  it('handles conditional classes', () => {
    const result = cn('base-class', false && 'conditional-class');
    expect(result).toContain('base-class');
    expect(result).not.toContain('conditional-class');
  });

  it('merges Tailwind conflicting classes correctly', () => {
    const result = cn('px-2', 'px-4');
    // tailwind-merge should resolve to px-4
    expect(result).toBe('px-4');
  });
});

