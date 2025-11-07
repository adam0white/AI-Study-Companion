/**
 * Vitest Test Setup
 * Global test configuration and mocks
 */

import { afterEach } from 'vitest';
import { cleanup } from '@testing-library/react';

// Cleanup after each test
afterEach(() => {
  cleanup();
});

// Add custom matchers if needed using expect
// import { expect } from 'vitest';
// expect.extend({});

