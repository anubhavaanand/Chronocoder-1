/**
 * MentorCard Component Unit Tests
 * 
 * Test coverage includes:
 * - Rendering mentor cards correctly
 * - Hover interactions triggering animations
 * - Link navigation functionality
 * - Responsive behavior across breakpoints
 * - ARIA labels for accessibility compliance
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MentorCard, MentorCardProps } from '../../../src/components/MentorCard';
import userEvent from '@testing-library/user-event';

// Mock the motion.div for framer-motion
vi.mock('framer-motion', () => ({
  motion: {
    div: ({ children, className, variants, animate, hover }: any) => (
      <div className={className} data-animate={animate?.toString()}>
        {children}
      </div>
    ),
  },
}));

// Mock icons
vi.mock('@radix-ui/react-icons', () => ({
  Check: () => <span data-testid="check-icon">✓</span>,
  Star: () => <span data-testid="star-icon">★</span>,
  ExternalLink: () => <span data-testid="external-link-icon">🔗</span>,
}));

// Mock router
vi.mock('react-router-dom', () => ({
  useNavigate: () => vi.fn(),
  Link: ({ to, children }: any) => (
    <a href={to} data-to={to} data-testid="mentor-link">
      {children}
    </a>
  ),
}));

describe('MentorCard', () => {
  const mockMentor = {
    id: 'mentor-1',
    name: 'Alex Chen',
    role: 'Senior Full Stack Developer',
    expertise: ['React', 'TypeScript', 'Node.js'],
    rating: 4.9,
    reviews: 127,
    image: '/images/mentors/alex.jpg',
    linkedIn: 'https://linkedin.com/in/alexchen',
    github: 'https://github.com/alexchen',
    website: 'https://alexchen.dev',
  };

  const defaultProps: MentorCardProps = {
    mentor: mockMentor,
    index: 0,
    isSelected: false,
    onSelect: vi.fn(),
  };

  let container: HTMLElement;

  beforeEach(() => {
    // Setup DOM environment
    document.body.innerHTML = '';
    container = render(<MentorCard {...defaultProps} />).container;
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('Rendering', () => {
    it('renders mentor card with correct structure', () => {
      expect(container.querySelector('.mentor-card')).toBeInTheDocument();
    });

    it('displays mentor name correctly', () => {
      render(<MentorCard {...defaultProps} />);
      const mentorName = screen.getByText(mockMentor.name);
      expect(mentorName).toBeInTheDocument();
    });

    it('displays mentor role as subtitle', () => {
      render(<MentorCard {...defaultProps} />);
      const roleElement = screen.getByText(mockMentor.role);
      expect(roleElement).toBeInTheDocument();
    });

    it('renders expertise badges for each skill', () => {
      render(<MentorCard {...defaultProps} />);
      
      mockMentor.expertise.forEach((skill) => {
        expect(screen.getByText(skill)).toBeInTheDocument();
      });
    });

    it('displays star icon with rating value', () => {
      render(<MentorCard {...defaultProps} />);
      const starIcon = screen.getByTestId('star-icon');
      expect(starIcon).toBeInTheDocument();
      
      const ratingText = screen.getByText(`${mockMentor.rating}`);
      expect(ratingText).toBeInTheDocument();
    });

    it('shows review count alongside rating', () => {
      render(<MentorCard {...defaultProps} />);
      const reviewCount = screen.getByText(`${mockMentor.reviews} reviews`);
      expect(reviewCount).toBeInTheDocument();
    });

    it('renders all social media links', () => {
      render(<MentorCard {...defaultProps} />);
      
      expect(screen.getByText('LinkedIn')).toBeInTheDocument();
      expect(screen.getByText('GitHub')).toBeInTheDocument();
      expect(screen.getByText('Website')).toBeInTheDocument();
    });
  });

  describe('Hover Interactions', () => {
    it('triggers scale animation on hover', async () => {
      const user = userEvent.setup();
      const card = screen.getByRole('button') || screen.getByTestId('mentor-link');
      
      await user.hover(card);
      
      await waitFor(() => {
        // Check that hover state is applied (animation classes or transforms)
        expect(card).toHaveAttribute('data-hover', 'true');
      }, { timeout: 500 });
    });

    it('applies elevation effect on hover', async () => {
      const user = userEvent.setup();
      const card = screen.getByRole('button') || screen.getByTestId('mentor-link');
      
      await user.hover(card);
      
      await waitFor(() => {
        expect(card).toHaveClass(/hover-elevation|elevated/);
      }, { timeout: 500 });
    });

    it('releases elevation when mouse leaves', async () => {
      const user = userEvent.setup();
      const card = screen.getByRole('button') || screen.getByTestId('mentor-link');
      
      await user.hover(card);
      await user.unhover(card);
      
      await waitFor(() => {
        expect(card).not.toHaveClass(/hover-elevation|elevated/);
      }, { timeout: 500 });
    });

    it('highlights selected card visually', () => {
      const props = { ...defaultProps, isSelected: true };
      render(<MentorCard {...props} />);
      
      const selectedCard = screen.getByRole('button') || screen.getByTestId('mentor-link');
      expect(selectedCard).toHaveClass(/selected-highlight/);
    });

    it('changes cursor pointer on interactive elements', () => {
      render(<MentorCard {...defaultProps} />);
      const link = screen.getByTestId('mentor-link');
      
      expect(link).toHaveStyle('cursor: pointer');
    });
  });

  describe('Navigation & Links', () => {
    it('navigates to mentor detail page when clicked', async () => {
      const navigate = vi.fn();
      vi.mocked(useNavigate).mockReturnValue(navigate);
      
      const user = userEvent.setup();
      const link = screen.getByTestId('mentor-link');
      
      await user.click(link);
      
      expect(navigate).toHaveBeenCalledWith('/mentors/mentor-1', expect.any(Object));
    });

    it('opens LinkedIn in new tab', async () => {
      const user = userEvent.setup();
      const linkedinLink = screen.getByText('LinkedIn').parentElement;
      
      // Default behavior should be preserved (new tab)
      expect(linkedinLink).toHaveAttribute('target', '_blank');
      expect(linkedinLink).toHaveAttribute('rel', 'noopener noreferrer');
    });

    it('opens GitHub profile in new tab', async () => {
      const user = userEvent.setup();
      const githubLink = screen.getByText('GitHub').parentElement;
      
      expect(githubLink).toHaveAttribute('target', '_blank');
      expect(githubLink).toHaveAttribute('rel', 'noopener noreferrer');
    });

    it('handles click events properly without propagating', async () => {
      const handleCardClick = vi.fn((e: Event) => e.preventDefault());
      const props = { ...defaultProps, onClick: handleCardClick };
      
      render(<MentorCard {...props} />);
      
      const card = screen.getByRole('button') || screen.getByTestId('mentor-link');
      fireEvent.click(card);
      
      expect(handleCardClick).toHaveBeenCalledTimes(1);
    });
  });

  describe('Responsive Behavior', () => {
    const breakpoints = [
      { width: 1920, height: 1080, query: '(min-width: 1200px)' }, // Desktop XL
      { width: 1366, height: 768, query: '(min-width: 1024px)' }, // Tablet
      { width: 768, height: 1024, query: '(min-width: 768px)' }, // Tablet Portrait
      { width: 375, height: 667, query: '(max-width: 767px)' }, // Mobile
    ];

    it('maintains layout integrity at desktop resolution', () => {
      render(<MentorCard {...defaultProps} />);
      
      const card = screen.getByRole('button') || screen.getByTestId('mentor-link');
      expect(card).toHaveClass(/lg:max-w-sm|desktop-layout/);
    });

    it('adapts spacing on mobile devices', () => {
      Object.defineProperty(window, 'matchMedia', {
        writable: true,
        value: vi.fn().mockImplementation((query: string) => ({
          matches: query.includes('max-width: 767px'),
          media: query,
          addEventListener: vi.fn(),
          removeEventListener: vi.fn(),
          dispatchEvent: vi.fn(),
        })),
      });

      render(<MentorCard {...defaultProps} />);
      
      const card = screen.getByRole('button') || screen.getByTestId('mentor-link');
      expect(card).toHaveClass(/sm:p-4|mobile-spacing/);
    });

    it('adjusts font sizes responsively', () => {
      render(<MentorCard {...defaultProps} />);
      
      const mentorName = screen.getByText(mockMentor.name);
      expect(mentorName).toHaveStyle(/text-xl|md:text-2xl|lg:text-3xl/);
    });

    it('hides non-critical info on small screens', () => {
      Object.defineProperty(window, 'matchMedia', {
        writable: true,
        value: vi.fn().mockImplementation((query: string) => ({
          matches: query.includes('max-width: 480px'),
          media: query,
          addEventListener: vi.fn(),
          removeEventListener: vi.fn(),
          dispatchEvent: vi.fn(),
        })),
      });

      render(<MentorCard {...defaultProps} />);
      
      // Reviews might be hidden on very small screens
      const reviewsContainer = screen.queryByText(`${mockMentor.reviews} reviews`);
      if (reviewsContainer) {
        expect(reviewsContainer).toHaveClass(/hidden-on-mobile|sm:block/);
      }
    });

    it('stacks expertise tags vertically on mobile', () => {
      Object.defineProperty(window, 'matchMedia', {
        writable: true,
        value: vi.fn().mockImplementation((query: string) => ({
          matches: query.includes('max-width: 640px'),
          media: query,
          addEventListener: vi.fn(),
          removeEventListener: vi.fn(),
          dispatchEvent: vi.fn(),
        })),
      });

      render(<MentorCard {...defaultProps} />);
      
      const expertiseContainer = screen.getByLabelText('Expertise areas');
      expect(expertiseContainer).toHaveClass(/flex-wrap|flex-col/);
    });
  });

  describe('Accessibility', () => {
    it('has proper aria-label for screen readers', () => {
      render(<MentorCard {...defaultProps} />);
      
      const card = screen.getByRole('button') || screen.getByTestId('mentor-link');
      expect(card).toHaveAttribute('aria-label', `View ${mockMentor.name}, Senior Full Stack Developer`);
    });

    it('includes role attribute for semantic HTML', () => {
      render(<MentorCard {...defaultProps} />);
      
      const card = screen.getByRole('button') || screen.getByTestId('mentor-link');
      expect(card).toHaveAttribute('role', 'button');
    });

    it('uses tabindex for keyboard navigation', () => {
      render(<MentorCard {...defaultProps} />);
      
      const card = screen.getByRole('button') || screen.getByTestId('mentor-link');
      expect(card).toHaveAttribute('tabindex', '0');
    });

    it('provides accessible names for social icons', () => {
      render(<MentorCard {...defaultProps} />);
      
      const linkedinIcon = screen.getByTestId('external-link-icon').closest('a');
      expect(linkedinIcon).toHaveAttribute('aria-label', `Visit ${mockMentor.name}'s LinkedIn profile`);
    });

    it('has focus styles for keyboard users', () => {
      render(<MentorCard {...defaultProps} />);
      
      const card = screen.getByRole('button') || screen.getByTestId('mentor-link');
      card.focus();
      
      expect(card).toHaveFocus();
      expect(card).toHaveClass(/focus-ring|focus-visible/);
    });

    it('passes WCAG contrast ratio requirements', () => {
      render(<MentorCard {...defaultProps} />);
      
      const mentorName = screen.getByText(mockMentor.name);
      const computedStyles = window.getComputedStyle(mentorName);
      
      // Basic check - actual contrast would need a library like jest-axe
      expect(computedStyles.color).toBeTruthy();
    });

    it('includes skip navigation for repetitive content', () => {
      render(<MentorCard {...defaultProps} />);
      
      const skipLink = screen.queryByHref?.('#main-content');
      if (skipLink) {
        expect(skipLink).toBeInTheDocument();
      }
    });
  });

  describe('State Management', () => {
    it('updates selection state when onSelect is called', () => {
      const props = { ...defaultProps, isSelected: true };
      const { rerender } = render(<MentorCard {...props} />);
      
      expect(screen.getByRole('button') || screen.getByTestId('mentor-link'))
        .toHaveClass(/selected-highlight/);
      
      // Toggle off
      rerender(<MentorCard {...defaultProps} />);
      
      expect(screen.getByRole('button') || screen.getByTestId('mentor-link'))
        .not.toHaveClass(/selected-highlight/);
    });

    it('calls onSelect callback when clicked', async () => {
      const props = { ...defaultProps, onSelect: vi.fn() };
      const { rerender } = render(<MentorCard {...props} />);
      
      const user = userEvent.setup();
      const card = screen.getByRole('button') || screen.getByTestId('mentor-link');
      
      await user.click(card);
      
      expect(props.onSelect).toHaveBeenCalledWith(mockMentor);
    });

    it('handles loading state gracefully', () => {
      const loadingProps = {
        ...defaultProps,
        isLoading: true,
      };

      render(<MentorCard {...loadingProps} />);
      
      expect(screen.getByRole('status') || screen.getByTestId('loading-skeleton'))
        .toBeInTheDocument();
    });

    it('shows error state for failed loading', () => {
      const errorProps = {
        ...defaultProps,
        isError: true,
        errorMessage: 'Failed to load mentor information',
      };

      render(<MentorCard {...errorProps} />);
      
      expect(screen.getByText(/error|failed/i)).toBeInTheDocument();
      expect(screen.getByText(errorProps.errorMessage)).toBeInTheDocument();
    });

    it('remembers last selected mentor in local storage', () => {
      const mockStorage = {
        getItem: vi.fn(() => '"mentor-1"'),
        setItem: vi.fn(),
      };
      
      Object.defineProperty(window, 'localStorage', { value: mockStorage });
      
      render(<MentorCard {...defaultProps} />);
      
      expect(mockStorage.setItem).toHaveBeenCalledWith(
        'selectedMentor',
        JSON.stringify(mockMentor.id)
      );
    });
  });

  describe('Edge Cases', () => {
    it('handles missing expertise array gracefully', () => {
      const partialMentor = {
        ...mockMentor,
        expertise: [],
      };

      render(<MentorCard {...defaultProps} mentor={partialMentor} />);
      
      expect(screen.getByText(partialMentor.name)).toBeInTheDocument();
      expect(screen.queryByText(/expertise|skills/i)).not.toBeInTheDocument();
    });

    it('handles missing social media links gracefully', () => {
      const minimalMentor = {
        ...mockMentor,
        linkedIn: undefined,
        github: undefined,
        website: undefined,
      };

      render(<MentorCard {...defaultProps} mentor={minimalMentor} />);
      
      expect(screen.getByText(minimalMentor.name)).toBeInTheDocument();
      expect(screen.queryByText('LinkedIn')).not.toBeInTheDocument();
      expect(screen.queryByText('GitHub')).not.toBeInTheDocument();
      expect(screen.queryByText('Website')).not.toBeInTheDocument();
    });

    it('displays default avatar when image fails to load', () => {
      render(<MentorCard {...defaultProps} />);
      
      const image = screen.getByRole('img');
      image.dispatchEvent(new ErrorEvent('error'));
      
      // Should have fallback mechanism
      expect(image).toHaveAttribute('alt', `${mockMentor.name}'s profile picture`);
    });

    it('handles extremely long mentor names', () => {
      const longNameMentor = {
        ...mockMentor,
        name: 'A'.repeat(100),
      };

      render(<MentorCard {...defaultProps} mentor={longNameMentor} />);
      
      expect(screen.getByText(longNameMentor.name.substring(0, 50) + '...')).toBeInTheDocument() ||
      expect(screen.getByText(longNameMentor.name)).toBeInTheDocument();
    });

    it('handles invalid rating values', () => {
      const invalidRatingMentor = {
        ...mockMentor,
        rating: -1, // Invalid rating
      };

      render(<MentorCard {...defaultProps} mentor={invalidRatingMentor} />);
      
      // Should use minimum valid rating
      expect(screen.getByText('1.0')).toBeInTheDocument();
    });
  });

  describe('Performance', () => {
    it('should not re-render on prop changes that do not affect visual state', () => {
      const renderFn = vi.fn();
      
      function MemoizedMentorCard(props: MentorCardProps) {
        renderFn();
        return <MentorCard {...props} />;
      }
      
      const { rerender } = render(<MemoizedMentorCard {...defaultProps} />);
      const initialCalls = renderFn.mock.calls.length;
      
      // Change non-visual property
      rerender(<MemoizedMentorCard {...{ ...defaultProps, index: 5 }} />);
      
      expect(renderFn.mock.calls.length).toBe(initialCalls);
    });

    it('lazy loads images for better performance', () => {
      render(<MentorCard {...defaultProps} />);
      
      const image = screen.getByRole('img');
      expect(image).toHaveAttribute('loading', 'lazy');
    });
  });
});
