import '@testing-library/jest-dom/vitest';
import { afterEach, vi } from 'vitest';
import { cleanup } from '@testing-library/react';

// Ensure the DOM is reset between tests.
afterEach(() => {
  cleanup();
});

// jsdom does not implement matchMedia; provide a minimal, controllable mock so
// components that read OS preferences (reduced motion, dark mode) can render.
if (typeof window !== 'undefined' && !window.matchMedia) {
  window.matchMedia = vi.fn().mockImplementation((query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    addListener: vi.fn(),
    removeListener: vi.fn(),
    dispatchEvent: vi.fn(),
  }));
}

// jsdom lacks ResizeObserver, which Radix primitives (checkbox, radio, select)
// use to size their indicators.
if (typeof window !== 'undefined' && !('ResizeObserver' in window)) {
  class MockResizeObserver {
    observe = vi.fn();
    unobserve = vi.fn();
    disconnect = vi.fn();
  }
  // @ts-expect-error assigning test double
  window.ResizeObserver = MockResizeObserver;
}

// jsdom lacks IntersectionObserver, used by scroll-reveal / lazy media.
if (typeof window !== 'undefined' && !('IntersectionObserver' in window)) {
  class MockIntersectionObserver {
    observe = vi.fn();
    unobserve = vi.fn();
    disconnect = vi.fn();
    takeRecords = vi.fn(() => []);
    root = null;
    rootMargin = '';
    thresholds = [];
  }
  // @ts-expect-error assigning test double
  window.IntersectionObserver = MockIntersectionObserver;
}

// jsdom does not implement scrollIntoView, which the public assessment runner uses
// to jump to a pending question. Without a stub, that navigation throws inside a
// requestAnimationFrame callback and surfaces as an unhandled error.
if (typeof Element !== 'undefined' && !Element.prototype.scrollIntoView) {
  Element.prototype.scrollIntoView = vi.fn();
}

// jsdom implements window.scrollTo as a no-op that logs "Not implemented"; the
// runner scrolls to the top when changing page.
if (typeof window !== 'undefined') {
  window.scrollTo = vi.fn() as unknown as typeof window.scrollTo;
}
