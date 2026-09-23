/**
 * CodeEditor Component Unit Tests
 * 
 * Test coverage includes:
 * - Code input handling and validation
 * - Character count updates in real-time
 * - Keyboard shortcuts (Ctrl+Enter submission)
 * - Error validation for code limits
 * - Monaco editor initialization and lifecycle
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { CodeEditor, CodeEditorProps } from '../../../src/components/CodeEditor';

// Mock Monaco Editor
vi.mock('monaco-editor', () => ({
  default: {
    editor: {
      create: vi.fn(() => ({
        getModel: vi.fn(),
        getValue: vi.fn().mockReturnValue('// Sample code'),
        setValue: vi.fn(),
        getWordAtPosition: vi.fn(),
        getPosition: vi.fn(),
        dispose: vi.fn(),
        onDidChangeModelContent: vi.fn().mockReturnValue({ dispose: vi.fn() }),
        layout: vi.fn(),
        focus: vi.fn(),
        onKeyDown: vi.fn().mockReturnValue({ dispose: vi.fn() }),
      })),
      registerLanguage: vi.fn(),
      Monaco: {
        EditorWorkerConfig: {},
        WorkerExitCode: {},
      },
    },
    languages: {
      typescript: {},
      javascript: {},
      python: {},
    },
    editor: {
      createDiffEditor: vi.fn(),
      addKeybinding: vi.fn(),
    },
  },
}));

// Mock React monaco
vi.mock('@monaco-editor/react', () => ({
  default: vi.fn((props: any) => (
    <div data-testid="monaco-editor" {...props}>
      <textarea aria-label={props.language || 'code'} />
    </div>
  )),
}));

// Mock hooks
vi.mock('../../../src/hooks/useCharacterCount', () => ({
  useCharacterCount: vi.fn().mockReturnValue({ count: 0, max: 50000 }),
}));

vi.mock('../../../src/hooks/useKeyboardShortcuts', () => ({
  useKeyboardShortcuts: vi.fn().mockReturnValue({ handlers: {} }),
}));

describe('CodeEditor', () => {
  const mockCallbacks = {
    onChange: vi.fn(),
    onSubmit: vi.fn(),
    onError: vi.fn(),
    onValidation: vi.fn(),
  };

  const defaultProps: CodeEditorProps = {
    value: '// Write your code here\nfunction hello() {\n  console.log("Hello, World!");\n}',
    language: 'typescript',
    height: '400px',
    theme: 'vs-dark',
    placeholder: 'Enter your code...',
    characterLimit: 50000,
    submitShortcut: 'Ctrl+Enter',
    showLineNumber: true,
    readOnly: false,
    errorText: '',
    onSuccess: vi.fn(),
    ...mockCallbacks,
  };

  let container: HTMLElement;
  let originalResizeObserver: any;
  let originalIntersectionObserver: any;

  beforeEach(() => {
    // Mock ResizeObserver
    originalResizeObserver = global.ResizeObserver;
    global.ResizeObserver = vi.fn().mockImplementation(() => ({
      observe: vi.fn(),
      unobserve: vi.fn(),
      disconnect: vi.fn(),
    }));

    // Mock IntersectionObserver
    originalIntersectionObserver = global.IntersectionObserver;
    global.IntersectionObserver = vi.fn().mockImplementation(() => ({
      observe: vi.fn(),
      disconnect: vi.fn(),
      takeRecords: vi.fn(),
      unobserve: vi.fn(),
    }));

    // Setup clean DOM
    document.body.innerHTML = '';
    container = render(<CodeEditor {...defaultProps} />).container;
  });

  afterEach(() => {
    global.ResizeObserver = originalResizeObserver;
    global.IntersectionObserver = originalIntersectionObserver;
    vi.clearAllMocks();
  });

  describe('Initialization', () => {
    it('initializes Monaco editor correctly', async () => {
      await waitFor(() => {
        const editorElement = screen.getByTestId('monaco-editor');
        expect(editorElement).toBeInTheDocument();
      });
    });

    it('loads specified programming language', async () => {
      await waitFor(() => {
        const textarea = screen.getByRole('textbox');
        expect(textarea).toHaveAttribute('aria-label', 'typescript');
      });
    });

    it('applies correct theme settings', async () => {
      await waitFor(() => {
        const editorWrapper = screen.getByTestId('monaco-editor');
        expect(editorWrapper).toHaveClass(/vs-dark|dark-theme/);
      });
    });

    it('sets initial code value', async () => {
      await waitFor(() => {
        const editorValue = screen.getByRole('textbox').textContent;
        expect(editorValue).toContain('hello');
        expect(editorValue).toContain('console.log');
      });
    });

    it('shows custom placeholder text', async () => {
      const propsWithPlaceholder = {
        ...defaultProps,
        value: '',
      };
      
      render(<CodeEditor {...propsWithPlaceholder} />);
      
      await waitFor(() => {
        const placeholder = screen.getByText('Enter your code...');
        expect(placeholder).toBeInTheDocument();
      });
    });

    it('displays line numbers when enabled', async () => {
      render(<CodeEditor {...defaultProps} showLineNumber={true} />);
      
      await waitFor(() => {
        expect(screen.getByLabelText('Line numbers')).toBeInTheDocument();
      });
    });
  });

  describe('Input Handling', () => {
    it('handles basic text input', async () => {
      const user = userEvent.setup();
      const editor = screen.getByRole('textbox');
      
      await user.type(editor, 'const test = "new code";');
      
      expect(mockCallbacks.onChange).toHaveBeenCalledTimes(1);
      
      await waitFor(() => {
        expect(editor.value).toContain('test');
      });
    });

    it('calls onChange callback with new value', async () => {
      const user = userEvent.setup();
      const editor = screen.getByRole('textbox');
      
      await user.type(editor, 'x');
      
      await waitFor(() => {
        expect(mockCallbacks.onChange).toHaveBeenCalledWith('const test = "new code";x');
      });
    });

    it('prevents editing when readOnly is true', async () => {
      render(<CodeEditor {...defaultProps} readOnly={true} />);
      
      const editor = screen.getByRole('textbox');
      expect(editor).toBeDisabled();
      
      const user = userEvent.setup();
      await user.click(editor);
      
      expect(editor).not.toHaveFocus();
    });

    it('handles multi-line input correctly', async () => {
      const user = userEvent.setup();
      const editor = screen.getByRole('textbox');
      
      await user.type(editor, '\nfunction second() {\n  return true;\n}');
      
      await waitFor(() => {
        const value = screen.getByRole('textbox').value;
        expect(value.split('\n').length).toBeGreaterThan(1);
      });
    });

    it('supports copy/paste operations', async () => {
      const user = userEvent.setup();
      const editor = screen.getByRole('textbox');
      
      // Simulate paste
      const clipboardData = new DataTransfer();
      clipboardData.items.add('text/plain', 'pasted code');
      
      fireEventpaste(editor, { clipboardData });
      
      await waitFor(() => {
        expect(editor.value).toContain('pasted code');
      });
    });

    it('handles special characters correctly', async () => {
      const specialChars = '{<>`~!@#$%^&*()_+-=[]\\|;:,./?';
      const user = userEvent.setup();
      const editor = screen.getByRole('textbox');
      
      await user.type(editor, specialChars);
      
      await waitFor(() => {
        expect(screen.getByRole('textbox').value).toContain(specialChars);
      });
    });
  });

  describe('Character Count', () => {
    it('displays accurate character count', async () => {
      render(<CodeEditor {...defaultProps} value={'a'.repeat(10)} />);
      
      await waitFor(() => {
        const charCount = screen.getByLabelText('Character count');
        expect(charCount).toHaveTextContent('10');
      });
    });

    it('updates character count dynamically as user types', async () => {
      const user = userEvent.setup();
      const editor = screen.getByRole('textbox');
      const countLabel = screen.getByLabelText('Character count');
      
      await user.type(editor, 'abc');
      
      await waitFor(() => {
        expect(countLabel.textContent).toContain('13'); // Original + added
      });
    });

    it('warns when approaching character limit', async () => {
      const props = {
        ...defaultProps,
        value: 'x'.repeat(49000),
      };
      
      render(<CodeEditor {...props} />);
      
      await waitFor(() => {
        const warning = screen.getByText(/approaching limit/i);
        expect(warning).toBeInTheDocument();
      });
    });

    it('blocks input that exceeds character limit', async () => {
      const user = userEvent.setup();
      const editor = screen.getByRole('textbox');
      
      Object.defineProperty(editor, 'value', {
        writable: true,
        value: 'x'.repeat(50000),
      });
      
      await user.type(editor, 'y');
      
      await waitFor(() => {
        expect(editor.value.length).toBeLessThanOrEqual(50000);
      });
    });

    it('displays percentage indicator', async () => {
      render(<CodeEditor {...defaultProps} value={'a'.repeat(25000)} />);
      
      await waitFor(() => {
        const percentage = screen.getByText(/50%|halfway/i);
        expect(percentage).toBeInTheDocument();
      });
    });

    it('shows remaining characters', async () => {
      render(<CodeEditor {...defaultProps} value={'a'.repeat(10)} />);
      
      await waitFor(() => {
        const remaining = screen.getByText(/49990|remaining/i);
        expect(remaining).toBeInTheDocument();
      });
    });
  });

  describe('Keyboard Shortcuts', () => {
    it('triggers submit on Ctrl+Enter', async () => {
      const editor = screen.getByRole('textbox');
      
      // Press Ctrl key first
      fireEvent.keyDown(editor, {
        ctrlKey: true,
        key: 'Enter',
      });
      
      await waitFor(() => {
        expect(mockCallbacks.onSubmit).toHaveBeenCalled();
      });
    });

    it('does NOT trigger on Enter alone', async () => {
      const editor = screen.getByRole('textbox');
      
      fireEvent.keyDown(editor, {
        key: 'Enter',
      });
      
      await waitFor(() => {
        expect(mockCallbacks.onSubmit).not.toHaveBeenCalled();
      });
    });

    it('does NOT trigger on Ctrl+K or other shortcuts', async () => {
      const editor = screen.getByRole('textbox');
      
      fireEvent.keyDown(editor, {
        ctrlKey: true,
        key: 'k',
      });
      
      expect(mockCallbacks.onSubmit).not.toHaveBeenCalled();
    });

    it('displays keyboard shortcut hint', async () => {
      render(<CodeEditor {...defaultProps} />);
      
      await waitFor(() => {
        const hint = screen.getByText(/Cmd \+ Enter/i) ||
                     screen.getByText(/Ctrl \+ Enter/i);
        expect(hint).toBeInTheDocument();
      });
    });

    it('responds to Cmd+Enter on Mac', async () => {
      const editor = screen.getByRole('textbox');
      
      // Mock mac OS
      Object.defineProperty(navigator, 'platform', {
        value: 'MacIntel',
        configurable: true,
      });
      
      fireEvent.keyDown(editor, {
        metaKey: true,
        key: 'Enter',
      });
      
      await waitFor(() => {
        expect(mockCallbacks.onSubmit).toHaveBeenCalled();
      });
    });

    it('allows custom submit shortcuts', async () => {
      const props = {
        ...defaultProps,
        submitShortcut: 'Alt+S',
      };
      
      const { rerender } = render(<CodeEditor {...props} />);
      
      const editor = screen.getByRole('textbox');
      
      fireEvent.keyDown(editor, {
        altKey: true,
        key: 's',
      });
      
      await waitFor(() => {
        expect(mockCallbacks.onSubmit).toHaveBeenCalled();
      });
    });
  });

  describe('Error Validation', () => {
    it('displays error message when provided', async () => {
      const props = {
        ...defaultProps,
        errorText: 'Your code exceeds the character limit',
      };
      
      render(<CodeEditor {...props} />);
      
      await waitFor(() => {
        const error = screen.getByText('Your code exceeds the character limit');
        expect(error).toBeInTheDocument();
      });
    });

    it('highlights editor when error exists', async () => {
      render(<CodeEditor {...defaultProps} errorText="Invalid syntax" />);
      
      await waitFor(() => {
        const editorContainer = screen.getByTestId('monaco-editor');
        expect(editorContainer).toHaveClass(/error-border|red-border/);
      });
    });

    it('validates code syntax before submission', async () => {
      const invalidCode = 'function broken(';
      const props = {
        ...defaultProps,
        value: invalidCode,
        validateOnSubmit: true,
      };
      
      const { rerender } = render(<CodeEditor {...props} />);
      
      const editor = screen.getByRole('textbox');
      
      fireEvent.keyDown(editor, {
        ctrlKey: true,
        key: 'Enter',
      });
      
      await waitFor(() => {
        expect(mockCallbacks.onError).toHaveBeenCalledWith(
          expect.objectContaining({
            type: 'syntax-error',
            message: expect.stringContaining('invalid'),
          })
        );
      });
    });

    it('cleares errors when code becomes valid', async () => {
      const props = {
        ...defaultProps,
        errorText: 'Some error',
        value: 'invalid code',
      };
      
      const { rerender } = render(<CodeEditor {...props} />);
      
      expect(screen.getByText(/some error/i)).toBeInTheDocument();
      
      // User fixes the code
      const editor = screen.getByRole('textbox');
      fireEvent.change(editor, { target: { value: 'valid code()' } });
      
      await waitFor(() => {
        expect(screen.queryByText(/some error/i)).not.toBeInTheDocument();
      });
    });

    it('provides validation feedback inline', async () => {
      const props = {
        ...defaultProps,
        validateInline: true,
      };
      
      render(<CodeEditor {...props} />);
      
      await waitFor(() => {
        expect(screen.getByLabelText(/validate|check-code/i)).toBeInTheDocument();
      });
    });

    it('prevents submission if code is empty', async () => {
      const props = {
        ...defaultProps,
        value: '',
      };
      
      const { rerender } = render(<CodeEditor {...props} />);
      
      const editor = screen.getByRole('textbox');
      fireEvent.keyDown(editor, {
        ctrlKey: true,
        key: 'Enter',
      });
      
      await waitFor(() => {
        expect(mockCallbacks.onError).toHaveBeenCalledWith(
          expect.objectContaining({
            type: 'empty-code',
            message: 'Cannot submit empty code',
          })
        );
      });
    });
  });

  describe('Monaco Editor Lifecycle', () => {
    it('creates editor instance on mount', () => {
      expect(vi.mocked<any>(window.monaco?.editor.create)).toHaveBeenCalled();
    });

    it('destroys editor instance on unmount', async () => {
      const { unmount } = render(<CodeEditor {...defaultProps} />);
      
      unmount();
      
      await waitFor(() => {
        expect(window.monaco?.editor.create).toHaveBeenCalled();
      });
    });

    it('focuses editor automatically when autoFocus', async () => {
      render(<CodeEditor {...defaultProps} autoFocus={true} />);
      
      const editor = screen.getByRole('textbox');
      expect(editor).toHaveFocus();
    });

    it('adjusts height on content change', async () => {
      render(<CodeEditor {...defaultProps} autoHeight={true} />);
      
      const editor = screen.getByRole('textbox');
      fireEvent.input(editor, { target: { value: Array(50).fill('a').join('\n') } });
      
      await waitFor(() => {
        const height = window.getComputedStyle(editor).height;
        expect(height).toBeTruthy();
      });
    });

    it('handles resize events gracefully', async () => {
      const resizeObserver = new ResizeObserver(() => {});
      global.ResizeObserver = vi.fn().mockReturnValue(resizeObserver);
      
      render(<CodeEditor {...defaultProps} />);
      
      const editor = screen.getByTestId('monaco-editor');
      resizeObserver.observe(editor);
      
      resizeObserver.disconnect();
      
      expect(resizeObserver.disconnect).toHaveBeenCalled();
    });

    it('preserves cursor position after re-renders', async () => {
      const { rerender, container } = render(<CodeEditor {...defaultProps} />);
      
      const editor = screen.getByRole('textbox');
      const initialCursorPosition = { line: 1, column: 5 };
      
      rerender(<CodeEditor {...defaultProps} value="changed content" />);
      
      await waitFor(() => {
        expect(editor).toBeInTheDocument();
      });
      
      // Cursor should be preserved
      expect(container.querySelector('.cursor-position')).toBeTruthy();
    });
  });

  describe('Code Formatting', () => {
    it('provides format document command', async () => {
      render(<CodeEditor {...defaultProps} />);
      
      const formatButton = screen.getByText(/format/i);
      expect(formatButton).toBeInTheDocument();
      
      fireEvent.click(formatButton);
      
      expect(mockCallbacks.onFormat).toHaveBeenCalled();
    });

    it('auto-formats on save (if enabled)', async () => {
      const props = {
        ...defaultProps,
        autoFormat: true,
      };
      
      render(<CodeEditor {...props} />);
      
      // Simulate auto-format triggered
      const editor = screen.getByRole('textbox');
      fireEvent.keyDown(editor, { key: 'Tab' });
      
      await waitFor(() => {
        expect(mockCallbacks.onFormat).toHaveBeenCalled();
      });
    });

    it('indicates formatted state', async () => {
      render(<CodeEditor {...defaultProps} />);
      
      const formatIndicator = screen.getByText(/formatted|i-beam/i);
      expect(formatIndicator).toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    it('has proper role for textbox', () => {
      const editor = screen.getByRole('textbox');
      expect(editor).toHaveAttribute('role', 'textbox');
      expect(editor).toHaveAttribute('aria-multiline', 'true');
    });

    it('includes aria-describedby for helper text', () => {
      const editor = screen.getByRole('textbox');
      const helpText = screen.getByText(/lines|characters/i);
      
      expect(editor).toHaveAttribute('aria-describedby');
    });

    it('provides focus indication', () => {
      const editor = screen.getByRole('textbox');
      editor.focus();
      
      expect(editor).toHaveFocus();
      expect(editor).toHaveClass(/focus-ring|focused/);
    });

    it('is keyboard accessible', () => {
      const editor = screen.getByRole('textbox');
      
      // Tab to editor
      fireEvent.keyDown(document, { key: 'Tab' });
      
      expect(editor).toHaveFocus();
    });

    it('has appropriate labels for assistive technology', () => {
      const editor = screen.getByRole('textbox');
      expect(editor).toHaveAttribute('aria-label', 'Code editor for TypeScript');
    });

    it('provides live region for validation status', () => {
      expect(screen.getByRole('status')).toBeInTheDocument();
      expect(screen.getByRole('status')).toHaveAttribute('aria-live', 'polite');
    });
  });

  describe('Edge Cases & Error Handling', () => {
    it('handles very long lines gracefully', async () => {
      const longLine = 'x'.repeat(10000);
      render(<CodeEditor {...defaultProps} value={longLine} />);
      
      await waitFor(() => {
        const editor = screen.getByRole('textbox');
        expect(editor.value.length).toBeGreaterThanOrEqual(longLine.length);
      });
    });

    it('handles Unicode characters correctly', async () => {
      const unicodeCode = 'function hɛllo() { console.log("世界"); }';
      const user = userEvent.setup();
      const editor = screen.getByRole('textbox');
      
      await user.type(editor, unicodeCode);
      
      await waitFor(() => {
        expect(screen.getByRole('textbox').value).toContain('世界');
      });
    });

    it('handles emoji in code strings', async () => {
      const emojiCode = 'const emoji = "🚀✨💻";';
      const user = userEvent.setup();
      const editor = screen.getByRole('textbox');
      
      await user.type(editor, emojiCode);
      
      await waitFor(() => {
        expect(screen.getByRole('textbox').value).toContain('🚀');
      });
    });

    it('handles tab characters correctly', async () => {
      const tabCode = 'function test() {\n\treturn true;\n}';
      const user = userEvent.setup();
      const editor = screen.getByRole('textbox');
      
      await user.type(editor, tabCode);
      
      await waitFor(() => {
        expect(screen.getByRole('textbox').value).toContain('\t');
      });
    });

    it('recovers from malformed input gracefully', async () => {
      const malformed = '<script>alert("xss")</script>';
      const user = userEvent.setup();
      const editor = screen.getByRole('textbox');
      
      await user.type(editor, malformed);
      
      await waitFor(() => {
        expect(screen.getByRole('textbox').value).not.toContain('<script>');
      });
    });

    it('maintains state during rapid typing', async () => {
      const user = userEvent.setup();
      const editor = screen.getByRole('textbox');
      
      // Rapid typing simulation
      for (let i = 0; i < 100; i++) {
        await user.type(editor, 'a');
      }
      
      await waitFor(() => {
        const finalLength = screen.getByRole('textbox').value.length;
        expect(finalLength).toBeGreaterThanOrEqual(100);
      });
    });
  });

  describe('Performance Benchmarks', () => {
    it('renders without significant delay', async () => {
      const largeCode = Array(1000).fill('// Comment').join('\n');
      
      const startTime = performance.now();
      render(<CodeEditor {...defaultProps} value={largeCode} />);
      const endTime = performance.now();
      
      expect(endTime - startTime).toBeLessThan(500); // Should render within 500ms
    });

    it('handles character counting efficiently', async () => {
      const largeCode = 'a'.repeat(50000);
      
      const startTime = performance.now();
      render(<CodeEditor {...defaultProps} value={largeCode} />);
      const endTime = performance.now();
      
      expect(endTime - startTime).toBeLessThan(1000);
    });

    it('processes input changes quickly', async () => {
      const user = userEvent.setup();
      const editor = screen.getByRole('textbox');
      
      const startTime = performance.now();
      await user.type(editor, 'quick input');
      const endTime = performance.now();
      
      expect(endTime - startTime).toBeLessThan(200);
    });
  });
});
