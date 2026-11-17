/**
 * Footer link destinations (#320).
 *
 * "Documentation" and "Privacy Policy" both pointed at `#features`, so two
 * different labels led to the same place and there was no policy page at all.
 * These tests pin each label to its own destination.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import React from 'react';
import { render, cleanup } from '@testing-library/react';

vi.mock('framer-motion', () => {
  const React = require('react');
  const createMotion = (Tag: string) => {
    return React.forwardRef((props: any, ref: any) => {
      const {
        children,
        className,
        style,
        initial,
        animate,
        transition,
        whileInView,
        whileHover,
        viewport,
        ...rest
      } = props;
      return React.createElement(Tag, { ...rest, className, style, ref }, children);
    });
  };

  return {
    motion: new Proxy(
      {},
      {
        get: (_target, prop: string) => createMotion(prop),
      }
    ),
    AnimatePresence: ({ children }: any) => <>{children}</>,
  };
});

vi.mock('next/link', () => ({
  default: ({ children, href, ...rest }: any) => (
    <a href={href} {...rest}>
      {children}
    </a>
  ),
}));

vi.mock('@/components/ui/WebGLBackgroundWrapper', () => ({
  default: () => <div data-testid="webgl-background" />,
}));

vi.mock('@/components/ui/ScrollProgressTracker', () => ({
  ScrollProgressTracker: () => <div data-testid="scroll-tracker" />,
}));

vi.mock('@/components/ui/HeroSearch', () => ({
  HeroSearch: () => <div data-testid="hero-search" />,
}));

vi.mock('@/components/mentor/MentorCard', () => ({
  MentorCard: () => <div data-testid="mentor-card" />,
}));

vi.mock('@/components/mentor/MentorJourney', () => ({
  MentorJourney: () => <div data-testid="mentor-journey" />,
}));

vi.mock('@/components/mentor/HeroDistortion', () => ({
  HeroDistortion: () => <div data-testid="hero-distortion" />,
  HeroGLTarget: () => <div data-testid="hero-gl-target" />,
  ScrollIndicator: () => <div data-testid="scroll-indicator" />,
  MentorGLTarget: () => <div data-testid="mentor-gl-target" />,
}));

import Home from '@/app/page';
import PrivacyPage from '@/app/privacy/page';

const README_URL = 'https://github.com/anubhavaanand/Chronocoder-1#readme';

function footerLinks(container: HTMLElement): HTMLAnchorElement[] {
  const footer = container.querySelector('footer');
  expect(footer).not.toBeNull();
  return Array.from(footer!.querySelectorAll('a'));
}

describe('footer links (#320)', () => {
  beforeEach(() => {
    cleanup();
    document.body.innerHTML = '';
    vi.clearAllMocks();
  });

  afterEach(() => {
    cleanup();
    document.body.innerHTML = '';
  });

  it('sends Documentation to the project README', () => {
    const { container } = render(<Home />);
    const link = footerLinks(container).find((a) =>
      a.textContent?.includes('Documentation'),
    );
    expect(link).toBeDefined();
    expect(link?.getAttribute('href')).toBe(README_URL);
  });

  it('sends Privacy Policy to the privacy page', () => {
    const { container } = render(<Home />);
    const link = footerLinks(container).find((a) =>
      a.textContent?.includes('Privacy Policy'),
    );
    expect(link).toBeDefined();
    expect(link?.getAttribute('href')).toBe('/privacy');
  });

  it('does not point two different footer labels at the same anchor', () => {
    const { container } = render(<Home />);
    const hrefs = footerLinks(container).map((a) => a.getAttribute('href'));
    expect(new Set(hrefs).size).toBe(hrefs.length);
  });

  it('renders a privacy page with policy headings', () => {
    const { container } = render(<PrivacyPage />);
    expect(container.querySelector('h1')?.textContent).toBe('Privacy Policy');
    const headings = Array.from(container.querySelectorAll('h2')).map(
      (h) => h.textContent,
    );
    expect(headings.length).toBeGreaterThanOrEqual(3);
  });
});