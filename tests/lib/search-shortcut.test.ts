/**
 * Shared Cmd/Ctrl+K shortcut registry tests.
 *
 * Covers:
 * - Only one global keydown listener exists no matter how many handlers are
 *   registered (#204).
 * - The most recently registered handler (topmost search bar) wins.
 * - Handlers are removed on cleanup and the listener is detached when empty.
 */

import { describe, it, expect, vi, afterEach } from 'vitest';
import {
  registerSearchShortcut,
  unregisterSearchShortcut,
  getSearchShortcutCount,
  resetSearchShortcuts,
} from '@/lib/search-shortcut';

function pressCmdK(): KeyboardEvent {
  const event = new KeyboardEvent('keydown', {
    key: 'k',
    ctrlKey: true,
    bubbles: true,
    cancelable: true,
  });
  window.dispatchEvent(event);
  return event;
}

describe('search shortcut registry', () => {
  afterEach(() => {
    resetSearchShortcuts();
    vi.restoreAllMocks();
  });

  it('registers exactly one global keydown listener regardless of handler count (#204)', () => {
    resetSearchShortcuts();
    const addSpy = vi.spyOn(window, 'addEventListener');

    const unreg1 = registerSearchShortcut(() => {});
    const unreg2 = registerSearchShortcut(() => {});
    const unreg3 = registerSearchShortcut(() => {});

    const keydownAdds = addSpy.mock.calls.filter(([type]) => type === 'keydown');
    expect(keydownAdds).toHaveLength(1);
    expect(getSearchShortcutCount()).toBe(3);

    unreg1();
    unreg2();
    unreg3();
  });

  it('invokes only the most recently registered handler (#204)', () => {
    resetSearchShortcuts();
    const first = vi.fn();
    const second = vi.fn();

    const unreg1 = registerSearchShortcut(first);
    const unreg2 = registerSearchShortcut(second);

    const event = pressCmdK();

    expect(first).not.toHaveBeenCalled();
    expect(second).toHaveBeenCalledTimes(1);
    expect(event.defaultPrevented).toBe(true);

    unreg1();
    unreg2();
  });

  it('falls back to the previous handler after the active one unregisters', () => {
    resetSearchShortcuts();
    const first = vi.fn();
    const second = vi.fn();

    const unreg1 = registerSearchShortcut(first);
    const unreg2 = registerSearchShortcut(second);

    unreg2(); // close the top bar
    pressCmdK();

    expect(first).toHaveBeenCalledTimes(1);
    expect(second).not.toHaveBeenCalled();

    unreg1();
  });

  it('detaches the global listener when the last handler unregisters', () => {
    resetSearchShortcuts();
    const removeSpy = vi.spyOn(window, 'removeEventListener');

    const unreg = registerSearchShortcut(() => {});
    unreg();

    const keydownRemoves = removeSpy.mock.calls.filter(([type]) => type === 'keydown');
    expect(keydownRemoves).toHaveLength(1);
    expect(getSearchShortcutCount()).toBe(0);
  });

  it('does nothing when no handlers are registered', () => {
    resetSearchShortcuts();
    const event = pressCmdK();
    expect(event.defaultPrevented).toBe(false);
  });
});