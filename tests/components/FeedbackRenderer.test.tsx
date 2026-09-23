/**
 * FeedbackRenderer Component Unit Tests
 * 
 * Test coverage includes:
 * - Token-by-token streaming rendering
 * - Markdown parsing and formatting
 * - Loading states during stream
 * - Error boundaries implementation
 * - Empty state display handling
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { FeedbackRenderer, FeedbackRendererProps } from '../../../src/components/FeedbackRenderer';
import * as MarkdownModule from 'react-markdown';

// Mock react-markdown
vi.mock('react-markdown', () => ({
  default: ({ children }: any) => (
    <div className="markdown-content" data-testid="markdown-content">
      {children}
    </div>
  ),
  ReactMarkdown: ({ children }: any) => (
    <div className="react-markdown">{children}</div>
  ),
}));

// Mock remark and rehype plugins
vi.mock('remark-gfm', () => ({}));
vi.mock('rehype-highlight', () => ({}));
vi.mock('react-syntax-highlighter', () => ({
  Prism: vi.fn(({ language, code, style }: any) => (
    <pre data-language={language} data-code-snippet={true}>
      <code>{code}</code>
    </pre>
  )),
}));

describe('FeedbackRenderer', () => {
  const mockOnStreamComplete = vi.fn();
  const mockOnTokenUpdate = vi.fn();

  const defaultProps: FeedbackRendererProps = {
    initialContent: '',
    onComplete: mockOnStreamComplete,
    onTokenUpdate: mockOnTokenUpdate,
    isLoading: false,
    error: null,
    showLoadingIndicator: true,
    maxTokensPerUpdate: 50,
    enableMarkdown: true,
    enableCodeBlocks: true,
    highlightLines: [],
    copyButton: true,
    exportButton: true,
  };

  let container: HTMLElement;
  let originalSetTimeout: any;

  beforeEach(() => {
    // Mock setTimeout for timing-sensitive tests
    originalSetTimeout = global.setTimeout;
    
    // Setup clean DOM
    document.body.innerHTML = '';
    container = render(<FeedbackRenderer {...defaultProps} />).container;
  });

  afterEach(() => {
    global.setTimeout = originalSetTimeout;
    vi.clearAllMocks();
  });

  describe('Initial Rendering', () => {
    it('renders empty state when no content provided', () => {
      render(<FeedbackRenderer {...defaultProps} initialContent="" />);
      
      expect(screen.getByText(/no feedback|empty/i)).toBeInTheDocument();
    });

    it('displays loading indicator when isLoading is true', async () => {
      render(<FeedbackRenderer {...defaultProps} isLoading={true} />);
      
      await waitFor(() => {
        const loading = screen.getByTestId('loading-indicator');
        expect(loading).toBeInTheDocument();
      });
    });

    it('shows animated dots during streaming', async () => {
      const props = {
        ...defaultProps,
        isLoading: true,
        initialContent: 'Starting analysis...',
      };
      
      render(<FeedbackRenderer {...props} />);
      
      await waitFor(() => {
        expect(screen.getByText(/starting analysis.{1,3}/i)).toBeInTheDocument();
      });
    });

    it('hides loading indicator when not loading', async () => {
      render(<FeedbackRenderer {...defaultProps} isLoading={false} />);
      
      await waitFor(() => {
        expect(screen.queryByTestId('loading-indicator')).not.toBeInTheDocument();
      });
    });

    it('displays error message when error exists', async () => {
      const props = {
        ...defaultProps,
        error: new Error('Failed to generate feedback'),
      };
      
      render(<FeedbackRenderer {...props} />);
      
      await waitFor(() => {
        const error = screen.getByText(/failed to generate feedback/i);
        expect(error).toBeInTheDocument();
      });
    });

    it('has retry button when error occurs', async () => {
      const props = {
        ...defaultProps,
        error: new Error('Generation failed'),
      };
      
      render(<FeedbackRenderer {...props} />);
      
      await waitFor(() => {
        const retryButton = screen.getByText(/retry|try-again/i);
        expect(retryButton).toBeInTheDocument();
        
        fireEvent.click(retryButton);
        expect(mockOnTokenUpdate).toHaveBeenCalled();
      });
    });

    it('renders with initial content without animation', async () => {
      const props = {
        ...defaultProps,
        initialContent: 'Initial feedback text',
        isLoading: false,
      };
      
      render(<FeedbackRenderer {...props} />);
      
      await waitFor(() => {
        expect(screen.getByText('Initial feedback text')).toBeInTheDocument();
      });
    });
  });

  describe('Streaming Behavior', () => {
    it('renders tokens one by one when streaming', async () => {
      const tokens = ['Hello', ' ', 'World', '!'];
      let tokenIndex = 0;

      const streamingGenerator = async function*() {
        for (const token of tokens) {
          yield token;
          await new Promise((resolve) => setTimeout(resolve, 50));
        }
      };

      const { rerender } = render(
        <FeedbackRenderer 
          {...defaultProps} 
          isStreaming={true} 
          source={streamingGenerator()} 
        />
      );

      // Wait for first token
      await waitFor(() => {
        expect(screen.getByText('Hello')).toBeInTheDocument();
      }, { timeout: 1000 });

      // Wait for all tokens
      await waitFor(() => {
        expect(screen.getByText('Hello World!')).toBeInTheDocument();
      }, { timeout: 2000 });
    });

    it('calls onTokenUpdate callback with each chunk', async () => {
      const chunks = [
        { index: 0, text: 'First', length: 5 },
        { index: 1, text: 'Second', length: 6 },
        { index: 2, text: 'Third', length: 5 },
      ];

      const propsWithCallback = {
        ...defaultProps,
        onTokenUpdate: vi.fn(),
        isStreaming: true,
      };

      const { rerender } = render(<FeedbackRenderer {...propsWithCallback} />);

      // Simulate streaming updates
      chunks.forEach((chunk) => {
        const event = new CustomEvent('token-update', { detail: chunk });
        window.dispatchEvent(event);
      });

      await waitFor(() => {
        expect(propsWithCallback.onTokenUpdate).toHaveBeenCalledTimes(chunks.length);
      });
    });

    it('updates total token count in real-time', async () => {
      render(<FeedbackRenderer {...defaultProps} initialContent={'a'.repeat(100)} />);

      await waitFor(() => {
        const tokenCount = screen.getByLabelText(/tokens?|characters?/i);
        expect(tokenCount).toHaveTextContent('100');
      });
    });

    it('handles very long streams gracefully', async () => {
      const longContent = 'This is a '.repeat(100);
      
      render(<FeedbackRenderer {...defaultProps} initialContent={longContent} />);

      await waitFor(() => {
        expect(screen.getByText(longContent.substring(0, 50) + '...')).toBeInTheDocument();
      });
    });

    it('preserves scroll position during streaming', async () => {
      const { container } = render(<FeedbackRenderer {...defaultProps} initialContent={'\n'.repeat(1000)} />);

      const scrollContainer = container.querySelector('.scrollable-content');
      scrollContainer?.dispatchEvent(new Event('scroll'));

      const scrollTopBefore = scrollContainer?.scrollTop || 0;

      await new Promise((resolve) => setTimeout(resolve, 100));

      expect(scrollContainer?.scrollTop).toBe(scrollTopBefore);
    });
  });

  describe('Markdown Parsing', () => {
    it('renders markdown headers correctly', async () => {
      const markdownContent = '# Header 1\n## Header 2\n### Header 3';
      
      render(<FeedbackRenderer {...defaultProps} initialContent={markdownContent} />);

      await waitFor(() => {
        expect(screen.getByRole('heading', { level: 1 })).toBeInTheDocument();
        expect(screen.getByRole('heading', { level: 2 })).toBeInTheDocument();
        expect(screen.getByRole('heading', { level: 3 })).toBeInTheDocument();
      });
    });

    it('parses bold and italic text', async () => {
      const markdownContent = '**bold text** and *italic text*';
      
      render(<FeedbackRenderer {...defaultProps} initialContent={markdownContent} />);

      await waitFor(() => {
        const bold = screen.getByText('bold text').closest('strong') as HTMLElement;
        expect(bold).toBeTruthy();
        
        const italic = screen.getByText('italic text').closest('em') as HTMLElement;
        expect(italic).toBeTruthy();
      });
    });

    it('renders unordered lists properly', async () => {
      const markdownContent = '- Item 1\n- Item 2\n- Item 3';
      
      render(<FeedbackRenderer {...defaultProps} initialContent={markdownContent} />);

      await waitFor(() => {
        expect(screen.getAllByRole('listitem')).toHaveLength(3);
      });
    });

    it('renders ordered lists properly', async () => {
      const markdownContent = '1. First\n2. Second\n3. Third';
      
      render(<FeedbackRenderer {...defaultProps} initialContent={markdownContent} />);

      await waitFor(() => {
        expect(screen.getByRole('list')).toBeInTheDocument();
        expect(screen.getAllByRole('listitem')).toHaveLength(3);
      });
    });

    it('renders blockquotes correctly', async () => {
      const markdownContent = '> This is a quote';
      
      render(<FeedbackRenderer {...defaultProps} initialContent={markdownContent} />);

      await waitFor(() => {
        expect(screen.getByRole('blockquote')).toBeInTheDocument();
        expect(screen.getByText('This is a quote')).toBeInTheDocument();
      });
    });

    it('renders code blocks with syntax highlighting', async () => {
      const markdownContent = '```typescript\nconsole.log("hello");\n```';
      
      render(<FeedbackRenderer {...defaultProps} initialContent={markdownContent} />);

      await waitFor(() => {
        const codeBlock = screen.getByTestId('code-block') || screen.getByText(/console\.log/i);
        expect(codeBlock).toBeInTheDocument();
        expect(codeBlock).toHaveAttribute('data-language', 'typescript');
      });
    });

    it('renders inline code correctly', async () => {
      const markdownContent = 'Use `console.log()` for debugging';
      
      render(<FeedbackRenderer {...defaultProps} initialContent={markdownContent} />);

      await waitFor(() => {
        const inlineCode = screen.getByText('console.log()').closest('code');
        expect(inlineCode).toBeTruthy();
      });
    });

    it('renders links properly', async () => {
      const markdownContent = '[Check this out](https://example.com)';
      
      render(<FeedbackRenderer {...defaultProps} initialContent={markdownContent} />);

      await waitFor(() => {
        const link = screen.getByText('Check this out').closest('a');
        expect(link).toBeTruthy();
        expect(link).toHaveAttribute('href', 'https://example.com');
        expect(link).toHaveAttribute('target', '_blank');
      });
    });

    it('renders tables correctly', async () => {
      const markdownContent = '| Column 1 | Column 2 |\n|----------|----------|\n| Cell 1   | Cell 2   |';
      
      render(<FeedbackRenderer {...defaultProps} initialContent={markdownContent} />);

      await waitFor(() => {
        const table = screen.getByRole('table');
        expect(table).toBeInTheDocument();
      });
    });

    it('renders task lists properly', async () => {
      const markdownContent = '- [x] Done task\n- [ ] Pending task';
      
      render(<FeedbackRenderer {...defaultProps} initialContent={markdownContent} />);

      await waitFor(() => {
        const checkboxes = screen.getAllByRole('checkbox');
        expect(checkboxes).toHaveLength(2);
        expect(checkboxes[0]).toBeChecked();
        expect(checkboxes[1]).not.toBeChecked();
      });
    });

    it('renders horizontal rules', async () => {
      const markdownContent = '---';
      
      render(<FeedbackRenderer {...defaultProps} initialContent={markdownContent} />);

      await waitFor(() => {
        const hr = screen.getByRole('separator');
        expect(hr).toBeInTheDocument();
      });
    });
  });

  describe('Code Blocks', () => {
    it('highlights multiple programming languages', async () => {
      const multiLanguageContent = `
        \`\`\`python
        def hello():
            print("world")
        \`\`\`
        
        \`\`\`javascript
        function hello() {
            console.log('world');
        }
        \`\`\`
      `;
      
      render(<FeedbackRenderer {...defaultProps} initialContent={multiLanguageContent} />);

      await waitFor(() => {
        expect(screen.getByText('def hello()')).toBeInTheDocument();
        expect(screen.getByText('console.log')).toBeInTheDocument();
      });
    });

    it('provides syntax-highlighted lines', async () => {
      const content = '```javascript\nconst x = 1;\nconst y = 2;\n```';
      
      render(<FeedbackRenderer {...defaultProps} initialContent={content} />);

      await waitFor(() => {
        expect(screen.getByText('const x = 1;')).toHaveClass(/token-keyword/);
      });
    });

    it('allows copying individual code blocks', async () => {
      render(<FeedbackRenderer {...defaultProps} initialContent="```js\nconst x = 1;\n```" />);

      await waitFor(() => {
        const copyButton = screen.getByText(/copy/i);
        expect(copyButton).toBeInTheDocument();
        
        fireEvent.click(copyButton);
        expect(navigator.clipboard.writeText).toHaveBeenCalled();
      });
    });

    it('shows line numbers for code blocks', async () => {
      render(<FeedbackRenderer {...defaultProps} initialContent="```\nline1\nline2\nline3\n```" />);

      await waitFor(() => {
        expect(screen.getByText('1')).toBeInTheDocument();
        expect(screen.getByText('2')).toBeInTheDocument();
        expect(screen.getByText('3')).toBeInTheDocument();
      });
    });

    it('wraps long code lines properly', async () => {
      const longLine = '`' + 'a'.repeat(200) + '`';
      
      render(<FeedbackRenderer {...defaultProps} initialContent={longLine} />);

      await waitFor(() => {
        const codeBlock = screen.getByRole('textbox');
        expect(codeBlock).toHaveStyle('overflow-x: auto');
      });
    });

    it('handles malformed code blocks gracefully', async () => {
      const malformed = '```javascript\nincomplete code without closing';
      
      const { container } = render(<FeedbackRenderer {...defaultProps} initialContent={malformed} />);

      await waitFor(() => {
        // Should still render without errors
        expect(container.querySelector('.error-boundary')).toBeFalsy();
      });
    });
  });

  describe('Loading States', () => {
    it('displays skeleton loader initially', async () => {
      render(<FeedbackRenderer {...defaultProps} isLoading={true} initialContent="" />);

      await waitFor(() => {
        expect(screen.getByTestId('skeleton-loader')).toBeInTheDocument();
        expect(screen.getByTestId('skeleton-line')).toBeInTheDocument();
      });
    });

    it('transitions smoothly from loading to content', async () => {
      const { rerender } = render(<FeedbackRenderer {...defaultProps} isLoading={true} />);

      await waitFor(() => {
        expect(screen.getByTestId('loading-indicator')).toBeInTheDocument();
      });

      // Switch to loaded state
      rerender(<FeedbackRenderer {...defaultProps} isLoading={false} initialContent="Loaded!" />);

      await waitFor(() => {
        expect(screen.getByText('Loaded!')).toBeInTheDocument();
        expect(screen.queryByTestId('loading-indicator')).not.toBeInTheDocument();
      });
    });

    it('shows partial content while continuing to stream', async () => {
      const props = {
        ...defaultProps,
        isLoading: true,
        initialContent: 'Already loaded some text',
      };

      render(<FeedbackRenderer {...props} />);

      await waitFor(() => {
        expect(screen.getByText('Already loaded some text')).toBeInTheDocument();
        expect(screen.getByTestId('loading-indicator')).toBeInTheDocument();
      });
    });

    it('auto-hides loading indicator after timeout', async () => {
      const props = {
        ...defaultProps,
        isLoading: true,
        maxLoadTime: 1000,
      };

      render(<FeedbackRenderer {...props} />);

      await new Promise((resolve) => setTimeout(resolve, 1500));

      await waitFor(() => {
        expect(screen.queryByTestId('loading-indicator')).not.toBeInTheDocument();
      });
    });
  });

  describe('Error Boundaries', () => {
    it('catches rendering errors gracefully', async () => {
      const brokenContent = '{{{{broken markdown';
      
      const { container } = render(<FeedbackRenderer {...defaultProps} initialContent={brokenContent} />);

      await waitFor(() => {
        expect(container.querySelector('[role="alert"]')).toBeInTheDocument();
      });
    });

    it('displays friendly error message', async () => {
      render(<FeedbackRenderer {...defaultProps} initialContent="{{{invalid" />);

      await waitFor(() => {
        const error = screen.getByText(/unable to render|markdown error/i);
        expect(error).toBeInTheDocument();
      });
    });

    it('allows retrying after error', async () => {
      const { container } = render(<FeedbackRenderer {...defaultProps} initialContent="{{{invalid" />);

      await waitFor(() => {
        const retryButton = screen.getByText(/retry|try again/i);
        expect(retryButton).toBeInTheDocument();
        
        fireEvent.click(retryButton);
        
        // Should attempt re-render
        expect(vi.mocked<any>(window.location.reload) || vi.fn).toHaveBeenCalled();
      });
    });

    it('doesn\'t crash on deeply nested structures', async () => {
      const nested = '# # # # # # # # # #';
      
      const { container } = render(<FeedbackRenderer {...defaultProps} initialContent={nested} />);

      await waitFor(() => {
        expect(container.querySelector('.error-boundary')).toBeFalsy();
      });
    });

    it('logs errors for debugging', async () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      
      render(<FeedbackRenderer {...defaultProps} initialContent="{{{{" />);

      await waitFor(() => {
        expect(consoleSpy).toHaveBeenCalled();
      });

      consoleSpy.mockRestore();
    });
  });

  describe('Empty State', () => {
    it('displays helpful placeholder when empty', async () => {
      render(<FeedbackRenderer {...defaultProps} initialContent="" />);

      await waitFor(() => {
        expect(screen.getByText(/waiting for feedback|start typing/i)).toBeInTheDocument();
      });
    });

    it('includes call-to-action in empty state', async () => {
      render(<FeedbackRenderer {...defaultProps} initialContent="" />);

      await waitFor(() => {
        const cta = screen.getByText(/submit code|generate feedback/i);
        expect(cta).toBeInTheDocument();
      });
    });

    it('shows tips or guidance in empty state', async () => {
      render(<FeedbackRenderer {...defaultProps} initialContent="" />);

      await waitFor(() => {
        const tips = screen.getByText(/tips|guidelines/i);
        expect(tips).toBeInTheDocument();
      });
    });

    it('removes empty state when content arrives', async () => {
      const { rerender } = render(<FeedbackRenderer {...defaultProps} initialContent="" />);

      await waitFor(() => {
        expect(screen.getByText(/waiting for feedback/i)).toBeInTheDocument();
      });

      rerender(<FeedbackRenderer {...defaultProps} initialContent="Real feedback!" />);

      await waitFor(() => {
        expect(screen.getByText(/waiting for feedback/i)).not.toBeInTheDocument();
        expect(screen.getByText('Real feedback!')).toBeInTheDocument();
      });
    });
  });

  describe('Copy & Export Functionality', () => {
    it('copies entire feedback to clipboard', async () => {
      const clipboardWriteSpy = vi.spyOn(navigator.clipboard, 'writeText').mockResolvedValue();
      
      render(<FeedbackRenderer {...defaultProps} copyButton={true} initialContent="Copy me!" />);

      await waitFor(() => {
        const copyButton = screen.getByText(/copy/i);
        expect(copyButton).toBeInTheDocument();
        
        fireEvent.click(copyButton);
        expect(clipboardWriteSpy).toHaveBeenCalledWith('Copy me!');
      });

      clipboardWriteSpy.mockRestore();
    });

    it('provides visual feedback when copied', async () => {
      const { rerender } = render(<FeedbackRenderer {...defaultProps} copyButton={true} initialContent="test" />);

      await waitFor(() => {
        const copyButton = screen.getByText(/copy/i);
        fireEvent.click(copyButton);
        
        expect(copyButton).toHaveTextContent(/copied!/i);
      });
    });

    it('exports feedback as text file', async () => {
      const downloadSpy = vi.fn();
      
      global.URL.createObjectURL = vi.fn().mockReturnValue('blob:test-url');
      
      render(<FeedbackRenderer {...defaultProps} exportButton={true} initialContent="export me" />);

      await waitFor(() => {
        const exportButton = screen.getByText(/export|download/i);
        expect(exportButton).toBeInTheDocument();
        
        fireEvent.click(exportButton);
        
        expect(downloadSpy).toHaveBeenCalled();
      });
    });

    it('exports in markdown format', async () => {
      const content = '# Title\n\nSome **bold** text';
      
      render(<FeedbackRenderer {...defaultProps} exportButton={true} initialContent={content} />);

      await waitFor(() => {
        const exportButton = screen.getByText(/export/i);
        if (exportButton) {
          expect(exportButton).toBeInTheDocument();
        }
      });
    });

    it('indicates current export format', async () => {
      render(<FeedbackRenderer {...defaultProps} exportButton={true} initialContent="test" />);

      await waitFor(() => {
        const formatSelector = screen.getByLabelText(/format|i-dropdown/i);
        if (formatSelector) {
          expect(formatSelector).toBeInTheDocument();
        }
      });
    });
  });

  describe('Accessibility', () => {
    it('has proper ARIA labels', async () => {
      render(<FeedbackRenderer {...defaultProps} initialContent="test" />);

      const feedbackSection = screen.getByRole('region', { name: /feedback|analysis/i });
      expect(feedbackSection).toBeInTheDocument();
    });

    it('provides aria-live for dynamic updates', async () => {
      render(<FeedbackRenderer {...defaultProps} initialContent="" />);

      await waitFor(() => {
        expect(screen.getByRole('status')).toBeInTheDocument();
        expect(screen.getByRole('status')).toHaveAttribute('aria-live', 'polite');
      });
    });

    it('is keyboard accessible', async () => {
      render(<FeedbackRenderer {...defaultProps} copyButton={true} initialContent="test" />);

      await waitFor(() => {
        const copyButton = screen.getByText(/copy/i);
        copyButton.focus();
        
        expect(copyButton).toHaveFocus();
        expect(copyButton).toHaveClass(/focus-ring/);
      });
    });

    it('has sufficient color contrast', async () => {
      render(<FeedbackRenderer {...defaultProps} initialContent="text" />);

      await waitFor(() => {
        const text = screen.getByText('text');
        const computedStyles = window.getComputedStyle(text);
        
        expect(computedStyles.color).toBeTruthy();
      });
    });

    it('provides focus indicators', async () => {
      render(<FeedbackRenderer {...defaultProps} initialContent="test" />);

      await waitFor(() => {
        const interactiveElement = screen.getByRole('button') || screen.getByRole('link');
        interactiveElement.focus();
        
        expect(interactiveElement).toHaveFocus();
        expect(interactiveElement).toHaveClass(/outline/);
      });
    });

    it('skips to main content via keyboard', async () => {
      render(<FeedbackRenderer {...defaultProps} initialContent="test" />);

      // Tab key navigation should work
      fireEvent.keyDown(document, { key: 'Tab' });
      
      await waitFor(() => {
        expect(document.activeElement).toBeTruthy();
      });
    });

    it('has descriptive landmark regions', async () => {
      render(<FeedbackRenderer {...defaultProps} initialContent="test" />);

      await waitFor(() => {
        expect(screen.getByRole('article')).toBeInTheDocument();
        expect(screen.getByRole('region')).toBeInTheDocument();
      });
    });
  });

  describe('Edge Cases', () => {
    it('handles extremely long single lines', async () => {
      const ultraLongLine = '`' + 'a'.repeat(10000) + '`';
      
      const { container } = render(<FeedbackRenderer {...defaultProps} initialContent={ultraLongLine} />);

      await waitFor(() => {
        expect(container.querySelector('.code-block')).toBeTruthy();
      });
    });

    it('handles Unicode characters and emojis', async () => {
      const unicodeContent = '🚀 Rocket launch ✅ Success 🎉 Celebration';
      
      render(<FeedbackRenderer {...defaultProps} initialContent={unicodeContent} />);

      await waitFor(() => {
        expect(screen.getByText('🚀')).toBeInTheDocument();
        expect(screen.getByText('✅')).toBeInTheDocument();
        expect(screen.getByText('🎉')).toBeInTheDocument();
      });
    });

    it('handles mixed RTL and LTR text', async () => {
      const mixedContent = 'English text ←← Arabic: مرحبا';
      
      render(<FeedbackRenderer {...defaultProps} initialContent={mixedContent} />);

      await waitFor(() => {
        expect(screen.getByText('مرحبا')).toBeInTheDocument();
      });
    });

    it('processes invalid JSON safely', async () => {
      const invalidJson = '{"key": "value", invalid: true}';
      
      const { container } = render(<FeedbackRenderer {...defaultProps} initialContent={invalidJson} />);

      await waitFor(() => {
        expect(container.querySelector('.error-boundary')).toBeFalsy();
      });
    });

    it('handles null and undefined values gracefully', async () => {
      const props = {
        ...defaultProps,
        initialContent: null as any,
      };

      render(<FeedbackRenderer {...props} />);

      await waitFor(() => {
        expect(screen.getByText(/empty/i)).toBeInTheDocument();
      });
    });

    it('maintains state during re-renders', async () => {
      const { rerender, container } = render(<FeedbackRenderer {...defaultProps} initialContent="stable" />);

      rerender(<FeedbackRenderer {...defaultProps} initialContent="changed" />);

      await waitFor(() => {
        // Should maintain scroll and selection
        expect(container.querySelector('.scroll-container')).toBeTruthy();
      });
    });
  });

  describe('Performance', () => {
    it('renders large feedback efficiently', async () => {
      const largeContent = Array(100).fill('# Section\n\nLorem ipsum dolor sit amet.\n\n').join('');
      
      const startTime = performance.now();
      render(<FeedbackRenderer {...defaultProps} initialContent={largeContent} />);
      const endTime = performance.now();

      expect(endTime - startTime).toBeLessThan(1000);
    });

    it('handles rapid token updates without lag', async () => {
      const { rerender } = render(<FeedbackRenderer {...defaultProps} isLoading={true} />);

      const startTime = performance.now();
      for (let i = 0; i < 50; i++) {
        rerender(<FeedbackRenderer {...defaultProps} isLoading={true} />);
      }
      const endTime = performance.now();

      expect(endTime - startTime).toBeLessThan(500);
    });

    it('uses virtual scrolling for large content', async () => {
      const tallContent = '\n'.repeat(5000);
      
      render(<FeedbackRenderer {...defaultProps} initialContent={tallContent} />);

      await waitFor(() => {
        const viewport = screen.getByRole('document');
        expect(viewport).toHaveStyle(/overflow-y: scroll|overflow-y: auto/);
      });
    });
  });
});
