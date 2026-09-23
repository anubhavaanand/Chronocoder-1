import { MentorCard } from "@/components/mentor/MentorCard";
import Link from "next/link";

interface Mentor {
  id: string;
  name: string;
  era: string;
  icon: string;
  greeting: string;
  accentColor: string;
  expertise: string;
}

// Hardcoded mentor data (in production, fetch from API)
const MENTORS: Mentor[] = [
  {
    id: "ada_lovelace",
    name: "Ada Lovelace",
    era: "London, 1843",
    icon: "🔮",
    greeting: "The Analytical Engine weaves algebraic patterns, just as the Jacquard loom weaves flowers.",
    accentColor: "#c08585",
    expertise: "Algorithmic elegance & mathematical vision",
  },
  {
    id: "linus_torvalds",
    name: "Linus Torvalds",
    era: "Helsinki, 1991",
    icon: "🐧",
    greeting: "Talk is cheap. Show me the code.",
    accentColor: "#e0a458",
    expertise: "Performance, structure & practical solutions",
  },
  {
    id: "grace_hopper",
    name: "Grace Hopper",
    era: "Harvard, 1947",
    icon: "💻",
    greeting: "It's easier to ask forgiveness than it is to get permission.",
    accentColor: "#7492ad",
    expertise: "Debugging, clarity & systematic thinking",
  },
  {
    id: "alan_turing",
    name: "Alan Turing",
    era: "Milton Keynes, 1941",
    icon: "🧠",
    greeting: "We can only see a short distance ahead, but we can see plenty there that needs to be done.",
    accentColor: "#a3a380",
    expertise: "Computational theory & logical precision",
  },
  {
    id: "margaret_hamilton",
    name: "Margaret Hamilton",
    era: "MIT Apollo 11, 1969",
    icon: "🚀",
    greeting: "I began to realize that the software was not getting the respect it deserved.",
    accentColor: "#c4696f",
    expertise: "Reliability, safety & mission-critical systems",
  },
  {
    id: "dennis_ritchie",
    name: "Dennis Ritchie",
    era: "Murray Hill, 1973",
    icon: "⚡",
    greeting: "Unix is simple. It just takes a genius to understand its simplicity.",
    accentColor: "#9aa5ad",
    expertise: "Minimalism, portability & foundational design",
  },
  {
    id: "barbara_liskov",
    name: "Barbara Liskov",
    era: "MIT, 1987",
    icon: "🏛️",
    greeting: "What is wanted is that objects should be substitutable for one another without breaking the program.",
    accentColor: "#6f87c4",
    expertise: "Abstraction principles & software design",
  },
  {
    id: "guido_van_rossum",
    name: "Guido van Rossum",
    era: "CWI Amsterdam, 1990",
    icon: "🐍",
    greeting: "Code is read much more often than it is written.",
    accentColor: "#d9b64e",
    expertise: "Readability, elegance & Pythonic style",
  },
];

