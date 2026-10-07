"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { Search, ChevronRight } from "lucide-react";

export function SearchBar({ large, onQuerySubmit }: { large?: boolean; onQuerySubmit?: (query: string) => void }) {
  const [query, setQuery] = useState("");
  const [isFocused, setIsFocused] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim()) return;
    if (onQuerySubmit) {
      onQuerySubmit(query.trim());
    } else {
      router.push(`/workspace/ada_lovelace?query=${encodeURIComponent(query.trim())}`);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && query.trim()) {
      handleSubmit(e);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="w-full">
      <div
        className="relative flex items-center"
        style={{
          background: isFocused ? "oklch(12% 0.01 265 / 0.9)" : "oklch(10% 0.008 265 / 0.8)",
          border: isFocused ? "1px solid oklch(72% 0.18 165 / 0.5)" : "1px solid oklch(100% 0 0 / 0.1)",
          borderRadius: "16px",
          transition: "all 200ms ease",
          boxShadow: isFocused
            ? "0 0 0 1px oklch(72% 0.18 165 / 0.2), 0 8px 32px oklch(0% 0 0 / 0.5)"
            : "0 4px 24px oklch(0% 0 0 / 0.4)",
        }}
      >
        <div className="absolute left-5 flex items-center" aria-hidden="true">
          <Search
            className="w-5 h-5"
            style={{ color: isFocused ? "oklch(72% 0.18 165)" : "var(--muted)" }}
          />
        </div>
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          onKeyDown={handleKeyDown}
          placeholder={`Ask any mentor anything... Try "How do I optimize this recursive function?"`}
          className={`w-full px-14 py-4 pl-12 text-base ${large ? "py-5 text-lg" : ""}`}
          style={{
            background: "transparent",
            border: "none",
            outline: "none",
            color: "var(--fg)",
            fontFamily: "var(--font-sans)",
          }}
          autoComplete="off"
          spellCheck={false}
        />
        <div className="absolute right-4 flex items-center gap-2">
          {query && (
            <button
              type="button"
              onClick={() => {
                setQuery("");
                inputRef.current?.focus();
              }}
              className="p-1 rounded-lg hover:bg-white/5 transition-colors"
              aria-label="Clear search"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" style={{ color: "var(--muted)" }}>
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          )}
          <button
            type="submit"
            disabled={!query.trim()}
            className="flex items-center justify-center gap-2 px-5 py-2.5 rounded-lg font-semibold text-sm transition-all duration-200 disabled:opacity-40 disabled:cursor-not-allowed"
            style={{
              background: query.trim() ? "var(--gradient-primary)" : "oklch(100% 0 0 / 0.05)",
              color: query.trim() ? "white" : "var(--muted)",
              boxShadow: query.trim() ? "0 0 20px oklch(72% 0.18 165 / 0.4)" : "none",
            }}
          >
            <span className="hidden sm:inline">Ask</span>
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>
      <p className="mt-4 text-sm text-center" style={{ color: "var(--muted)" }}>
        Press <kbd className="px-1.5 py-0.5 rounded bg-white/5 border border-white/10 font-mono text-xs">⌘</kbd>{" "}+<kbd className="px-1.5 py-0.5 rounded bg-white/5 border border-white/10 font-mono text-xs">K</kbd> to focus · Works on any page
      </p>
    </form>
  );
}
