"use client";

import { Loader2, AlertCircle } from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import type { FeedbackSectionView } from "@/hooks/useMentorWebSocket";

export interface FeedbackRendererProps {
  mentorName: string;
  mentorIcon?: string;
  reading: string;
  sections: FeedbackSectionView[];
  challenge: string;
  closing: string;
  isAnalyzing: boolean;
  error: string | null;
  onClearError?: () => void;
}

/**
 * Renders the streaming AI feedback panel for a mentor workspace:
 * error state, loading state, streamed sections (markdown), challenge,
 * closing remark, and the initial empty state.
 */
export type MarkdownCodeProps = React.HTMLAttributes<HTMLElement> & {
  children?: React.ReactNode;
  className?: string;
  node?: unknown;
};

/**
 * Custom renderer for markdown `code` elements.
 * react-markdown v9+ deprecates the `inline` prop; we determine block vs inline
 * by checking for a `language-*` class or newlines in text content.
 */
export function FeedbackCodeComponent({ children, className, ...rest }: MarkdownCodeProps) {
  const match = className ? /language-(\w+)/.exec(className) : null;
  const isBlock = Boolean(match) || (typeof children === "string" && children.includes("\n"));
  return isBlock ? (
    <pre className="bg-retro-darker p-4 rounded-lg overflow-x-auto my-3 border border-retro-border">
      <code className={match ? match[1] : undefined}>{children}</code>
    </pre>
  ) : (
    <code className="bg-retro-panel px-1.5 py-0.5 rounded text-accent-cyan font-mono text-sm" {...rest}>
      {children}
    </code>
  );
}

export function FeedbackRenderer({
  mentorName,
  mentorIcon,
  reading,
  sections,
  challenge,
  closing,
  isAnalyzing,
  error,
  onClearError,
}: FeedbackRendererProps) {
  const hasContent =
    Boolean(reading) || sections.length > 0 || Boolean(challenge);
  const isStreaming = isAnalyzing && !hasContent && !error;

  return (
    <div className="glass-effect rounded-lg p-6 border border-retro-border min-h-[600px]">
      {/* Error State */}
      {error && (
        <div className="text-red-400 bg-red-400/10 border border-red-400/30 p-4 rounded-lg">
          <div className="flex items-start space-x-3">
            <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold">Error:</p>
              <p className="text-sm">{error}</p>
              {onClearError && (
                <button
                  type="button"
                  onClick={onClearError}
                  className="mt-2 px-4 py-2 bg-red-400/20 hover:bg-red-400/30 text-red-300 rounded transition-colors"
                >
                  Try Again
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Loading State */}
      {!error && isStreaming && (
        <div className="flex flex-col items-center justify-center h-96 space-y-4">
          <Loader2 className="w-12 h-12 text-accent-cyan animate-spin" />
          <p className="text-gray-400">Generating personalized feedback...</p>
        </div>
      )}

      {/* Streaming Feedback */}
      {!error && hasContent && (
        <div className="animate-fade-in space-y-6">
          {reading && (
            <p className="italic text-gray-300 mb-4">{reading}</p>
          )}
          {sections.map((section: FeedbackSectionView, idx: number) => (
            <div key={section.id || idx} className="mb-6 p-4 border-l-4 border-accent-cyan bg-retro-darker/50 rounded-r-lg">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-xl">{section.icon}</span>
                <h3 className="font-bold text-white">{section.label}</h3>
              </div>
              <div className="ml-6 prose prose-invert max-w-none">
                <ReactMarkdown
                  remarkPlugins={[remarkGfm]}
                  components={{
                    code: FeedbackCodeComponent,
                  }}
                >
                  {section.content}
                </ReactMarkdown>
              </div>
            </div>
          ))}
          {challenge && (
            <div className="mb-6 p-4 border-l-4 border-accent-magenta bg-retro-darker/50 rounded-r-lg">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-xl">🎯</span>
                <h3 className="font-bold text-white">Your Challenge</h3>
              </div>
              <p className="ml-6 text-gray-200">{challenge}</p>
            </div>
          )}
          {closing && (
            <div className="text-center text-sm text-gray-400 mt-6 pt-4 border-t border-retro-border">
              {closing}
            </div>
          )}
        </div>
      )}

      {/* Initial State */}
      {!error && !isStreaming && !hasContent && (
        <div className="flex flex-col items-center justify-center h-96 text-center text-gray-400">
          {mentorIcon && <div className="text-6xl mb-4">{mentorIcon}</div>}
          <h3 className="text-xl font-semibold text-white mb-2">Ready for Your Code</h3>
          <p className="max-w-md">
            Paste your Python code above and click &ldquo;Get Feedback&rdquo; to receive personalized guidance from {mentorName.split(' ')[0]}.
          </p>
        </div>
      )}
    </div>
  );
}

export default FeedbackRenderer;