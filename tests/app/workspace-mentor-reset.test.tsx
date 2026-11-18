/**
 * WorkspacePage — reset feedback when navigating between mentors (#206).
 *
 * The App Router reuses the same client page component across
 * /workspace/[mentorA] -> /workspace/[mentorB]. Without an explicit reset,
 * the previous mentor's streamed feedback stays on screen under the new
 * mentor's header.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import React from 'react';
import { render, screen, cleanup, act } from '@testing-library/react';

let currentMentorId = 'ada_lovelace';
let currentQuery: string | null = null;

// Capture the callbacks the page passes into the hook so the test can drive
// a streamed review, then simulate a route change.
let capturedOnFeedbackChunk:
  | ((chunk: {
      reading?: string;
      sections?: Array<{ id: string; label: string; content: string; icon: string }>;
      challenge?: string;
      closing?: string;
    }) => void)
  | null = null;

let capturedOnError: ((err: string) => void) | null = null;

const requestFeedbackMock = vi.fn();

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn() }),
  useParams: () => ({ mentorId: currentMentorId }),
  useSearchParams: () => new URLSearchParams(currentQuery ?? ''),
  notFound: () => {
    throw new Error('NEXT_NOT_FOUND');
  },
}));

vi.mock('../../src/hooks/useMentorWebSocket', () => ({
  useMentorWebSocket: (options: {
    onFeedbackChunk?: (chunk: unknown) => void;
    onError?: (err: string) => void;
  }) => {
    capturedOnFeedbackChunk = options.onFeedbackChunk ?? null;
    capturedOnError = options.onError ?? null;
    return {
      isAnalyzing: false,
      requestFeedback: requestFeedbackMock,
      getSessionId: () => 'test-session',
    };
  },
}));

vi.mock('../../src/components/ui/SearchBarSection', () => ({
  SearchBarSection: () => <div data-testid="search-section" />,
}));

vi.mock('../../src/components/code/CodeEditor', () => ({
  CodeEditor: () => <div data-testid="code-editor" />,
  getComplexity: () => null,
}));

vi.mock('react-markdown', () => ({
  default: ({ children }: { children?: React.ReactNode }) => (
    <div data-testid="markdown-content">{children}</div>
  ),
}));

vi.mock('remark-gfm', () => ({ default: {} }));

import WorkspacePage from '../../src/app/workspace/[mentorId]/page';

describe('WorkspacePage mentor change reset (#206)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    currentMentorId = 'ada_lovelace';
    currentQuery = null;
    capturedOnFeedbackChunk = null;
    capturedOnError = null;
  });

  afterEach(() => {
    cleanup();
  });

  it('clears streamed feedback when the mentorId route param changes', () => {
    const { rerender } = render(<WorkspacePage />);

    // Stream some feedback for Ada.
    act(() => {
      capturedOnFeedbackChunk?.({
        reading: 'Ada says hello',
        sections: [
          {
            id: 'sec-1',
            label: 'Correctness',
            content: 'Looks good',
            icon: '✅',
          },
        ],
        challenge: 'Try a loop',
        closing: 'Keep going',
      });
    });

    expect(screen.getByText('Ada says hello')).toBeInTheDocument();

    // Navigate to a different mentor.
    currentMentorId = 'alan_turing';
    rerender(<WorkspacePage />);

    // New mentor header is shown...
    expect(
      screen.getByRole('heading', { level: 1, name: 'Alan Turing' })
    ).toBeInTheDocument();

    // ...and the previous mentor's feedback is gone.
    expect(screen.queryByText('Ada says hello')).not.toBeInTheDocument();
    expect(screen.queryByText('Try a loop')).not.toBeInTheDocument();
    expect(screen.queryByText('Keep going')).not.toBeInTheDocument();
  });

  it('clears stale partial feedback when an error arrives mid-stream (#119)', () => {
    render(<WorkspacePage />);

    // Stream some partial feedback.
    act(() => {
      capturedOnFeedbackChunk?.({
        reading: 'Partial Ada reading',
        sections: [
          {
            id: 'sec-1',
            label: 'Correctness',
            content: 'Half a review',
            icon: '✅',
          },
        ],
        challenge: 'Partial challenge',
      });
    });
    expect(screen.getByText('Partial Ada reading')).toBeInTheDocument();

    // An error arrives before feedback_complete.
    act(() => {
      capturedOnError?.('Connection lost');
    });

    // The error is shown...
    expect(screen.getByText(/Connection lost/)).toBeInTheDocument();
    // ...and the stale partial feedback is gone.
    expect(screen.queryByText('Partial Ada reading')).not.toBeInTheDocument();
    expect(screen.queryByText('Partial challenge')).not.toBeInTheDocument();
  });

  // #319: the in-workspace search bar pushes /workspace/<sameMentor>?query=...
  // The mentorId does not change, so the #206 reset above never fires and the
  // new question banner sits on top of the previous mentor's feedback.
  it('clears feedback when the same mentor is re-searched with a new query (#319)', () => {
    const { rerender } = render(<WorkspacePage />);

    act(() => {
      capturedOnFeedbackChunk?.({
        reading: 'Stale feedback from the first question',
        sections: [
          {
            id: 'sec-1',
            label: 'Correctness',
            content: 'Old review',
            icon: '✅',
          },
        ],
        challenge: 'Old challenge',
        closing: 'Old closing',
      });
    });

    expect(
      screen.getByText('Stale feedback from the first question')
    ).toBeInTheDocument();

    // Search again from inside the workspace: same mentor, new ?query=.
    currentQuery = 'query=a%20second%20question';
    rerender(<WorkspacePage />);

    // The new question is shown...
    expect(screen.getByText('a second question')).toBeInTheDocument();

    // ...and the previous answer is gone rather than lingering under it.
    expect(
      screen.queryByText('Stale feedback from the first question')
    ).not.toBeInTheDocument();
    expect(screen.queryByText('Old review')).not.toBeInTheDocument();
    expect(screen.queryByText('Old challenge')).not.toBeInTheDocument();
    expect(screen.queryByText('Old closing')).not.toBeInTheDocument();
  });
});