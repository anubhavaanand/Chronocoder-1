/**
 * SearchBar Component Unit Tests
 *
 * Covers the navigation target of the fallback submit path:
 * - No currentMentorId → default ada_lovelace workspace
 * - currentMentorId set → preserves the active mentor (regression for the
 *   hardcoded redirect that threw users from any workspace to Ada)
 * - onQuerySubmit callback bypasses navigation entirely
 * - No duplicate submissions on Enter key (#CC-067)
 * - Global ⌘+K shortcut (#CC-066)
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import React from 'react';
import { render, fireEvent, cleanup, act } from '@testing-library/react';

const pushMock = vi.fn();

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: pushMock }),
}));

import { SearchBar } from '../../src/components/ui/SearchBar';

describe('SearchBar', () => {
  beforeEach(() => {
    cleanup();
    document.body.innerHTML = '';
    vi.clearAllMocks();
  });

  afterEach(() => {
    cleanup();
    document.body.innerHTML = '';
  });

  function typeAndSubmit(container: HTMLElement, value: string) {
    const input = container.querySelector('input')!;
    fireEvent.change(input, { target: { value } });
    fireEvent.submit(container.querySelector('form')!);
  }

  it('navigates to the default mentor when none is active', () => {
    const { container } = render(<SearchBar />);
    typeAndSubmit(container, 'Explain recursion');

    expect(pushMock).toHaveBeenCalledWith(
      `/workspace/ada_lovelace?query=${encodeURIComponent('Explain recursion')}`
    );
  });

  it('preserves the active mentor when currentMentorId is set', () => {
    const { container } = render(<SearchBar currentMentorId="alan_turing" />);
    typeAndSubmit(container, 'Explain recursion');

    expect(pushMock).toHaveBeenCalledWith(
      `/workspace/alan_turing?query=${encodeURIComponent('Explain recursion')}`
    );
  });

  it('encodes special characters in the query', () => {
    const { container } = render(<SearchBar currentMentorId="grace_hopper" />);
    typeAndSubmit(container, 'What is a "nanosecond"?');

    expect(pushMock).toHaveBeenCalledWith(
      `/workspace/grace_hopper?query=${encodeURIComponent('What is a "nanosecond"?')}`
    );
  });

  it('invokes onQuerySubmit instead of navigating', () => {
    const onQuerySubmit = vi.fn();
    const { container } = render(<SearchBar currentMentorId="ada_lovelace" onQuerySubmit={onQuerySubmit} />);
    typeAndSubmit(container, 'hello');

    expect(onQuerySubmit).toHaveBeenCalledWith('hello');
    expect(pushMock).not.toHaveBeenCalled();
  });

  it('ignores empty queries', () => {
    const { container } = render(<SearchBar />);
    typeAndSubmit(container, '   ');

    expect(pushMock).not.toHaveBeenCalled();
  });

  it('submits when form is submitted (Enter or submit button) without duplicate submission (#CC-067)', () => {
    const onQuerySubmit = vi.fn();
    const { container } = render(<SearchBar currentMentorId="linus_torvalds" onQuerySubmit={onQuerySubmit} />);
    const input = container.querySelector('input')!;
    fireEvent.change(input, { target: { value: 'refactor this' } });
    fireEvent.submit(container.querySelector('form')!);

    expect(onQuerySubmit).toHaveBeenCalledTimes(1);
    expect(onQuerySubmit).toHaveBeenCalledWith('refactor this');
  });

  it('clears the input via the clear button', () => {
    const { container } = render(<SearchBar />);
    const input = container.querySelector('input')!;
    fireEvent.change(input, { target: { value: 'draft' } });
    const clearButton = container.querySelector('button[aria-label="Clear search"]')!;
    fireEvent.click(clearButton);

    expect(input.value).toBe('');
  });

  it('focuses the input when Command+K or Control+K is pressed (#CC-066)', () => {
    const { container } = render(<SearchBar />);
    const input = container.querySelector('input')!;
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
