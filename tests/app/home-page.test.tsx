/**
 * Home Page (Landing) Unit Tests
 *
 * Covers:
 * - Valid footer links (Documentation, GitHub, Privacy Policy) without dead href="#" (#CC-069)
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import React from 'react';
import { render, cleanup } from '@testing-library/react';

// Mock framer-motion components
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

// Mock components to isolate Home page test
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

describe('Home Page', () => {
  beforeEach(() => {
    cleanup();
    document.body.innerHTML = '';
    vi.clearAllMocks();
  });

  afterEach(() => {
    cleanup();
    document.body.innerHTML = '';
  });

  it('renders valid footer links without dead href="#" (#CC-069)', () => {
    const { container } = render(<Home />);
    const footer = container.querySelector('footer');
    expect(footer).not.toBeNull();

    const links = Array.from(footer!.querySelectorAll('a'));
    expect(links.length).toBeGreaterThanOrEqual(3);

    for (const link of links) {
      const href = link.getAttribute('href');
      expect(href).not.toBe('#');
      expect(href).not.toBe('');
      expect(href).toBeTruthy();
    }

    const githubLink = links.find((l) => l.textContent?.includes('GitHub'));
    expect(githubLink).toBeDefined();
    expect(githubLink?.getAttribute('href')).toBe('https://github.com/anubhavaanand/Chronocoder-1');
    expect(githubLink?.getAttribute('target')).toBe('_blank');
    expect(githubLink?.getAttribute('rel')).toContain('noopener');
  });

  it('uses standard anchor elements for hero CTAs to prevent unnecessary router transitions (#CC-070)', () => {
    const { container } = render(<Home />);
    const ctaPrimary = container.querySelector('[data-od-id="cta-primary"]');
    expect(ctaPrimary).not.toBeNull();
    expect(ctaPrimary?.tagName.toLowerCase()).toBe('a');
    expect(ctaPrimary?.getAttribute('href')).toBe('#mentors');

    const ctaSecondary = Array.from(container.querySelectorAll('a')).find(
      (a) => a.textContent?.includes('How It Works')
    );
    expect(ctaSecondary).toBeDefined();
    expect(ctaSecondary?.getAttribute('href')).toBe('#features');
  });

  it('contains clean single-line section dividers without duplicate adjacent flex spans (#CC-071)', () => {
    const { container } = render(<Home />);
    const dividers = Array.from(container.querySelectorAll('.flex.items-center.gap-4'));
    
    // Check the "Works" and "Features" section headers
    const worksDivider = dividers.find((d) => d.textContent?.trim().startsWith('Works'));
    expect(worksDivider).toBeDefined();
    const worksSpans = worksDivider!.querySelectorAll('span');
    // Expected: 1 label span + 1 line span = 2 spans (previously 3 due to duplicate span)
    expect(worksSpans.length).toBe(2);

    const featuresDivider = dividers.find((d) => d.textContent?.trim().startsWith('Features'));
    expect(featuresDivider).toBeDefined();
    const featuresSpans = featuresDivider!.querySelectorAll('span');
    // Expected: 1 label span + 1 line span = 2 spans (previously 3 due to duplicate span)
    expect(featuresSpans.length).toBe(2);
  });

  it('standardizes all GitHub repository URLs to the correct canonical repository (#CC-072)', () => {
    const { container } = render(<Home />);
    const githubLinks = Array.from(container.querySelectorAll('a')).filter(
      (a) => a.textContent?.trim() === 'GitHub'
    );
    expect(githubLinks.length).toBeGreaterThanOrEqual(2); // Header & Footer

    for (const link of githubLinks) {
      expect(link.getAttribute('href')).toBe('https://github.com/anubhavaanand/Chronocoder-1');
      expect(link.getAttribute('target')).toBe('_blank');
      expect(link.getAttribute('rel')).toContain('noopener');
    }
  });
});
