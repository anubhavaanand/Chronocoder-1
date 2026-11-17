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

function addTrackFill(): HTMLElement {
  const el = document.createElement('div');
  el.id = 'trackFill';
  document.body.appendChild(el);
  return el;
}

describe('ScrollProgressTracker', () => {
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
    const trackFill = addTrackFill();

    render(<ScrollProgressTracker />);

    expect(trackFill.style.height).toBe('0.0%');
  });

  it('updates the fill height on scroll', () => {
    setMetrics({ scrollHeight: 2000, innerHeight: 1000, scrollY: 0 });
    const trackFill = addTrackFill();

    render(<ScrollProgressTracker />);

    // Half way down a 1000px scrollable range.
    setMetrics({ scrollHeight: 2000, innerHeight: 1000, scrollY: 500 });
    fireEvent.scroll(window);

    expect(trackFill.style.height).toBe('50.0%');
  });

  it('reaches 100% at the bottom of the page', () => {
    setMetrics({ scrollHeight: 2000, innerHeight: 1000, scrollY: 0 });
    const trackFill = addTrackFill();

    render(<ScrollProgressTracker />);

    setMetrics({ scrollHeight: 2000, innerHeight: 1000, scrollY: 1000 });
    fireEvent.scroll(window);

    expect(trackFill.style.height).toBe('100.0%');
  });

  it('finds the fill element when it mounts after the tracker (#95)', () => {
    setMetrics({ scrollHeight: 2000, innerHeight: 1000, scrollY: 500 });

    // Rendered first, with no #trackFill in the document yet.
    render(<ScrollProgressTracker />);

    // The element appears afterwards, then the user scrolls.
    const lateFill = addTrackFill();
    fireEvent.scroll(window);

    // A single mount-time lookup would have cached null and left this empty.
    expect(lateFill.style.height).toBe('50.0%');
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
    const trackFill = addTrackFill();

    render(<ScrollProgressTracker />);
    fireEvent.scroll(window);

    // max <= 0 must not yield a negative percentage.
    const height = trackFill.style.height;
    expect(height).not.toContain('-');
  });
});