export default function Home() {
  return (
    <main className="min-h-screen flex flex-col">
      {/* Hero Section */}
      <section className="relative min-h-[60vh] flex items-center justify-center px-4 py-20 overflow-hidden">
        {/* Background Gradients */}
        <div className="absolute inset-0 bg-gradient-to-b from-retro-darker via-retro-panel to-retro-darker" />
        
        {/* Animated Gradient Orbs */}
        <div 
          className="absolute top-1/4 left-1/4 w-96 h-96 rounded-full blur-3xl opacity-20 animate-float"
          style={{ background: `radial-gradient(circle, var(--accent-cyan) 0%, transparent 70%)` }}
        />
        <div 
          className="absolute bottom-1/4 right-1/4 w-80 h-80 rounded-full blur-3xl opacity-15 animate-float"
          style={{ 
            background: `radial-gradient(circle, var(--accent-magenta) 0%, transparent 70%)`,
            animationDelay: "2s" 
          }}
        />
        
        {/* Content */}
        <div className="relative z-10 text-center max-w-5xl mx-auto">
          {/* Badge */}
          <div className="inline-flex items-center space-x-2 mb-6 px-4 py-2 glass-effect rounded-full animate-shimmer">
            <span className="w-2 h-2 bg-accent-green rounded-full animate-pulse" />
            <span className="text-sm font-mono text-gray-300">v3.0 Production Ready</span>
          </div>
          
          {/* Title */}
          <h1 className="text-5xl md:text-7xl font-bold mb-6 leading-tight">
            Learn Python from{" "}
            <span className="gradient-text">Legends</span>{" "}
            of Computing
          </h1>
          
          {/* Description */}
          <p className="text-xl text-gray-400 mb-8 max-w-2xl mx-auto leading-relaxed">
            Get personalized code reviews from 8 legendary programmers who analyze your work through their unique historical lens and teaching philosophy.
          </p>
          
          {/* CTA Buttons */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link
              href="#mentors"
              className="px-8 py-4 bg-gradient-primary text-white font-semibold rounded-lg hover:shadow-neon transition-all duration-300 transform hover:-translate-y-1"
            >
              Meet Your Mentors
            </Link>
            <Link
              href="#features"
              className="px-8 py-4 glass-effect text-white font-semibold rounded-lg hover:bg-white/10 transition-all duration-300"
            >
              How It Works
            </Link>
          </div>
        </div>
        
        {/* Scroll Indicator */}
        <div className="absolute bottom-8 left-1/2 transform -translate-x-1/2 animate-bounce">
          <svg 
            className="w-6 h-6 text-gray-500" 
            fill="none" 
            stroke="currentColor" 
            viewBox="0 0 24 24"
          >
            <path 
              strokeLinecap="round" 
              strokeLinejoin="round" 
              strokeWidth={2} 
              d="M19 14l-7 7m0 0l-7-7m7 7V3" 
            />
          </svg>
        </div>
      </section>

      {/* Mentors Gallery */}
      <section id="mentors" className="py-20 px-4 bg-retro-dark">
        <div className="container mx-auto">
          {/* Section Header */}
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-bold mb-4">
              Choose Your{" "}
              <span className="text-accent-cyan">Mentor</span>
            </h2>
            <p className="text-gray-400 max-w-2xl mx-auto">
              Each mentor represents a pivotal moment in computing history. Select one to begin receiving personalized feedback on your code.
            </p>
          </div>
          
          {/* Mentor Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {MENTORS.map((mentor) => (
              <MentorCard key={mentor.id} {...mentor} />
            ))}
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-20 px-4 bg-retro-panel border-t border-retro-border">
        <div className="container mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold mb-4">Why ChronoCoder?</h2>
            <p className="text-gray-400">
              Experience education like never before with AI-powered personalization
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-6xl mx-auto">
            {[
              {
                icon: "🎯",
                title: "Personalized Feedback",
                description: "Each mentor has a distinct teaching style, reviewing your code through their unique historical perspective and expertise."
              },
              {
                icon: "⚡",
                title: "Real-Time Analysis",
                description: "Instant code parsing and AI-generated feedback streamed directly to your screen with typewriter-style rendering."
              },
              {
                icon: "📊",
                title: "AST-Based Insights",
                description: "Static analysis extracts functions, classes, variables, and complexity metrics to provide structural understanding."
              },
              {
                icon: "🔄",
                title: "Session Persistence",
                description: "Your learning journey is automatically saved across devices. Pick up exactly where you left off anytime."
              },
              {
                icon: "🌍",
                title: "Global Access",
                description: "Deployed on edge networks for minimal latency. Perfect experience on desktop, tablet, and mobile devices."
              },
              {
                icon: "🔒",
                title: "Privacy First",
                description: "Your code stays private. Sessions are encrypted and optionally exportable for personal records."
              }
            ].map((feature, index) => (
              <div
                key={index}
                className="glass-effect p-6 rounded-xl hover:-translate-y-1 transition-transform duration-300"
              >
                <div className="text-4xl mb-4">{feature.icon}</div>
                <h3 className="text-xl font-bold mb-2">{feature.title}</h3>
                <p className="text-gray-400">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 px-4 bg-retro-darker border-t border-retro-border">
        <div className="container mx-auto text-center">
          <p className="text-gray-500 mb-4">
            Built with ❤️ by Anubhav | Powered by Next.js 16 + FastAPI + Google Gemini
          </p>
          <div className="flex items-center justify-center space-x-6 text-sm text-gray-500">
            <Link href="#" className="hover:text-accent-cyan transition-colors">Documentation</Link>
            <Link href="#" className="hover:text-accent-cyan transition-colors">GitHub</Link>
            <Link href="#" className="hover:text-accent-cyan transition-colors">Privacy Policy</Link>
          </div>
        </div>
      </footer>
    </main>
  );
}
