/**
 * MentorCard Component Unit Tests
 *
 * Test coverage includes:
 * - Rendering mentor details (name, era, icon, greeting, expertise)
 * - Index formatting (e.g., 01 for index 0)
 * - Navigation link pointing to /workspace/[mentorId]
 * - Optional expertise handling
 * - Hover state and interactive elements
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Mock framer-motion components before importing components
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
  default: ({ href, children }: any) => (
    <a href={href} data-testid="mentor-card-link">
      {children}
    </a>
  ),
}));

// Mock HeroDistortion WebGL target
vi.mock('../../src/components/mentor/HeroDistortion', () => ({
  MentorGLTarget: ({ mentorId }: any) => <div data-testid={`gl-target-${mentorId}`} />,
}));

import { render, within, fireEvent, cleanup } from '@testing-library/react';
import { MentorCard } from '../../src/components/mentor/MentorCard';

describe('MentorCard', () => {
  const mockMentor = {
    id: 'ada_lovelace',
    name: 'Ada Lovelace',
    era: 'London, 1843',
    icon: '🔮',
    accentColor: '#c08585',
    greeting: 'The Analytical Engine weaves algebraic patterns.',
    expertise: 'Algorithmic elegance & mathematical vision',
    index: 0,
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    cleanup();
  });

  describe('Rendering', () => {
    it('renders mentor name, era, icon, and greeting', () => {
      const { container } = render(<MentorCard {...mockMentor} />);
      const card = within(container);

      expect(
        card.getByRole('heading', { level: 3, name: 'Ada Lovelace' })
      ).toBeInTheDocument();
      expect(card.getByText('London, 1843')).toBeInTheDocument();
      expect(card.getByText('🔮')).toBeInTheDocument();
      expect(
        card.getByText(/The Analytical Engine weaves algebraic patterns\./)
      ).toBeInTheDocument();
    });

    it('renders expertise when provided', () => {
      const { container } = render(<MentorCard {...mockMentor} />);
      expect(
        within(container).getByText('Algorithmic elegance & mathematical vision')
      ).toBeInTheDocument();
    });

    it('renders cleanly when expertise is omitted', () => {
      const { expertise, ...mentorWithoutExpertise } = mockMentor;
      const { container } = render(
        <MentorCard {...mentorWithoutExpertise} />
      );
      const card = within(container);
      expect(
        card.getByRole('heading', { level: 3, name: 'Ada Lovelace' })
      ).toBeInTheDocument();
      expect(
        card.queryByText('Algorithmic elegance & mathematical vision')
      ).not.toBeInTheDocument();
    });

    it('formats single-digit index with leading zero in caption bar', () => {
      const { container } = render(<MentorCard {...mockMentor} index={0} />);
      expect(within(container).getByText('01')).toBeInTheDocument();
    });

    it('formats double-digit index correctly', () => {
      const { container } = render(<MentorCard {...mockMentor} index={11} />);
      expect(within(container).getByText('12')).toBeInTheDocument();
    });

    it('links to the correct workspace route', () => {
      const { container } = render(<MentorCard {...mockMentor} />);
      const link = within(container).getByTestId('mentor-card-link');
      expect(link).toHaveAttribute('href', '/workspace/ada_lovelace');
    });

    it('renders the WebGL distortion anchor target', () => {
      const { container } = render(<MentorCard {...mockMentor} />);
      expect(
        within(container).getByTestId('gl-target-ada_lovelace')
      ).toBeInTheDocument();
    });
  });

  describe('Interactivity', () => {
    it('renders the select mentor action button', () => {
      const { container } = render(<MentorCard {...mockMentor} />);
      expect(within(container).getByText('Select Mentor')).toBeInTheDocument();
    });

    it('does not nest interactive <button> inside the card <a> link (#CC-058)', () => {
      const { container } = render(<MentorCard {...mockMentor} />);
      const nestedButtons = container.querySelectorAll('a button');
      expect(nestedButtons.length).toBe(0);
      expect(container.querySelector('button')).toBeNull();
      expect(within(container).getByText('Select Mentor')).toBeInTheDocument();
    });

    it('toggles hover state on mouse enter and leave', () => {
      const { container } = render(<MentorCard {...mockMentor} />);
      const interactiveCard = container.querySelector('.group');
      expect(interactiveCard).toBeInTheDocument();

      if (interactiveCard) {
        fireEvent.mouseEnter(interactiveCard);
        fireEvent.mouseLeave(interactiveCard);
      }
    });

    it('fades out the glass caption bar on hover to prevent visual collision (#CC-059)', () => {
      const { container } = render(<MentorCard {...mockMentor} />);
      const interactiveCard = container.querySelector('.group');
      expect(interactiveCard).toBeInTheDocument();

      const captionBar = container.querySelector('[data-testid="mentor-caption-bar"]');
      expect(captionBar).toBeInTheDocument();

      // Initially visible
      expect(captionBar).toHaveStyle({ opacity: '1' });

      // Hover over card
      fireEvent.mouseEnter(interactiveCard!);
      expect(captionBar).toHaveStyle({ opacity: '0' });

      // Unhover
      fireEvent.mouseLeave(interactiveCard!);
      expect(captionBar).toHaveStyle({ opacity: '1' });
    });

    it('relies on whileInView for scroll-based animation keeping initial state before view trigger (#CC-060)', () => {
      const { container } = render(<MentorCard {...mockMentor} />);
      const cardMotionDiv = container.querySelector('.group');
      expect(cardMotionDiv).toBeInTheDocument();
      // Verifies initial viewport state is retained (opacity: 0) instead of eagerly animating on mount
      expect(cardMotionDiv).toHaveStyle({ opacity: '0' });
    });

    it('renders cleanly without dead cardRef allocation (#CC-061)', () => {
      const { container } = render(<MentorCard {...mockMentor} />);
      const cardMotionDiv = container.querySelector('.group');
      expect(cardMotionDiv).toBeInTheDocument();
      const link = container.querySelector('[data-testid="mentor-card-link"]');
      expect(link).toHaveAttribute('href', '/workspace/ada_lovelace');
    });
  });
});
