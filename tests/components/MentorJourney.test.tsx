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
import { MentorJourney } from '@/components/mentor/MentorJourney';
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
});
