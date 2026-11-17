/**
 * RootLayout Unit Tests
 *
 * Covers:
 * - Fonts are self-hosted via next/font/local; there is no render-blocking
 *   third-party font stylesheet (#201, #309).
 * - The font CSS variable is applied to <html>.
 */

import { describe, it, expect, vi } from 'vitest';
import React from 'react';
import { render } from '@testing-library/react';

vi.mock('next/font/local', () => ({
  default: () => ({
    variable: '--font-jetbrains',
  }),
}));

import RootLayout from '@/app/layout';

describe('RootLayout', () => {
  it('does not inject a render-blocking third-party font stylesheet (#201)', () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    render(
      <RootLayout>
        <div data-testid="child-content">Hello</div>
      </RootLayout>
    );
    consoleSpy.mockRestore();

    // No external cdnfonts stylesheet / preconnect.
    expect(
      document.head.querySelector('link[rel="stylesheet"][href*="cdnfonts"]')
    ).toBeNull();
    expect(
      document.head.querySelector('link[rel="preconnect"][href*="cdnfonts"]')
    ).toBeNull();
  });

  it('applies the self-hosted font variable to <html> (#201)', () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    render(
      <RootLayout>
        <div data-testid="child-content">Hello</div>
      </RootLayout>
    );
    consoleSpy.mockRestore();

    // next/font/local normally injects a generated class name; the mock returns
    // the variable string. Either way the font variable must be applied to <html>.
    const html = document.documentElement;
    expect(html.className).toContain('--font-jetbrains');
  });

  it('still renders children (#201)', () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    render(
      <RootLayout>
        <div data-testid="child-content">Hello</div>
      </RootLayout>
    );
    consoleSpy.mockRestore();
    expect(document.querySelector('[data-testid="child-content"]')).not.toBeNull();
  });
});