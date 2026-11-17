/**
 * FeedbackRenderer Component Unit Tests
 *
 * Tests src/components/feedback/FeedbackRenderer.tsx — the streaming AI
 * feedback panel used by the workspace ask tab:
 * - Initial empty state (mentor icon + guidance copy)
 * - Loading state while analysis is in flight
 * - Error state with optional Try Again handler
 * - Streaming feedback: reading, markdown sections, challenge, closing
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import React from 'react';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';

// Stub react-markdown so section content renders as plain text in jsdom.
vi.mock('react-markdown', () => ({
  default: ({ children }: any) => (
    <div data-testid="markdown-content">{children}</div>
  ),
  ReactMarkdown: ({ children }: any) => <div>{children}</div>,
}));

vi.mock('remark-gfm', () => ({ default: {} }));

import { FeedbackRenderer, FeedbackCodeComponent } from '../../src/components/feedback/FeedbackRenderer';

describe.sequential('FeedbackRenderer', () => {
  const baseProps = {
    mentorName: 'Ada Lovelace',
    mentorIcon: '🔮',
    reading: '',
    sections: [],
    challenge: '',
    closing: '',
    isAnalyzing: false,
    error: null,
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    cleanup();
  });

  describe('Initial state', () => {
    it('shows the empty state with mentor icon and guidance', () => {
      render(<FeedbackRenderer {...baseProps} />);
      expect(screen.getByText('🔮')).toBeInTheDocument();
      expect(
        screen.getByRole('heading', { name: 'Ready for Your Code' })
      ).toBeInTheDocument();
      expect(
        screen.getByText(/receive personalized guidance from Ada/)
      ).toBeInTheDocument();
    });

    it('uses the first name of the mentor in the guidance copy', () => {
      render(<FeedbackRenderer {...baseProps} mentorName="Alan Turing" mentorIcon="" />);
      expect(
        screen.getByText(/receive personalized guidance from Alan/)
      ).toBeInTheDocument();
    });
  });

  describe('Loading state', () => {
    it('shows the spinner and progress copy while analyzing', () => {
      render(<FeedbackRenderer {...baseProps} isAnalyzing={true} />);
      expect(
        screen.getByText('Generating personalized feedback...')
      ).toBeInTheDocument();
    });

    it('hides the spinner once feedback content arrives', () => {
      render(
        <FeedbackRenderer
          {...baseProps}
          isAnalyzing={true}
          reading="Let me take a look..."
        />
      );
      expect(
        screen.queryByText('Generating personalized feedback...')
      ).not.toBeInTheDocument();
    });

    it('keeps the spinner while streaming sections in', () => {
      render(
        <FeedbackRenderer
          {...baseProps}
          isAnalyzing={true}
          sections={[{ label: 'Reading', content: 'hi' }]}
        />
      );
      expect(
        screen.queryByText('Generating personalized feedback...')
      ).not.toBeInTheDocument();
    });
  });

  describe('Error state', () => {
    it('renders the error message', () => {
      render(<FeedbackRenderer {...baseProps} error="Connection lost" />);
      expect(screen.getByText('Error:')).toBeInTheDocument();
      expect(screen.getByText('Connection lost')).toBeInTheDocument();
    });

    it('invokes onClearError when Try Again is clicked', () => {
      const onClearError = vi.fn();
      render(
        <FeedbackRenderer
          {...baseProps}
          error="Connection lost"
          onClearError={onClearError}
        />
      );
      fireEvent.click(screen.getByRole('button', { name: 'Try Again' }));
      expect(onClearError).toHaveBeenCalledTimes(1);
    });

    it('hides the Try Again button when no handler is provided', () => {
      render(<FeedbackRenderer {...baseProps} error="Connection lost" />);
      expect(
        screen.queryByRole('button', { name: 'Try Again' })
      ).not.toBeInTheDocument();
    });
  });

  describe('Streaming feedback', () => {
    it('renders the reading paragraph', () => {
      render(
        <FeedbackRenderer
          {...baseProps}
          reading="Your use of recursion is elegant."
        />
      );
      expect(
        screen.getByText('Your use of recursion is elegant.')
      ).toBeInTheDocument();
    });

    it('renders each feedback section with icon, label, and markdown content', () => {
      render(
        <FeedbackRenderer
          {...baseProps}
          sections={[
            { id: 's1', label: 'Structure', icon: '🏛️', content: '# Structure\nGood bones.' },
            { id: 's2', label: 'Complexity', icon: '📈', content: 'A bit dense.' },
          ]}
        />
      );
      expect(
        screen.getByRole('heading', { level: 3, name: 'Structure' })
      ).toBeInTheDocument();
      expect(screen.getByText('🏛️')).toBeInTheDocument();
      expect(
        screen.getByRole('heading', { level: 3, name: 'Complexity' })
      ).toBeInTheDocument();
      const markdown = screen.getAllByTestId('markdown-content');
      expect(markdown).toHaveLength(2);
      expect(markdown[0]).toHaveTextContent('# Structure Good bones.');
    });

    it('renders the challenge block', () => {
      render(
        <FeedbackRenderer
          {...baseProps}
          challenge="Try memoizing fib()."
        />
      );
      expect(screen.getByText('Your Challenge')).toBeInTheDocument();
      expect(screen.getByText('Try memoizing fib().')).toBeInTheDocument();
    });

    it('renders the closing remark alongside other feedback', () => {
      render(
        <FeedbackRenderer
          {...baseProps}
          reading="Reading line"
          closing="Keep pushing."
        />
      );
      expect(screen.getByText('Keep pushing.')).toBeInTheDocument();
    });

    it('renders reading + sections + challenge + closing together', () => {
      render(
        <FeedbackRenderer
          {...baseProps}
          reading="Reading line"
          sections={[{ label: 'Beauty', content: 'Lovely.' }]}
          challenge="Challenge line"
          closing="Closing line"
        />
      );
      expect(screen.getByText('Reading line')).toBeInTheDocument();
      expect(screen.getByText('Beauty')).toBeInTheDocument();
      expect(screen.getByText('Challenge line')).toBeInTheDocument();
      expect(screen.getByText('Closing line')).toBeInTheDocument();
    });

    it('suppresses the empty state once content exists', () => {
      render(
        <FeedbackRenderer {...baseProps} reading="Some feedback" />
      );
      expect(
        screen.queryByRole('heading', { name: 'Ready for Your Code' })
      ).not.toBeInTheDocument();
    });

    it('falls back to the index for section keys without ids', () => {
      render(
        <FeedbackRenderer
          {...baseProps}
          sections={[
            { label: 'One', content: 'First' },
            { label: 'Two', content: 'Second' },
          ]}
        />
      );
      expect(screen.getByText('One')).toBeInTheDocument();
      expect(screen.getByText('Two')).toBeInTheDocument();
    });
  });

  describe('FeedbackCodeComponent (react-markdown code renderer)', () => {
    it('renders single-line inline code as a <code> element', () => {
      const { container } = render(
        <FeedbackCodeComponent>print(&quot;hello&quot;)</FeedbackCodeComponent>
      );
      const code = container.querySelector('code');
      expect(code).toBeInTheDocument();
      expect(container.querySelector('pre')).toBeNull();
      expect(code).toHaveClass('text-accent-cyan');
      expect(code).toHaveTextContent('print("hello")');
    });

    it('renders fenced code blocks with language as <pre><code class="python">', () => {
      const { container } = render(
        <FeedbackCodeComponent className="language-python">
          def solve(): pass
        </FeedbackCodeComponent>
      );
      const pre = container.querySelector('pre');
      const code = container.querySelector('code');
      expect(pre).toBeInTheDocument();
      expect(code).toBeInTheDocument();
      expect(code).toHaveClass('python');
      expect(code).toHaveTextContent('def solve(): pass');
    });

    it('renders multi-line code blocks without language class as <pre><code>', () => {
      const multiLine = 'line 1\nline 2\nline 3';
      const { container } = render(
        <FeedbackCodeComponent>{multiLine}</FeedbackCodeComponent>
      );
      const pre = container.querySelector('pre');
      const code = container.querySelector('code');
      expect(pre).toBeInTheDocument();
      expect(code).toBeInTheDocument();
      expect(code?.textContent).toBe(multiLine);
    });
  });
});
