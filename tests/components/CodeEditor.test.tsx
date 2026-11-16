/**
 * CodeEditor Component Unit Tests
 *
 * Tests the extracted src/components/code/CodeEditor.tsx against the
 * workspace editor behavior:
 * - Monaco editor mounting with value/language/theme/height
 * - Live character count and complexity badge (Simple/Medium/Complex)
 * - onChange propagation from the editor
 * - Ctrl/Cmd + Enter submission shortcut
 * - Character limit enforcement and error display
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import React from 'react';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';

// Stub the Monaco editor with a plain textarea so the component tree is
// deterministic in jsdom.
vi.mock('@monaco-editor/react', () => ({
  default: (props: any) => (
    <textarea
      data-testid="monaco-editor"
      aria-label={`${props.language || 'code'} code editor`}
      data-language={props.language}
      data-theme={props.theme}
      data-height={props.height}
      value={props.value ?? ''}
      readOnly={Boolean(props.options?.readOnly)}
      onChange={(e) => props.onChange?.(e.target.value)}
    />
  ),
}));

// next/dynamic normally lazy-loads the module; render it synchronously here.
vi.mock('next/dynamic', () => ({
  default: (loader: () => Promise<any>) => {
    return function DynamicMonaco(props: any) {
      const [Comp, setComp] = React.useState<any>(null);
      React.useEffect(() => {
        let mounted = true;
        loader().then((mod) => {
          if (mounted) setComp(() => mod.default || mod);
        });
        return () => {
          mounted = false;
        };
      }, []);
      return Comp ? <Comp {...props} /> : null;
    };
  },
}));

import { CodeEditor, getComplexity, MonacoLoadingPlaceholder } from '../../src/components/code/CodeEditor';

describe.sequential('CodeEditor', () => {
  const defaultProps = {
    value: 'def hello():\n    print("hi")',
    onChange: vi.fn(),
    onSubmit: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    cleanup();
  });

  describe('Rendering', () => {
    it('mounts the Monaco editor with default python/vs-dark settings', async () => {
      render(<CodeEditor {...defaultProps} />);
      const editor = await screen.findByTestId('monaco-editor');
      expect(editor).toHaveAttribute('data-language', 'python');
      expect(editor).toHaveAttribute('data-theme', 'vs-dark');
      expect(editor).toHaveAttribute('data-height', '600px');
      expect(editor).toHaveValue(defaultProps.value);
    });

    it('honors custom language, height, and theme props', async () => {
      render(
        <CodeEditor
          {...defaultProps}
          language="typescript"
          height="400px"
          theme="hc-black"
        />
      );
      const editor = await screen.findByTestId('monaco-editor');
      expect(editor).toHaveAttribute('data-language', 'typescript');
      expect(editor).toHaveAttribute('data-height', '400px');
      expect(editor).toHaveAttribute('data-theme', 'hc-black');
    });

    it('shows the Ctrl/Cmd + Enter hint when no error is present', async () => {
      render(<CodeEditor {...defaultProps} />);
      await screen.findByTestId('monaco-editor');
      expect(screen.getByText(/Ctrl\/Cmd \+ Enter to submit/)).toBeInTheDocument();
    });

    it('passes readOnly through to the editor options', async () => {
      render(<CodeEditor {...defaultProps} readOnly />);
      const editor = await screen.findByTestId('monaco-editor');
      expect(editor).toHaveAttribute('readonly');
    });
  });

  describe('Character count & complexity', () => {
    it('renders the live character count', async () => {
      render(<CodeEditor {...defaultProps} />);
      await screen.findByTestId('monaco-editor');
      expect(screen.getByTestId('character-count')).toHaveTextContent(
        `${defaultProps.value.length} characters`
      );
    });

    it('formats large counts with locale separators', async () => {
      render(<CodeEditor {...defaultProps} value={'a'.repeat(1234)} />);
      await screen.findByTestId('monaco-editor');
      expect(screen.getByTestId('character-count')).toHaveTextContent('1,234 characters');
    });

    it('shows no complexity badge for empty code', async () => {
      render(<CodeEditor {...defaultProps} value="" />);
      await screen.findByTestId('monaco-editor');
      expect(screen.queryByText(/Simple|Medium|Complex/)).not.toBeInTheDocument();
    });

    it('classifies short code as Simple', async () => {
      render(<CodeEditor {...defaultProps} value={'x'.repeat(99)} />);
      await screen.findByTestId('monaco-editor');
      expect(screen.getByText('Simple')).toBeInTheDocument();
    });

    it('classifies medium-length code as Medium', async () => {
      render(<CodeEditor {...defaultProps} value={'x'.repeat(200)} />);
      await screen.findByTestId('monaco-editor');
      expect(screen.getByText('Medium')).toBeInTheDocument();
    });

    it('classifies long code as Complex', async () => {
      render(<CodeEditor {...defaultProps} value={'x'.repeat(600)} />);
      await screen.findByTestId('monaco-editor');
      expect(screen.getByText('Complex')).toBeInTheDocument();
    });

    it('updates count and badge as the user types', async () => {
      // Controlled component — drive it through a stateful harness.
      function Harness() {
        const [code, setCode] = React.useState('');
        return <CodeEditor value={code} onChange={setCode} />;
      }
      render(<Harness />);
      const editor = await screen.findByTestId('monaco-editor');
      fireEvent.change(editor, { target: { value: 'print(1)' } });
      expect(screen.getByTestId('character-count')).toHaveTextContent('8 characters');
      expect(screen.getByText('Simple')).toBeInTheDocument();
    });
  });

  describe('onChange', () => {
    it('propagates editor edits to the onChange callback', async () => {
      const onChange = vi.fn();
      render(<CodeEditor {...defaultProps} value="" onChange={onChange} />);
      const editor = await screen.findByTestId('monaco-editor');
      fireEvent.change(editor, { target: { value: 'new code' } });
      expect(onChange).toHaveBeenCalledWith('new code');
    });

    it('normalizes null editor output to an empty string', async () => {
      const onChange = vi.fn();
      render(<CodeEditor {...defaultProps} value="x" onChange={onChange} />);
      const editor = await screen.findByTestId('monaco-editor');
      fireEvent.change(editor, { target: { value: '' } });
      expect(onChange).toHaveBeenCalledWith('');
    });
  });

  describe('Keyboard shortcut', () => {
    it('calls onSubmit on Ctrl + Enter', async () => {
      const onSubmit = vi.fn();
      render(<CodeEditor {...defaultProps} onSubmit={onSubmit} />);
      await screen.findByTestId('monaco-editor');
      fireEvent.keyDown(window, { key: 'Enter', ctrlKey: true });
      expect(onSubmit).toHaveBeenCalledTimes(1);
    });

    it('calls onSubmit on Cmd + Enter', async () => {
      const onSubmit = vi.fn();
      render(<CodeEditor {...defaultProps} onSubmit={onSubmit} />);
      await screen.findByTestId('monaco-editor');
      fireEvent.keyDown(window, { key: 'Enter', metaKey: true });
      expect(onSubmit).toHaveBeenCalledTimes(1);
    });

    it('ignores plain Enter', async () => {
      const onSubmit = vi.fn();
      render(<CodeEditor {...defaultProps} onSubmit={onSubmit} />);
      await screen.findByTestId('monaco-editor');
      fireEvent.keyDown(window, { key: 'Enter' });
      expect(onSubmit).not.toHaveBeenCalled();
    });

    it('ignores Ctrl+K and other shortcuts', async () => {
      const onSubmit = vi.fn();
      render(<CodeEditor {...defaultProps} onSubmit={onSubmit} />);
      await screen.findByTestId('monaco-editor');
      fireEvent.keyDown(window, { key: 'k', ctrlKey: true });
      fireEvent.keyDown(window, { key: 'Enter', shiftKey: true });
      expect(onSubmit).not.toHaveBeenCalled();
    });

    it('does not bind the listener when onSubmit is omitted', async () => {
      const onSubmit = vi.fn();
      const { rerender } = render(
        <CodeEditor {...defaultProps} onSubmit={onSubmit} />
      );
      await screen.findByTestId('monaco-editor');
      rerender(<CodeEditor {...defaultProps} onSubmit={undefined} />);
      fireEvent.keyDown(window, { key: 'Enter', ctrlKey: true });
      expect(onSubmit).not.toHaveBeenCalled();
    });
  });

  describe('Validation & errors', () => {
    it('displays a provided error message and drops the hint', async () => {
      render(<CodeEditor {...defaultProps} errorText="Invalid syntax" />);
      await screen.findByTestId('monaco-editor');
      expect(screen.getByTestId('editor-error')).toHaveTextContent('Invalid syntax');
      expect(screen.queryByText(/Ctrl\/Cmd \+ Enter to submit/)).not.toBeInTheDocument();
    });

    it('flags the editor container when an error is present', async () => {
      const { container } = render(
        <CodeEditor {...defaultProps} errorText="boom" />
      );
      await screen.findByTestId('monaco-editor');
      expect(container.querySelector('.border-red-400\\/50')).toBeInTheDocument();
    });

    it('blocks submission past the character limit and shows a warning', async () => {
      render(
        <CodeEditor
          {...defaultProps}
          value={'x'.repeat(10)}
          characterLimit={5}
        />
      );
      await screen.findByTestId('monaco-editor');
      const warning = screen.getByTestId('editor-error');
      expect(warning).toHaveTextContent(/exceeds the 5-character limit/);
      expect(screen.getByTestId('character-count')).toHaveClass('text-red-400');
    });

    it('clears the limit warning once the code fits', async () => {
      const { rerender } = render(
        <CodeEditor
          {...defaultProps}
          value={'x'.repeat(50)}
          characterLimit={100}
        />
      );
      await screen.findByTestId('monaco-editor');
      expect(screen.queryByTestId('editor-error')).not.toBeInTheDocument();
      rerender(
        <CodeEditor
          {...defaultProps}
          value={'x'.repeat(150)}
          characterLimit={100}
        />
      );
      expect(screen.getByTestId('editor-error')).toBeInTheDocument();
    });
  });

  describe('getComplexity', () => {
    it('returns null for zero or negative counts', () => {
      expect(getComplexity(0)).toBeNull();
      expect(getComplexity(-5)).toBeNull();
    });

    it('maps boundary values to the right tier', () => {
      expect(getComplexity(1)?.label).toBe('Simple');
      expect(getComplexity(99)?.label).toBe('Simple');
      expect(getComplexity(100)?.label).toBe('Medium');
      expect(getComplexity(499)?.label).toBe('Medium');
      expect(getComplexity(500)?.label).toBe('Complex');
    });
  });

  describe('MonacoLoadingPlaceholder (#CC-044)', () => {
    it('renders with default 600px height matching editor to prevent CLS', () => {
      const { getByTestId } = render(<MonacoLoadingPlaceholder />);
      const placeholder = getByTestId('monaco-loading-placeholder');
      expect(placeholder).toBeInTheDocument();
      expect(placeholder).toHaveStyle({ height: '600px' });
    });

    it('honors a custom height override', () => {
      const { getByTestId } = render(<MonacoLoadingPlaceholder height="400px" />);
      const placeholder = getByTestId('monaco-loading-placeholder');
      expect(placeholder).toHaveStyle({ height: '400px' });
    });
  });
});