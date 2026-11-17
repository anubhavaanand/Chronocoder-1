/**
 * ScrollProgressTracker tests.
 *
 * The tracker renders nothing and drives the height of #trackFill from the
 * window scroll position. These cover the mount-time value, the scroll
 * update, and the #95 regression where the fill element did not exist yet
 * when the tracker mounted.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { render, cleanup, fireEvent } from '@testing-library/react';
import { ScrollProgressTracker } from '@/components/ui/ScrollProgressTracker';

interface Metrics {
  scrollHeight: number;
  innerHeight: number;
  scrollY: number;
}

function setMetrics({ scrollHeight, innerHeight, scrollY }: Metrics): void {
  Object.defineProperty(document.documentElement, 'scrollHeight', {
    configurable: true,
    value: scrollHeight,
  });
  Object.defineProperty(window, 'innerHeight', { configurable: true, value: innerHeight });
  Object.defineProperty(window, 'scrollY', { configurable: true, value: scrollY });
}

function renderWithFill() {
  const result = render(
    <>
      <div id="trackFill" />
      <ScrollProgressTracker />
    </>,
  );
  const trackFill = result.container.querySelector<HTMLElement>('#trackFill');
  if (!trackFill) throw new Error('trackFill was not rendered');
  return { ...result, trackFill };
}

// jsdom normalizes "50.0%" to "50%", so compare the numeric value.
function heightPercent(element: HTMLElement): number {
  return Number.parseFloat(element.style.height);
}

// These tests share the global document/window, so run them one at a time
// instead of inheriting the suite-wide concurrent default.
describe.sequential('ScrollProgressTracker', () => {
  beforeEach(() => {
    cleanup();
    document.body.innerHTML = '';
  });

  afterEach(() => {
    cleanup();
    document.body.innerHTML = '';
  });

  it('sets the fill height to 0% at the top of the page', () => {
    setMetrics({ scrollHeight: 2000, innerHeight: 1000, scrollY: 0 });
    const { trackFill } = renderWithFill();

    expect(heightPercent(trackFill)).toBe(0);
  });

  it('updates the fill height on scroll', () => {
    setMetrics({ scrollHeight: 2000, innerHeight: 1000, scrollY: 0 });
    const { trackFill } = renderWithFill();

    // Half way down a 1000px scrollable range.
    setMetrics({ scrollHeight: 2000, innerHeight: 1000, scrollY: 500 });
    fireEvent.scroll(window);

    expect(heightPercent(trackFill)).toBe(50);
  });

  it('reaches 100% at the bottom of the page', () => {
    setMetrics({ scrollHeight: 2000, innerHeight: 1000, scrollY: 0 });
    const { trackFill } = renderWithFill();

    setMetrics({ scrollHeight: 2000, innerHeight: 1000, scrollY: 1000 });
    fireEvent.scroll(window);

    expect(heightPercent(trackFill)).toBe(100);
  });

  it('finds the fill element when it mounts after the tracker (#95)', () => {
    setMetrics({ scrollHeight: 2000, innerHeight: 1000, scrollY: 500 });

    // Rendered first, with no #trackFill in the document yet.
    const { container } = render(<ScrollProgressTracker />);

    // The element appears afterwards, then the user scrolls.
    const lateFill = document.createElement('div');
    lateFill.id = 'trackFill';
    container.appendChild(lateFill);
    fireEvent.scroll(window);

    // A single mount-time lookup would have cached null and left this empty.
    expect(heightPercent(lateFill)).toBe(50);
  });

  it('does not throw when the fill element is missing entirely', () => {
    setMetrics({ scrollHeight: 2000, innerHeight: 1000, scrollY: 500 });

    expect(() => {
      render(<ScrollProgressTracker />);
      fireEvent.scroll(window);
    }).not.toThrow();
  });

  it('does not produce a negative height when the page does not scroll', () => {
    setMetrics({ scrollHeight: 800, innerHeight: 1000, scrollY: 0 });
    const { trackFill } = renderWithFill();

    fireEvent.scroll(window);

    // max <= 0 must not yield a negative percentage.
    expect(trackFill.style.height).not.toContain('-');
    expect(heightPercent(trackFill)).toBe(0);
  });
});