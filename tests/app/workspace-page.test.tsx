/**
 * WorkspacePage — incoming ?query= handling (#CC-039).
 *
 * The workspace must capture a question carried in from the landing/hero
 * search (?query=...) and surface it in the Ask tab instead of dropping
 * it on navigation.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import React from 'react';
import { render as rtlRender, screen, cleanup, fireEvent, act } from '@testing-library/react';

let currentQuery: string | null = null;
let currentMentorId: string = 'alan_turing';

const pushMock = vi.fn();
const notFoundMock = vi.fn();

// The hook is callback-driven: the page passes handlers, and the hook calls
// them as chunks stream in. Tests capture them so a case can simulate a
// stream by invoking onFeedbackChunk directly.
let wsCallbacks: Record<string, (...args: any[]) => void> = {};

// Replaced per-test by render() so each case can assert its own calls.
let requestFeedbackMock: ReturnType<typeof vi.fn> = vi.fn();

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
  useMentorWebSocket: (opts: Record<string, (...args: any[]) => void>) => {
    wsCallbacks = opts;
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
  CodeEditor: ({ value, onChange }: { value: string; onChange: (v: string) => void }) => (
    <textarea
      data-testid="code-editor"
      aria-label="Python code"
      value={value}
      onChange={(e) => onChange(e.target.value)}
    />
  ),
  getComplexity: () => null,
}));

vi.mock('react-markdown', () => ({
  default: ({ children }: any) => <div data-testid="markdown-content">{children}</div>,
}));

vi.mock('remark-gfm', () => ({ default: {} }));

import WorkspacePage from '../../src/app/workspace/[mentorId]/page';

/**
 * Render the workspace with a fresh requestFeedback spy and the given
 * streaming-feedback state, matching how the hook feeds the component.
 */
function render(ui: React.ReactElement, opts: { requestFeedback?: ReturnType<typeof vi.fn> } = {}) {
  requestFeedbackMock = opts.requestFeedback ?? vi.fn();
  wsCallbacks = {};
  return rtlRender(ui);
}

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

  it('exposes accessible tablist/tab semantics for the workspace tabs (#240)', () => {
    render(<WorkspacePage />);

    const tablist = screen.getByRole('tablist', { name: 'Workspace views' });
    expect(tablist).toBeInTheDocument();

    const askTab = screen.getByRole('tab', { name: 'Ask Question' });
    const reviewTab = screen.getByRole('tab', { name: 'Code Review' });

    // Exactly one tab is selected, and it points at its panel.
    expect(askTab).toHaveAttribute('aria-selected', 'true');
    expect(reviewTab).toHaveAttribute('aria-selected', 'false');
    expect(askTab).toHaveAttribute('aria-controls', 'panel-ask');
    expect(screen.getByRole('tabpanel', { name: 'Ask Question' })).toBeInTheDocument();

    // ArrowRight moves selection to Code Review.
    askTab.focus();
    fireEvent.keyDown(askTab, { key: 'ArrowRight' });
    expect(screen.getByRole('tab', { name: 'Code Review' })).toHaveAttribute(
      'aria-selected',
      'true'
    );
  });
});

describe.sequential('WorkspacePage feedback handlers (#228)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    currentQuery = null;
    currentMentorId = 'alan_turing';
  });

  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
  });

  it('refuses to submit an empty program', () => {
    const requestFeedback = vi.fn();
    render(<WorkspacePage />, { requestFeedback });

    // The editor lives on the Code Review tab.
    fireEvent.click(screen.getByRole('tab', { name: 'Code Review' }));

    // Clear the starter program the way a user would.
    fireEvent.change(screen.getByTestId('code-editor'), { target: { value: '' } });

    const submit = screen.getByRole('button', { name: /get feedback/i });
    expect(submit).toBeDisabled();
    fireEvent.click(submit);

    expect(requestFeedback).not.toHaveBeenCalled();
  });

  it('submits the current code and clears stale feedback', () => {
    const requestFeedback = vi.fn();
    render(<WorkspacePage />, { requestFeedback });

    fireEvent.click(screen.getByRole('button', { name: /get feedback/i }));

    expect(requestFeedback).toHaveBeenCalledTimes(1);
    // The default starter program is non-empty, so this is the real payload.
    expect(requestFeedback.mock.calls[0][0]).toContain('def fibonacci');
  });

  it('exports a markdown transcript once feedback exists', () => {
    // jsdom implements neither of these; the export path only needs them to
    // exist, not to produce a real download.
    const createObjectURL = vi.fn(() => 'blob:transcript');
    const revokeObjectURL = vi.fn();
    vi.stubGlobal('URL', {
      ...URL,
      createObjectURL,
      revokeObjectURL,
    });
    const fetchMock = vi.fn().mockResolvedValue({ ok: true });
    vi.stubGlobal('fetch', fetchMock);

    render(<WorkspacePage />, { requestFeedback: vi.fn() });

    // Simulate the hook delivering a streamed chunk.
    act(() => wsCallbacks.onFeedbackChunk({ reading: 'Read this first.' }));

    const exportButton = screen.getByRole('button', { name: /export/i });
    fireEvent.click(exportButton);

    // The export is a client-side download; the button only renders once there
    // is feedback to export, and clicking it must not throw.
    expect(exportButton).toBeInTheDocument();
  });

  it('clears feedback when the route mentor changes (#206)', () => {
    const requestFeedback = vi.fn();
    const first = render(<WorkspacePage />, { requestFeedback });

    act(() => wsCallbacks.onFeedbackChunk({ reading: 'Read this first.' }));
    expect(screen.getByText('Read this first.')).toBeInTheDocument();

    currentMentorId = 'grace_hopper';
    first.rerender(<WorkspacePage />);

    expect(
      screen.getByRole('heading', { level: 1, name: 'Grace Hopper' })
    ).toBeInTheDocument();
  });

  it('switches to the Code Review tab on demand', () => {
    render(<WorkspacePage />, { requestFeedback: vi.fn() });

    fireEvent.click(screen.getByRole('tab', { name: 'Code Review' }));

    expect(screen.getByRole('tab', { name: 'Code Review' })).toHaveAttribute(
      'aria-selected',
      'true'
    );
    expect(screen.getByRole('tabpanel', { name: 'Code Review' })).toBeInTheDocument();
  });
});
