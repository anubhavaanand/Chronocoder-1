/**
 * HeroSearch Component Unit Tests
 *
 * Covers:
 * - Submitting the hero search carries the typed question into the mentor
 *   workspace via ?query=... instead of silently discarding it (#203).
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import React from 'react';
import { render, fireEvent, cleanup } from '@testing-library/react';

const pushMock = vi.fn();

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: pushMock }),
}));

import { HeroSearch } from '@/components/ui/HeroSearch';

describe('HeroSearch', () => {
  beforeEach(() => {
    cleanup();
    document.body.innerHTML = '';
    vi.clearAllMocks();
  });

  function getInput(container: HTMLElement): HTMLInputElement {
    const input = container.querySelector('input');
    if (!input) throw new Error('search input not found');
    return input;
  }

  it('navigates to a mentor workspace with the typed query (#203)', () => {
    const { container } = render(<HeroSearch />);
    const input = getInput(container);

    fireEvent.change(input, { target: { value: 'How do I optimize recursion?' } });
    fireEvent.submit(container.querySelector('form')!);

    expect(pushMock).toHaveBeenCalledTimes(1);
    expect(pushMock).toHaveBeenCalledWith(
      `/workspace/ada_lovelace?query=${encodeURIComponent('How do I optimize recursion?')}`,
    );
  });

  it('does not navigate when the query is empty', () => {
    const { container } = render(<HeroSearch />);
    const input = getInput(container);

    fireEvent.change(input, { target: { value: '   ' } });
    fireEvent.submit(container.querySelector('form')!);

    expect(pushMock).not.toHaveBeenCalled();
  });

  it('encodes special characters in the query', () => {
    const { container } = render(<HeroSearch />);
    const input = getInput(container);

    fireEvent.change(input, { target: { value: 'What is a "nanosecond"?' } });
    fireEvent.submit(container.querySelector('form')!);

    expect(pushMock).toHaveBeenCalledWith(
      `/workspace/ada_lovelace?query=${encodeURIComponent('What is a "nanosecond"?')}`,
    );
  });
});