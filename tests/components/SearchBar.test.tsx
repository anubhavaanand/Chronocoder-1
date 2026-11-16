/**
 * SearchBar Component Unit Tests
 *
 * Covers the navigation target of the fallback submit path:
 * - No currentMentorId → default ada_lovelace workspace
 * - currentMentorId set → preserves the active mentor (regression for the
 *   hardcoded redirect that threw users from any workspace to Ada)
 * - onQuerySubmit callback bypasses navigation entirely
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import React from 'react';
import { render, screen, fireEvent, cleanup, act } from '@testing-library/react';

const pushMock = vi.fn();

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: pushMock }),
}));

import { SearchBar } from '../../src/components/ui/SearchBar';

describe.sequential('SearchBar', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    cleanup();
  });

  function typeAndSubmit(value: string) {
    const input = screen.getByRole('textbox');
    fireEvent.change(input, { target: { value } });
    fireEvent.submit(input.closest('form')!);
  }

  it('navigates to the default mentor when none is active', () => {
    render(<SearchBar />);
    typeAndSubmit('Explain recursion');

    expect(pushMock).toHaveBeenCalledWith(
      `/workspace/ada_lovelace?query=${encodeURIComponent('Explain recursion')}`
    );
  });

  it('preserves the active mentor when currentMentorId is set', () => {
    render(<SearchBar currentMentorId="alan_turing" />);
    typeAndSubmit('Explain recursion');

    expect(pushMock).toHaveBeenCalledWith(
      `/workspace/alan_turing?query=${encodeURIComponent('Explain recursion')}`
    );
  });

  it('encodes special characters in the query', () => {
    render(<SearchBar currentMentorId="grace_hopper" />);
    typeAndSubmit('What is a "nanosecond"?');

    expect(pushMock).toHaveBeenCalledWith(
      `/workspace/grace_hopper?query=${encodeURIComponent('What is a "nanosecond"?')}`
    );
  });

  it('invokes onQuerySubmit instead of navigating', () => {
    const onQuerySubmit = vi.fn();
    render(<SearchBar currentMentorId="ada_lovelace" onQuerySubmit={onQuerySubmit} />);
    typeAndSubmit('hello');

    expect(onQuerySubmit).toHaveBeenCalledWith('hello');
    expect(pushMock).not.toHaveBeenCalled();
  });

  it('ignores empty queries', () => {
    render(<SearchBar />);
    typeAndSubmit('   ');

    expect(pushMock).not.toHaveBeenCalled();
  });

  it('submits on Enter key', () => {
    render(<SearchBar currentMentorId="linus_torvalds" />);
    const input = screen.getByRole('textbox');
    fireEvent.change(input, { target: { value: 'refactor this' } });
    fireEvent.keyDown(input, { key: 'Enter' });

    expect(pushMock).toHaveBeenCalledWith(
      `/workspace/linus_torvalds?query=${encodeURIComponent('refactor this')}`
    );
  });

  it('clears the input via the clear button', () => {
    render(<SearchBar />);
    const input = screen.getByRole('textbox');
    fireEvent.change(input, { target: { value: 'draft' } });
    fireEvent.click(screen.getByRole('button', { name: 'Clear search' }));

    expect(input).toHaveValue('');
  });

  it('focuses the input when Command+K or Control+K is pressed (#CC-066)', () => {
    render(<SearchBar />);
    const input = screen.getByRole('textbox');
    expect(document.activeElement).not.toBe(input);

    act(() => {
      fireEvent.keyDown(window, { key: 'k', metaKey: true });
    });
    expect(document.activeElement).toBe(input);

    act(() => {
      input.blur();
    });
    expect(document.activeElement).not.toBe(input);

    act(() => {
      fireEvent.keyDown(window, { key: 'K', ctrlKey: true });
    });
    expect(document.activeElement).toBe(input);
  });
});