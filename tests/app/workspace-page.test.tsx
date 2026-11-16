/**
 * WorkspacePage — incoming ?query= handling (#CC-039).
 *
 * The workspace must capture a question carried in from the landing/hero
 * search (?query=...) and surface it in the Ask tab instead of dropping
 * it on navigation.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import React from 'react';
import { render, screen, cleanup } from '@testing-library/react';

let currentQuery: string | null = null;
let currentMentorId: string = 'alan_turing';

const pushMock = vi.fn();
const notFoundMock = vi.fn();

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: pushMock }),
  useParams: () => ({ mentorId: currentMentorId }),
  useSearchParams: () => new URLSearchParams(currentQuery ?? ''),
  notFound: () => {
    notFoundMock();
    throw new Error('NEXT_NOT_FOUND');
  },
}));

vi.mock('../../src/hooks/useMentorWebSocket', () => ({
  useMentorWebSocket: () => ({
    isAnalyzing: false,
    requestFeedback: vi.fn(),
    getSessionId: () => 'test-session',
  }),
}));

vi.mock('../../src/components/ui/SearchBarSection', () => ({
  SearchBarSection: () => <div data-testid="search-section" />,
}));

vi.mock('../../src/components/code/CodeEditor', () => ({
  CodeEditor: () => <div data-testid="code-editor" />,
  getComplexity: () => null,
}));

vi.mock('react-markdown', () => ({
  default: ({ children }: any) => <div data-testid="markdown-content">{children}</div>,
}));

vi.mock('remark-gfm', () => ({ default: {} }));

import WorkspacePage from '../../src/app/workspace/[mentorId]/page';

describe.sequential('WorkspacePage ?query= capture', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    currentQuery = null;
    currentMentorId = 'alan_turing';
  });

  afterEach(() => {
    cleanup();
  });

  it('shows the incoming question in the Ask tab', () => {
    currentQuery = 'query=' + encodeURIComponent('How do I optimize this recursive function?');
    render(<WorkspacePage />);

    expect(screen.getByText('Your question')).toBeInTheDocument();
    expect(
      screen.getByText('How do I optimize this recursive function?')
    ).toBeInTheDocument();
  });

  it('does not render the question card without a query param', () => {
    render(<WorkspacePage />);

    expect(screen.queryByText('Your question')).not.toBeInTheDocument();
  });

  it('ignores a blank query param', () => {
    currentQuery = 'query=%20%20';
    render(<WorkspacePage />);

    expect(screen.queryByText('Your question')).not.toBeInTheDocument();
  });

  it('keeps the mentor header from the route param', () => {
    render(<WorkspacePage />);

    expect(
      screen.getByRole('heading', { level: 1, name: 'Alan Turing' })
    ).toBeInTheDocument();
  });

  it('renders the mentor portrait avatar using next/image with explicit dimensions (#CC-043)', () => {
    render(<WorkspacePage />);

    const avatar = screen.getByAltText('Portrait of Alan Turing');
    expect(avatar).toBeInTheDocument();
    expect(avatar).toHaveAttribute('width', '44');
    expect(avatar).toHaveAttribute('height', '44');
  });

  it('triggers notFound() when mentorId does not exist (#CC-050)', () => {
    currentMentorId = 'non_existent_mentor';
    expect(() => render(<WorkspacePage />)).toThrow('NEXT_NOT_FOUND');
    expect(notFoundMock).toHaveBeenCalled();
  });
});
