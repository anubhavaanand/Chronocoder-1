/**
 * MentorJourney Component Unit Tests
 *
 * Covers:
 * - Rendering mentor sections with portraits, known-for strips, and quotes
 * - Resilience against missing mentor bios (#CC-064)
 * - Safe fallbacks for focusAreas, paragraphs, and quoteContext
 */

import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MentorJourney, getContrastingTextColor } from '@/components/mentor/MentorJourney';
import { MENTORS } from '@/data/mentors';

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
    AnimatePresence: ({ children }: any) => children,
  };
});

// Mock Next.js Link
vi.mock('next/link', () => ({
  default: ({ href, children, className, style }: any) => (
    <a href={href} className={className} style={style} data-testid="journey-link">
      {children}
    </a>
  ),
}));

describe('MentorJourney', () => {
  it('renders all mentors from MENTORS array', () => {
    render(<MentorJourney />);
    for (const mentor of MENTORS) {
      expect(screen.getAllByText(mentor.name).length).toBeGreaterThan(0);
      expect(screen.getByAltText(`Portrait of ${mentor.name}`)).toBeInTheDocument();
    }
  });

  it('renders gracefully without crashing when mentor bio is missing (#CC-064)', () => {
    // Render with an artificially unmapped mentor
    const mockMentorWithoutBio = {
      id: 'unknown_future_mentor',
      name: 'Future Pioneer',
      era: 'Neo-Tokyo, 2099',
      icon: '🚀',
      accentColor: '#38bdf8',
      avatarUrl: '/mentors/future.jpg',
      greeting: 'Welcome to the distributed quantum computing era.',
      signatureClosing: 'Until the next epoch.',
      tone: 'futuristic',
      expertise: 'Quantum Circuit Synthesis',
      focusAreas: ['quantum_logic', 'superposition'],
      feedbackSections: [],
    };

    // Temporarily append the unmapped mentor
    MENTORS.push(mockMentorWithoutBio);

    try {
      expect(() => render(<MentorJourney />)).not.toThrow();
      expect(screen.getByText('Future Pioneer')).toBeInTheDocument();
      expect(screen.getAllByText('Quantum Circuit Synthesis').length).toBe(2);
      expect(
        screen.getAllByText(/Welcome to the distributed quantum computing era/).length
      ).toBe(2);
    } finally {
      // Clean up
      MENTORS.pop();
    }
  });

  describe('getContrastingTextColor (#CC-065)', () => {
    it('returns white text for dark background colors', () => {
      // Very dark backgrounds
      expect(getContrastingTextColor('#000000')).toBe('#ffffff');
      expect(getContrastingTextColor('#1a1a2e')).toBe('#ffffff');
      expect(getContrastingTextColor('#2b1055')).toBe('#ffffff');
    });

    it('returns dark text for light or vibrant background colors', () => {
      // Light backgrounds
      expect(getContrastingTextColor('#ffffff')).toBe('oklch(10% 0.01 265)');
      expect(getContrastingTextColor('#d9b64e')).toBe('oklch(10% 0.01 265)');
      expect(getContrastingTextColor('#e0a458')).toBe('oklch(10% 0.01 265)');
    });

    it('handles empty or invalid inputs safely', () => {
      expect(getContrastingTextColor('')).toBe('#ffffff');
      expect(getContrastingTextColor(null as unknown as string)).toBe('#ffffff');
    });

    it('applies high-contrast colors to mentor review CTA buttons', () => {
      const { container } = render(<MentorJourney />);
      const ctaLinks = container.querySelectorAll('a[data-testid="journey-link"]');
      expect(ctaLinks.length).toBe(MENTORS.length);

      ctaLinks.forEach((link) => {
        // Style must not be empty or unassigned
        expect((link as HTMLElement).style.color).toBeTruthy();
      });
    });
  });
});
