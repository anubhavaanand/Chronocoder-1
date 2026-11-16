"use client";

import { useEffect } from "react";
import dynamic from "next/dynamic";
import clsx from "clsx";

export const DEFAULT_EDITOR_HEIGHT = "clamp(360px, 60vh, 600px)";

export function MonacoLoadingPlaceholder({ height = DEFAULT_EDITOR_HEIGHT }: { height?: string }) {
  return (
    <div
      data-testid="monaco-loading-placeholder"
      className="animate-pulse bg-retro-darker rounded-lg border border-retro-border"
      style={{ height }}
    />
  );
}

// Dynamically import Monaco Editor (client-side only)
const MonacoEditor = dynamic(
  () => import("@monaco-editor/react"),
  {
    ssr: false,
    loading: () => <MonacoLoadingPlaceholder height={DEFAULT_EDITOR_HEIGHT} />
  }
);

export interface ComplexityInfo {
  label: "Simple" | "Medium" | "Complex";
  className: string;
}

/**
 * Character-count based complexity heuristic shared by the workspace header.
 * Returns null when there is no code yet.
 */
export function getComplexity(characterCount: number): ComplexityInfo | null {
  if (characterCount <= 0) return null;
  if (characterCount < 100) return { label: "Simple", className: "text-accent-green" };
  if (characterCount < 500) return { label: "Medium", className: "text-accent-amber" };
  return { label: "Complex", className: "text-accent-magenta" };
}

export interface CodeEditorProps {
  value: string;
  onChange: (value: string) => void;
  /** Fired on Ctrl/Cmd + Enter. Omit to disable the shortcut. */
  onSubmit?: () => void;
  language?: string;
  height?: string;
  theme?: string;
  readOnly?: boolean;
  characterLimit?: number;
  errorText?: string | null;
}

export function CodeEditor({
  value,
  onChange,
  onSubmit,
  language = "python",
  height = DEFAULT_EDITOR_HEIGHT,
  theme = "vs-dark",
  readOnly = false,
  characterLimit,
  errorText,
}: CodeEditorProps) {
  const characterCount = value.length;
  const complexity = getComplexity(characterCount);
  const overLimit = characterLimit != null && characterCount > characterLimit;
  const hasError = Boolean(errorText) || overLimit;

  // Ctrl/Cmd + Enter submits from anywhere on the page.
  useEffect(() => {
    if (!onSubmit) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "Enter") {
        e.preventDefault();
        onSubmit();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onSubmit]);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold">Your Code</h2>
        <div className="flex items-center space-x-3 text-sm">
          <span
            data-testid="character-count"
            className={clsx(overLimit ? "text-red-400" : "text-gray-400")}
          >
            {characterCount.toLocaleString()} characters
          </span>
          {complexity && (
            <span className={clsx("font-semibold", complexity.className)}>
              {complexity.label}
            </span>
          )}
        </div>
      </div>

      <div
        className={clsx(
          "glass-effect rounded-lg p-4 border",
          hasError ? "border-red-400/50" : "border-retro-border"
        )}
      >
        <MonacoEditor
          height={height}
          language={language}
          theme={theme}
          value={value}
          onChange={(val) => onChange(val || "")}
          options={{
            minimap: { enabled: false },
            fontSize: 14,
            lineHeight: 1.5,
            tabSize: 2,
            wordWrap: "on",
            automaticLayout: true,
            scrollBeyondLastLine: false,
            renderWhitespace: "selection",
            cursorBlinking: "smooth",
            smoothScrolling: true,
            suggest: { showKeywords: true },
            readOnly,
            scrollbar: {
              alwaysConsumeMouseWheel: false,
            },
          }}
          onMount={() => {}}
        />

        {errorText ? (
          <p data-testid="editor-error" className="mt-2 text-xs text-red-400">
            {errorText}
          </p>
        ) : overLimit ? (
          <p data-testid="editor-error" className="mt-2 text-xs text-red-400">
            Code exceeds the {characterLimit!.toLocaleString()}-character limit.
          </p>
        ) : (
          <div className="mt-2 text-xs text-gray-500 text-right">
            Ctrl/Cmd + Enter to submit
          </div>
        )}
      </div>
    </div>
  );
}

export default CodeEditor;