"use client";

import { useState, useEffect, useRef, useMemo } from "react";
import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { ArrowLeft, Send, Download, Loader2, AlertCircle } from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import clsx from "clsx";
import { SearchBarSection } from "@/components/ui/SearchBarSection";
import { useMentorWebSocket } from "@/hooks/useMentorWebSocket";

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
  const [analysis, setAnalysis] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [hasSubmitted, setHasSubmitted] = useState(false);
  const [activeTab, setActiveTab] = useState<"ask" | "review">("ask");
  
  // Character count and complexity calculation
  const characterCount = userCode.length;
  const getComplexity = () => {
    if (!characterCount) return "None";
    if (characterCount < 100) return { label: "Simple", class: "text-accent-green" };
    if (characterCount < 500) return { label: "Medium", class: "text-accent-amber" };
    return { label: "Complex", class: "text-accent-magenta" };
  };
  const complexity = getComplexity();
  
  // WebSocket feedback state
  const [feedbackSections, setFeedbackSections] = useState<any[]>([]);
  const [reading, setReading] = useState("");
  const [challenge, setChallenge] = useState("");
  const [closing, setClosing] = useState("");
  
  const sessionIdRef = useRef<string>(`session_${Date.now()}_${Math.random().toString(36).slice(2)}`);

  // Computed feedback content for export button visibility
  const feedbackContent = useMemo(() => [
    reading,
    ...feedbackSections.map((s: any) => `${s.label}: ${s.content}`),
    challenge,
    closing,
  ].filter(Boolean).join("\n\n"), [reading, feedbackSections, challenge, closing]);

  const {
    isConnected,
    isAnalyzing: wsIsAnalyzing,
    disconnect,
  } = useMentorWebSocket({
    mentorId,
    userCode,
    sessionId: sessionIdRef.current,
    onAnalysisComplete: (analysisData) => {
      setAnalysis(analysisData);
    },
    onFeedbackChunk: (chunk) => {
      if (chunk.reading) setReading(chunk.reading);
      if (chunk.sections) setFeedbackSections(chunk.sections);
      if (chunk.challenge) setChallenge(chunk.challenge);
      if (chunk.closing) setClosing(chunk.closing);
    },
    onFeedbackComplete: () => {
      persistSession();
    },
    onError: (err) => {
      setError(err);
      setIsAnalyzing(false);
    },
  });

  // Session persistence
  const persistSession = async () => {
    try {
      await fetch("/api/sessions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sessionId: sessionIdRef.current,
          mentorId,
          userCode,
          feedback: { reading, sections: feedbackSections, challenge, closing },
          analysis,
        }),
      });
    } catch (err) {
      console.warn("Failed to persist session:", err);
    }
  };

  // Handle submission
  const handleSubmit = () => {
    if (!userCode.trim()) {
      setError("Please enter some code to analyze");
      return;
    }
    setHasSubmitted(true);
    setActiveTab("ask");
    setReading("");
    setFeedbackSections([]);
    setChallenge("");
    setClosing("");
    setAnalysis(null);
    setError(null);
    setIsAnalyzing(true);
  };

  // Handle export
  const handleExport = () => {
    const feedbackContent = [
      reading,
      ...feedbackSections.map((s: any) => `${s.label}: ${s.content}`),
      challenge,
      closing,
    ].filter(Boolean).join("\n\n");
    
    if (!feedbackContent) return;
    
    const content = `## ChronoCoder Session Export\n\n**Mentor:** ${mentor.name}\n**Date:** ${new Date().toISOString()}\n\n### Your Code\n\`\`\`python
${userCode}
\`\`\`\n\n### ${mentor.name}'s Feedback\n\n${feedbackContent}\n\n---\nGenerated by ChronoCoder v3.0`;
    
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
            {feedbackContent && (
              <button
                onClick={handleExport}
                disabled={!feedbackContent}
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
        {!hasSubmitted ? (
          <div className="flex items-center justify-center min-h-[60vh]">
            <SearchBarSection className="max-w-[800px]" />
          </div>
        ) : (
          <>
            <div className="flex justify-center mb-8">
              <SearchBarSection className="max-w-[800px]" />
            </div>
            
            <div className="max-w-6xl mx-auto">
              {/* Tab headers */}
              <div className="flex space-x-1 mb-6 border-b border-retro-border">
                <button
                  onClick={() => setActiveTab("ask")}
                  className={clsx(
                    "pb-3 px-6 font-semibold transition-colors relative",
                    activeTab === "ask" ? "text-accent-cyan" : "text-gray-400 hover:text-gray-200"
                  )}
                >
                  Ask Question
                  {activeTab === "ask" && (
                    <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-accent-cyan" />
                  )}
                </button>
                <button
                  onClick={() => setActiveTab("review")}
                  className={clsx(
                    "pb-3 px-6 font-semibold transition-colors relative",
                    activeTab === "review" ? "text-accent-cyan" : "text-gray-400 hover:text-gray-200"
                  )}
                >
                  Code Review
                  {activeTab === "review" && (
                    <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-accent-cyan" />
                  )}
                </button>
              </div>

              {/* Ask Question Tab */}
              {activeTab === "ask" && (
                <div className="space-y-4">
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
                            <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
                            <div>
                              <p className="font-semibold">Error:</p>
                              <p className="text-sm">{error}</p>
                              <button
                                onClick={() => {
                                  setError(null);
                                  setReading("");
                                  setFeedbackSections([]);
                                  setChallenge("");
                                  setClosing("");
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
                      {!error && isAnalyzing && !reading && feedbackSections.length === 0 && !challenge && (
                        <div className="flex flex-col items-center justify-center h-96 space-y-4">
                          <Loader2 className="w-12 h-12 text-accent-cyan animate-spin" />
                          <p className="text-gray-400">Generating personalized feedback...</p>
                        </div>
                      )}
                      
                      {/* Streaming Feedback */}
                      {!error && (reading || feedbackSections.length > 0 || challenge) && (
                        <div className="animate-fade-in space-y-6">
                          {reading && (
                            <p className="italic text-gray-300 mb-4">{reading}</p>
                          )}
                          {feedbackSections.map((section: any, idx: number) => (
                            <div key={section.id || idx} className="mb-6 p-4 border-l-4 border-accent-cyan bg-retro-darker/50 rounded-r-lg">
                              <div className="flex items-center gap-2 mb-2">
                                <span className="text-xl">{section.icon}</span>
                                <h4 className="font-bold text-white">{section.label}</h4>
                              </div>
                              <div className="ml-6 prose prose-invert max-w-none">
                                <ReactMarkdown
                                  remarkPlugins={[remarkGfm]}
                                  components={{
                                    code: ({ children, className, inline, ...rest }: { children?: React.ReactNode; className?: string; inline?: boolean }) => {
                                      const match = className ? /language-(\w+)/.exec(className) : null;
                                      return !inline && match ? (
                                        <pre className="bg-retro-darker p-4 rounded-lg overflow-x-auto my-3 border border-retro-border">
                                          <code className={match[1]}>{children}</code>
                                        </pre>
                                      ) : (
                                        <code className="bg-retro-panel px-1.5 py-0.5 rounded text-accent-cyan font-mono text-sm" {...rest}>
                                          {children}
                                        </code>
                                      );
                                    },
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
                                <h4 className="font-bold text-white">Your Challenge</h4>
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
                      {!error && !isAnalyzing && !reading && feedbackSections.length === 0 && !challenge && (
                        <div className="flex flex-col items-center justify-center h-96 text-center text-gray-400">
                          <div className="text-6xl mb-4">{mentor.icon}</div>
                          <h3 className="text-xl font-semibold text-white mb-2">Ready for Your Code</h3>
                          <p className="max-w-md">
                            Paste your Python code above and click "Get Feedback" to receive personalized guidance from {mentor.name.split(' ')[0]}.
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* Code Review Tab */}
              {activeTab === "review" && (
                <div className="space-y-4">
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <h2 className="text-xl font-bold">Your Code</h2>
                      <div className="flex items-center space-x-3 text-sm">
                        <span className="text-gray-400">{characterCount.toLocaleString()} characters</span>
                        {characterCount > 0 && complexity !== "None" && (
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
                </div>
              )}
            </div>
          </>
        )}
      </main>
    </div>
  );
}
