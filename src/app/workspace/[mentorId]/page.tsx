"use client";

import { useState, useEffect } from "react";
import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { ArrowLeft, Send, Download, Loader2, AlertCircle } from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import clsx from "clsx";

// Dynamically import Monaco Editor (client-side only)
const MonacoEditor = dynamic(
  () => import("@monaco-editor/react"),
  { 
    ssr: false,
    loading: () => (
      <div className="animate-pulse h-96 bg-retro-darker rounded-lg border border-retro-border" />
    )
  }
);

interface Mentor {
  id: string;
  name: string;
  era: string;
  icon: string;
  greeting: string;
  accentColor: string;
  expertise: string;
}

const MENTORS: Record<string, Mentor> = {
  ada_lovelace: {
    id: "ada_lovelace",
    name: "Ada Lovelace",
    era: "London, 1843",
    icon: "🔮",
    greeting: "The Analytical Engine weaves algebraic patterns, just as the Jacquard loom weaves flowers.",
    accentColor: "#c08585",
    expertise: "Algorithmic elegance & mathematical vision",
  },
  linus_torvalds: {
    id: "linus_torvalds",
    name: "Linus Torvalds",
    era: "Helsinki, 1991",
    icon: "🐧",
    greeting: "Talk is cheap. Show me the code.",
    accentColor: "#e0a458",
    expertise: "Performance, structure & practical solutions",
  },
  grace_hopper: {
    id: "grace_hopper",
    name: "Grace Hopper",
    era: "Harvard, 1947",
    icon: "💻",
    greeting: "It's easier to ask forgiveness than it is to get permission.",
    accentColor: "#7492ad",
    expertise: "Debugging, clarity & systematic thinking",
  },
  alan_turing: {
    id: "alan_turing",
    name: "Alan Turing",
    era: "Milton Keynes, 1941",
    icon: "🧠",
    greeting: "We can only see a short distance ahead, but we can see plenty there that needs to be done.",
    accentColor: "#a3a380",
    expertise: "Computational theory & logical precision",
  },
  margaret_hamilton: {
    id: "margaret_hamilton",
    name: "Margaret Hamilton",
    era: "MIT Apollo 11, 1969",
    icon: "🚀",
    greeting: "I began to realize that the software was not getting the respect it deserved.",
    accentColor: "#c4696f",
    expertise: "Reliability, safety & mission-critical systems",
  },
  dennis_ritchie: {
    id: "dennis_ritchie",
    name: "Dennis Ritchie",
    era: "Murray Hill, 1973",
    icon: "⚡",
    greeting: "Unix is simple. It just takes a genius to understand its simplicity.",
    accentColor: "#9aa5ad",
    expertise: "Minimalism, portability & foundational design",
  },
  barbara_liskov: {
    id: "barbara_liskov",
    name: "Barbara Liskov",
    era: "MIT, 1987",
    icon: "🏛️",
    greeting: "What is wanted is that objects should be substitutable for one another without breaking the program.",
    accentColor: "#6f87c4",
    expertise: "Abstraction principles & software design",
  },
  guido_van_rossum: {
    id: "guido_van_rossum",
    name: "Guido van Rossum",
    era: "CWI Amsterdam, 1990",
    icon: "🐍",
    greeting: "Code is read much more often than it is written.",
    accentColor: "#d9b64e",
    expertise: "Readability, elegance & Pythonic style",
  },
};

