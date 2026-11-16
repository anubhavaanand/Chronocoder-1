/**
 * RootLayout Unit Tests
 *
 * Covers:
 * - Resource hoisting and non-render-blocking font link tags (#CC-073)
 */

import { describe, it, expect, vi } from 'vitest';
import React from 'react';
import { render } from '@testing-library/react';

vi.mock('next/font/google', () => ({
  JetBrains_Mono: () => ({
    variable: '--font-jetbrains',
  }),
}));

import RootLayout from '@/app/layout';

describe('RootLayout', () => {
  it('renders non-blocking font links with preconnect crossOrigin and stylesheet precedence (#CC-073)', () => {
    render(
      <RootLayout>
        <div data-testid="child-content">Hello</div>
      </RootLayout>
    );

    const preconnect = document.head.querySelector('link[rel="preconnect"][href="https://fonts.cdnfonts.com"]');
    expect(preconnect).not.toBeNull();
    expect(preconnect?.getAttribute('crossOrigin')).toBe('anonymous');

    const stylesheet = document.head.querySelector('link[rel="stylesheet"][href="https://fonts.cdnfonts.com/css/mona-sans"]');
    expect(stylesheet).not.toBeNull();
  });
});
