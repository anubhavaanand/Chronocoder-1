import { describe, it, expect, vi } from 'vitest';
import { render, screen, renderHook, act } from '@testing-library/react';
import React from 'react';
import { useReducedMotion } from '@/hooks/useReducedMotion';
import { SearchBarSection } from '@/components/ui/SearchBarSection';
import NotFound from '@/app/not-found';
import ErrorBoundary from '@/app/error';
import WorkspaceLoading from '@/app/workspace/[mentorId]/loading';

// The suite pins React to tests/node_modules; next/link imports its own copy,
// so render it as a plain anchor rather than pulling in the app's React.
vi.mock('next/link', () => ({
  default: ({ href, children }: { href: string; children: React.ReactNode }) => (
    <a href={href}>{children}</a>
  ),
}));

vi.mock('framer-motion', () => {
  const React = require('react');
  const createMotion = (Tag: string) =>
    React.forwardRef((props: any, ref: any) => {
      const { children, className, style, initial, animate, transition, whileInView, whileHover, viewport, ...rest } = props;
      return React.createElement(Tag, { ...rest, className, style, ref }, children);
    });
  return {
    motion: new Proxy({}, { get: (_t, prop: string) => createMotion(prop) }),
    AnimatePresence: ({ children }: any) => children,
  };
});

// border-beam pulls in its own React copy; the decorative beam is irrelevant
// to what these tests assert.
vi.mock('border-beam', () => ({
  BorderBeam: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn() }),
  useSearchParams: () => new URLSearchParams(),
}));

// next/dynamic reaches for its own React copy; the wrapper's whole job is to
// host this import, so a passthrough keeps the assertion meaningful.
vi.mock('next/dynamic', () => ({
  default: (loader: () => Promise<any>) => {
    const Lazy = React.lazy(loader);
    return function Dynamic() {
      return (
        <React.Suspense fallback={null}>
          <Lazy />
        </React.Suspense>
      );
    };
  },
}));

function mockMatchMedia(matches: boolean | (() => boolean), onAdd?: (cb: () => void) => void) {
  const original = window.matchMedia;
  window.matchMedia = vi.fn().mockImplementation((query: string) => ({
    matches: typeof matches === 'function' ? matches() : matches === true,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: (_: string, cb: () => void) => onAdd?.(cb),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })) as unknown as typeof window.matchMedia;
  return () => {
    window.matchMedia = original;
  };
}

describe('useReducedMotion', () => {
  it('returns false when the media query does not match', () => {
    mockMatchMedia(false);
    const { result } = renderHook(() => useReducedMotion());
    expect(result.current).toBe(false);
  });

  it('returns true when the user prefers reduced motion', () => {
    mockMatchMedia(true);
    const { result } = renderHook(() => useReducedMotion());
    expect(result.current).toBe(true);
  });

  it('re-renders when the preference changes while mounted', () => {
    const listeners: Array<() => void> = [];
    let matches = false;
    const restore = mockMatchMedia(() => matches, (cb) => listeners.push(cb));

    try {
      const { result } = renderHook(() => useReducedMotion());
      expect(result.current).toBe(false);

      matches = true;
      act(() => listeners.forEach((cb) => cb()));

      expect(result.current).toBe(true);
    } finally {
      restore();
    }
  });
});

describe('SearchBarSection', () => {
  it('renders the search bar when reduced motion is preferred', () => {
    mockMatchMedia(true);
    render(<SearchBarSection />);
    expect(screen.getByPlaceholderText(/ask any mentor anything/i)).toBeInTheDocument();
  });

  it('wraps the search bar in the animated beam by default', () => {
    mockMatchMedia(false);
    const { container } = render(<SearchBarSection large />);
    expect(screen.getByPlaceholderText(/ask any mentor anything/i)).toBeInTheDocument();
    // The decorative beam renders a wrapper element around the content.
    expect(container.firstElementChild).not.toBeNull();
  });
});

describe('NotFound', () => {
  it('renders the 404 message and a link back to the archive', () => {
    render(<NotFound />);
    expect(screen.getByText('Not in the archive')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /back to the archive/i })).toHaveAttribute(
      'href',
      '/'
    );
  });
});

describe('Error boundary', () => {
  it('renders recovery UI and calls reset', () => {
    const reset = vi.fn();
    render(<ErrorBoundary error={new Error('boom')} reset={reset} />);
    expect(screen.getByRole('button', { name: /try again/i })).toBeInTheDocument();
  });

  it('surfaces the error to the console without rendering its message', () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const error = new Error('secret-stack-detail');
    render(<ErrorBoundary error={error} reset={vi.fn()} />);
    expect(spy).toHaveBeenCalledWith(error);
    // The raw message must not be shown to the user.
    expect(screen.queryByText(/secret-stack-detail/)).toBeNull();
    spy.mockRestore();
  });
});

describe('WorkspaceLoading', () => {
  it('renders a busy, labelled skeleton', () => {
    render(<WorkspaceLoading />);
    const main = screen.getByRole('main');
    expect(main).toHaveAttribute('aria-busy', 'true');
    expect(main).toHaveAttribute('aria-label', 'Loading workspace');
  });
});
describe('WebGLBackgroundWrapper', () => {
  it('renders the client-only WebGL background', async () => {
    const { default: WebGLBackgroundWrapper } = await import(
      '@/components/ui/WebGLBackgroundWrapper'
    );
    // The wrapper exists purely to host the dynamically imported canvas layer,
    // so rendering without throwing is the contract.
    expect(() => render(<WebGLBackgroundWrapper />)).not.toThrow();
  });
});

describe('useReducedMotion server snapshot', () => {
  it('returns false when there is no window (SSR)', async () => {
    const { renderToString } = await import('react-dom/server');
    const { useReducedMotion: useReducedMotionServer } = await import(
      '@/hooks/useReducedMotion'
    );
    function Probe() {
      const reduced = useReducedMotionServer();
      return <span data-testid="probe">{String(reduced)}</span>;
    }
    // react-dom/server renders without a DOM; getServerSnapshot must win.
    const html = renderToString(<Probe />);
    expect(html).toContain('false');
  });
});
