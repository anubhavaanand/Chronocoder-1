/**
 * HeaderNav — mobile navigation disclosure (#321).
 *
 * The landing page's nav used to be `hidden md:flex`, so below 768px the
 * header showed only the logo and there was no way to reach Mentors, How it
 * works, or GitHub. This covers the disclosure that replaced it:
 * - desktop row still renders the same three links
 * - a md:hidden button exists and starts collapsed
 * - toggling reveals the same links, announces state, and closes on click
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup, within } from '@testing-library/react';
import { HeaderNav } from '@/components/ui/HeaderNav';

// The desktop row is `hidden md:flex` and the disclosure is `md:hidden`, so
// both exist in the DOM and Tailwind decides which is shown. jsdom does not
// apply Tailwind, so we assert the responsive classes rather than visibility.
const DESKTOP_NAV = 'hidden md:flex';

const LABELS = ['Mentors', 'How it works', 'GitHub'];

describe('HeaderNav (#321)', () => {
  // setup.ts registers a global cleanup, but this suite runs concurrently
  // (sequence.concurrent: true) so tear down explicitly on both sides.
  beforeEach(() => cleanup());
  afterEach(() => cleanup());

  it('renders the desktop nav with all three links', () => {
    render(<HeaderNav />);
    const desktop = screen.getByRole('navigation', { name: 'Primary' });
    expect(desktop).toBeInTheDocument();
    expect(desktop).toHaveClass('hidden', 'md:flex');
    for (const label of LABELS) {
      expect(within(desktop).getByRole('link', { name: label })).toBeInTheDocument();
    }
  });

  it('offers a mobile menu button that starts collapsed', () => {
    render(<HeaderNav />);
    const button = screen.getByRole('button', { name: /open menu/i });
    expect(button).toHaveAttribute('aria-expanded', 'false');
    expect(button).toHaveAttribute('aria-controls', 'mobile-nav');
    expect(screen.queryByRole('navigation', { name: 'Primary mobile' })).toBeNull();
  });

  it('hides the menu button on desktop and the desktop nav on mobile', () => {
    const { container } = render(<HeaderNav />);
    // The two navs must be mutually exclusive by breakpoint, or both show.
    expect(screen.getByRole('navigation', { name: 'Primary' })).toHaveClass('md:flex');
    expect(container.querySelector('.md\\:hidden')).toBeInTheDocument();
  });

  it('reveals the same links when opened, and announces it', () => {
    const { container } = render(<HeaderNav />);
    const open = () => container.querySelector('button') as HTMLElement;
    fireEvent.click(open());

    const mobile = screen.getByRole('navigation', { name: 'Primary mobile' });
    expect(mobile).toBeInTheDocument();
    expect(within(mobile).getAllByRole('link')).toHaveLength(LABELS.length);

    expect(open()).toHaveAttribute('aria-expanded', 'true');
    expect(open()).toHaveAttribute('aria-label', 'Close menu');
  });

  it('collapses again on a second press', () => {
    const { container } = render(<HeaderNav />);
    const toggle = () => container.querySelector('button') as HTMLElement;

    fireEvent.click(toggle());
    expect(screen.getByRole('navigation', { name: 'Primary mobile' })).toBeInTheDocument();

    fireEvent.click(toggle());
    expect(screen.queryByRole('navigation', { name: 'Primary mobile' })).toBeNull();
    expect(toggle()).toHaveAttribute('aria-expanded', 'false');
  });

  it('closes after following an in-page link', () => {
    const { container } = render(<HeaderNav />);
    fireEvent.click(container.querySelector('button') as HTMLElement);

    const mobile = screen.getByRole('navigation', { name: 'Primary mobile' });
    fireEvent.click(within(mobile).getByRole('link', { name: 'Mentors' }));

    expect(screen.queryByRole('navigation', { name: 'Primary mobile' })).toBeNull();
  });

  it('opens the GitHub link in a new tab', () => {
    render(<HeaderNav />);
    const link = screen.getAllByRole('link', { name: 'GitHub' })[0];
    expect(link).toHaveAttribute('target', '_blank');
    expect(link).toHaveAttribute('rel', 'noopener noreferrer');
  });
});