export default function WorkspacePage({ params }: { params: { mentorId: string } }) {
  const router = useRouter();
  const { mentorId } = params;
  
  // Get mentor data
  const mentor = MENTORS[mentorId] || MENTORS.ada_lovelace;
  
  // State
  const [userCode, setUserCode] = useState(`# Write your Python code here
def fibonacci(n):
    """Calculate Fibonacci sequence"""
    if n <= 0:
        return []
    elif n == 1:
        return [0]
    
    seq = [0, 1]
    for i in range(2, n):
        seq.append(seq[i-1] + seq[i-2])
    return seq

# Test it
print(fibonacci(10))`);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [feedback, setFeedback] = useState("");
  const [analysis, setAnalysis] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [tokenCount, setTokenCount] = useState(0);
  
  // Character count and complexity calculation
  const characterCount = userCode.length;
  const getComplexity = () => {
    if (!characterCount) return "None";
    if (characterCount < 100) return { label: "Simple", class: "text-accent-green" };
    if (characterCount < 500) return { label: "Medium", class: "text-accent-amber" };
    return { label: "Complex", class: "text-accent-magenta" };
  };
  const complexity = getComplexity();
  
  // Simulate code analysis (in production, call actual API)
  const analyzeCodeLocally = (code: string) => {
    const lines = code.split("\n");
    const functions = (code.match(/def \w+\(/g) || []).length;
    const classes = (code.match(/class \w+\(/g) || []).length;
    const imports = (code.match(/^import|^from/gm) || []).length;
    const complexityScore = Math.min(Math.floor((functions + classes) * 2 + lines.length / 10), 10);
    
    return {
      line_count: lines.length,
      functions: functions,
      classes: classes,
      imports: imports,
      complexity_score: complexityScore,
      estimated_tokens: Math.ceil(code.length / 4)
    };
  };
  
  // Simulate AI feedback streaming (in production, SSE/WebSocket)
  const simulateStreamingFeedback = async (code: string) => {
    setIsAnalyzing(true);
    setError(null);
    setFeedback("");
    
    try {
      // Step 1: Analyze code locally
      const localAnalysis = analyzeCodeLocally(code);
      setAnalysis(localAnalysis);
      
      // Step 2: Simulate streaming tokens
      const mockResponses: Record<string, string[]> = {
        ada_lovelace: [
          "Your code demonstrates elegant structural beauty,",
          "much like the intricate patterns woven by the Jacquard loom.",
          "",
          "**Strengths:**",
          "• The recursive foundation shows clear mathematical thinking",
          "• Documentation follows the poetic tradition of clarity",
          "",
          "**Areas for Enhancement:**",
          "• Consider implementing memoization for computational efficiency:",
          "```python",
          "from functools import lru_cache",
          "",
          "@lru_cache(maxsize=None)",
          "def fibonacci(n):",
          "    # Your implementation...",
          "```",
          "",
          "This would allow the Analytical Engine to reuse previously calculated results,",
          "saving precious resources for more complex computations."
        ],
        linus_torvalds: [
          "The code works, but let's talk about performance.",
          "",
          "**What's Good:**",
          "- It's functional. Bare minimum met.",
          "",
          "**What Needs Fixing:**",
          "- O(n) time complexity when you could have O(1) space with iteration",
          "- No caching - redundant calculations wasting CPU cycles",
          "- Type hints missing. I don't want to guess what this accepts",
          "",
          "Here's how it should be done:",
          "```python",
          "def fibonacci(n: int) -> list[int]:",
          "    if n <= 0: return []",
          "    if n == 1: return [0]",
          "",
          "    seq = [0, 1]",
          "    for _ in range(2, n):",
          "        seq.append(seq[-1] + seq[-2])",
          "    return seq",
          "```",
          "",
          "Clean, fast, no nonsense."
        ],
        grace_hopper: [
          "Good start! Let me walk through this systematically.",
          "",
          "**Code Review Breakdown:**",
          "",
          "✓ **Positive Observations:**",
          "  - Clear function naming convention",
          "  - Docstring present (excellent habit!) 👍",
          "  - Base cases handled appropriately",
          "",
          "⚠ **Suggestions for Improvement:**",
          "",
          "  1. **Edge Case Handling** - What if someone passes a negative number?",
          "     Currently returns empty list, which is correct, but let's make it explicit:",
          "     `if n < 0: raise ValueError(\"n must be non-negative\")`",
          "",
          "  2. **Type Safety** - Adding type hints helps prevent errors:",
          "     `def fibonacci(n: int) -> list[int]:`",
          "",
          "  3. **Space Efficiency** - Iterative approach is better than recursion for this problem.",
          "     Recursion has overhead; iteration uses constant stack space.",
          "",
          "Remember: A bug found early is a feature waiting to be fixed!",
          ""
        ],
        alan_turing: [
          "Fascinating exploration of algorithmic thought.",
          "",
          "Your implementation raises questions about computational limits:",
          "",
          "1. **Termination Conditions** - How do we know this always halts?",
          "   The base cases provide guarantees, which aligns with my thoughts on decision problems.",
          "",
          "2. **Computational Complexity** - Can we construct a more efficient machine?",
          "   Consider whether memoization represents a form of 'memory' in the abstract sense.",
          "",
          "3. **Mathematical Beauty** - The recursive definition mirrors the mathematical recurrence relation perfectly.",
          "",
          "**Alternative Perspective:**",
          "Could this computation be performed by a simpler mechanism? Perhaps an iterative automaton would suffice...",
          ""
        ]
      };
      
      // Default response for other mentors
      const responses = mockResponses[mentorId] || mockResponses.ada_lovelace;
      let cumulativeText = "";
      
      // Stream tokens with realistic delays
      for (let i = 0; i < responses.length; i++) {
        await new Promise(resolve => setTimeout(resolve, 50 + Math.random() * 100));
        cumulativeText += responses[i] + "\n";
        setFeedback(cumulativeText);
        setTokenCount(i + 1);
      }
      
    } catch (err) {
      setError(err instanceof Error ? err.message : "An unexpected error occurred");
    } finally {
      setIsAnalyzing(false);
    }
  };
  
  // Handle submission
  const handleSubmit = () => {
    if (!userCode.trim()) {
      setError("Please enter some code to analyze");
      return;
    }
    
    simulateStreamingFeedback(userCode);
  };
  
  // Handle export
  const handleExport = () => {
    if (!feedback) return;
    
    const content = `## ChronoCoder Session Export\n\n**Mentor:** ${mentor.name}\n**Date:** ${new Date().toISOString()}\n\n### Your Code\n\`\`\`python
${userCode}
\`\`\`\n\n### ${mentor.name}'s Feedback\n\n${feedback}\n\n---\nGenerated by ChronoCoder v3.0`;
    
    const blob = new Blob([content], { type: "text/markdown" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `chronoCoder_${mentor.id}_${Date.now()}.md`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };
  
  // Keyboard shortcut (Ctrl/Cmd + Enter)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "Enter") {
        e.preventDefault();
        handleSubmit();
      }
    };
    
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [userCode]);
  
  return (
    <div className="min-h-screen flex flex-col">
      {/* Header */}
      <header className="sticky top-0 z-50 backdrop-blur-md bg-retro-darker/80 border-b border-retro-border">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <button
            onClick={() => router.push("/")}
            className="flex items-center space-x-2 text-gray-400 hover:text-white transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
            <span>Back to Archive</span>
          </button>
          
          <div className="flex items-center space-x-4">
            {mentor.icon && <span className="text-2xl">{mentor.icon}</span>}
            <div className="hidden md:block">
              <h1 className="text-lg font-bold">{mentor.name}</h1>
              <p className="text-xs text-gray-400">{mentor.era}</p>
            </div>
          </div>
          
          <div className="flex items-center space-x-3">
            {feedback && (
              <button
                onClick={handleExport}
                disabled={!feedback}
                className="flex items-center space-x-2 px-4 py-2 glass-effect rounded-lg hover:bg-white/10 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Download className="w-4 h-4" />
                <span>Export</span>
              </button>
            )}
            <button
              onClick={handleSubmit}
              disabled={isAnalyzing || !userCode.trim()}
              className="flex items-center space-x-2 px-6 py-2 bg-gradient-primary text-white font-semibold rounded-lg hover:shadow-neon transition-all disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:shadow-none"
            >
              {isAnalyzing ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Analyzing...</span>
                </>
              ) : (
                <>
                  <Send className="w-4 h-4" />
                  <span>Get Feedback</span>
                </>
              )}
            </button>
          </div>
        </div>
      </header>
      
      {/* Main Content */}
      <main className="flex-1 container mx-auto px-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Left Column: Code Editor */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-bold">Your Code</h2>
              <div className="flex items-center space-x-3 text-sm">
                <span className="text-gray-400">{characterCount.toLocaleString()} characters</span>
                {characterCount > 0 && (
                  <span className={clsx("font-semibold", complexity.class)}>
                    {complexity.label}
                  </span>
                )}
              </div>
            </div>
            
            <div className="glass-effect rounded-lg p-4 border border-retro-border">
              <MonacoEditor
                height="600px"
                language="python"
                theme="vs-dark"
                value={userCode}
                onChange={(val) => setUserCode(val || "")}
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
                }}
                onMount={() => {}}
              />
              
              <div className="mt-2 text-xs text-gray-500 text-right">
                Ctrl/Cmd + Enter to submit
              </div>
            </div>
            
            {/* Local Analysis Results */}
            {analysis && (
              <div className="glass-effect rounded-lg p-6 border border-retro-border">
                <h3 className="text-lg font-semibold mb-4">Static Analysis</h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {[
                    { label: "Lines", value: analysis.line_count?.toLocaleString() || 0 },
                    { label: "Functions", value: analysis.functions || 0 },
                    { label: "Classes", value: analysis.classes || 0 },
                    { label: "Imports", value: analysis.imports || 0 },
                  ].map((stat) => (
                    <div key={stat.label} className="text-center">
                      <div className="text-2xl font-bold text-accent-cyan">
                        {stat.value}
                      </div>
                      <div className="text-xs text-gray-400">{stat.label}</div>
                    </div>
                  ))}
                  
                  {/* Complexity Score Badge */}
                  {analysis.complexity_score && (
                    <div className="col-span-2 md:col-span-4 mt-4 pt-4 border-t border-retro-border">
                      <div className="flex items-center justify-center space-x-3">
                        <span className="text-sm text-gray-400">Complexity Score:</span>
                        <div className="relative">
                          <div className="w-48 h-2 bg-retro-dark rounded-full overflow-hidden">
                            <div
                              className="absolute inset-y-0 left-0 bg-gradient-primary rounded-full"
                              style={{ width: `${(analysis.complexity_score / 10) * 100}%` }}
                            />
                          </div>
                          <div className="absolute inset-0 flex items-center justify-center text-xs font-bold text-white">
                            {analysis.complexity_score}/10
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
          
          {/* Right Column: Feedback Display */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-bold">{mentor.name}'s Analysis</h2>
              {isAnalyzing && (
                <div className="flex items-center space-x-2 text-sm text-accent-cyan animate-pulse">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Receiving feedback...</span>
                </div>
              )}
            </div>
            
            <div className="glass-effect rounded-lg p-6 border border-retro-border min-h-[600px]">
              {/* Error State */}
              {error && (
                <div className="text-red-400 bg-red-400/10 border border-red-400/30 p-4 rounded-lg">
                  <div className="flex items-start space-x-3">
                    <AlertError className="w-5 h-5 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="font-semibold">Error:</p>
                      <p className="text-sm">{error}</p>
                      <button
                        onClick={() => {
                          setError(null);
                          setFeedback("");
                        }}
                        className="mt-2 px-4 py-2 bg-red-400/20 hover:bg-red-400/30 text-red-300 rounded transition-colors"
                      >
                        Try Again
                      </button>
                    </div>
                  </div>
                </div>
              )}
              
              {/* Loading State */}
              {!error && isAnalyzing && !feedback && (
                <div className="flex flex-col items-center justify-center h-96 space-y-4">
                  <Loader2 className="w-12 h-12 text-accent-cyan animate-spin" />
                  <p className="text-gray-400">Generating personalized feedback...</p>
                </div>
              )}
              
              {/* Streaming Feedback */}
              {!error && feedback && (
                <div className="animate-fade-in">
                  <ReactMarkdown
                    remarkPlugins={[remarkGfm]}
                    components={{
                      p: ({ children }) => (
                        <p className="mb-3 last:mb-0 text-gray-200 leading-relaxed">{children}</p>
                      ),
                      h1: ({ children }) => (
                        <h1 className="text-2xl font-bold text-white mb-4">{children}</h1>
                      ),
                      h2: ({ children }) => (
                        <h2 className="text-xl font-semibold text-white mb-3">{children}</h2>
                      ),
                      h3: ({ children }) => (
                        <h3 className="text-lg font-semibold text-white mb-2">{children}</h3>
                      ),
                      blockquote: ({ children }) => (
                        <blockquote className="border-l-4 border-accent-magenta pl-4 italic text-gray-300 my-3">
                          {children}
                        </blockquote>
                      ),
                      code: ({ children, inline, className }) => {
                        const match = /language-(\w+)/.exec(className || "");
                        return !inline && match ? (
                          <pre className="bg-retro-darker p-4 rounded-lg overflow-x-auto my-3 border border-retro-border">
                            <code className={match[1]}>{children}</code>
                          </pre>
                        ) : (
                          <code className="bg-retro-panel px-1.5 py-0.5 rounded text-accent-cyan font-mono text-sm">
                            {children}
                          </code>
                        );
                      },
                      ul: ({ children }) => (
                        <ul className="list-disc list-inside space-y-1 mb-3 text-gray-200">
                          {children}
                        </ul>
                      ),
                      li: ({ children }) => (
                        <li className="ml-4">{children}</li>
                      ),
                    }}
                  >
                    {feedback}
                  </ReactMarkdown>
                </div>
              )}
              
              {/* Initial State */}
              {!error && !isAnalyzing && !feedback && (
                <div className="flex flex-col items-center justify-center h-96 text-center text-gray-400">
                  <div className="text-6xl mb-4">{mentor.icon}</div>
                  <h3 className="text-xl font-semibold text-white mb-2">Ready for Your Code</h3>
                  <p className="max-w-md">
                    Paste your Python code above and click "Get Feedback" to receive personalized guidance from {mentor.name.split()[0]}.
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
