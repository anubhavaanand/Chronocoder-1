import { MentorCard } from "@/components/mentor/MentorCard";
import { HeroGLTarget, ScrollIndicator } from "@/components/mentor/HeroDistortion";
import WebGLBackgroundWrapper from "@/components/ui/WebGLBackgroundWrapper";
import { ScrollProgressTracker } from "@/components/ui/ScrollProgressTracker";
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
    <>
      {/*
        WebGL canvas: position fixed, z-index:0, pointer-events:none.
        It discovers all [data-gl-src] elements in the DOM and creates
        Three.js planes at their positions — scroll-velocity bend,
        simplex-noise cursor ripple, and film grain applied.
      */}
      <WebGLBackgroundWrapper />

      {/* ── Scroll progress track (from gallery) ───────────────────── */}
      <div
        className="hidden lg:block"
        data-od-id="scroll-track"
        aria-hidden="true"
        style={{
          position: "fixed",
          right: "2rem",
          top: "50%",
          transform: "translateY(-50%)",
          zIndex: 10,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: "6px",
        }}
      >
        <div
          className="relative overflow-hidden"
          style={{
            width: "1px",
            height: "120px",
            background: "var(--border-hi)",
            borderRadius: "1px",
          }}
        >
          <div
            id="trackFill"
            style={{
              position: "absolute",
              top: 0,
              left: 0,
              width: "100%",
              height: "0%",
              background: "var(--accent)",
              transition: "height 60ms linear",
              borderRadius: "1px",
            }}
          />
        </div>
        <span
          style={{
            fontFamily: "var(--font-mono)",
            fontSize: "9px",
            letterSpacing: "0.2em",
            textTransform: "uppercase",
            color: "var(--muted)",
            writingMode: "vertical-lr",
            transform: "rotate(180deg)",
            marginTop: "8px",
          }}
        >
          Scroll
        </span>
      </div>

      <main
        className="relative min-h-screen flex flex-col"
        style={{ isolation: "isolate" }}
      >

        {/* ── Header ──────────────────────────────────────────────── */}
        <header
          data-od-id="site-header"
          className="glass-header sticky top-0 z-50 px-6 py-4"
        >
          <div className="container mx-auto flex items-center justify-between max-w-7xl">
            <div className="flex items-center gap-3">
              {/* Live indicator */}
              <span
                className="inline-block w-1.5 h-1.5 rounded-full bg-[oklch(72%_0.18_165)] animate-pulse-glow"
                aria-hidden="true"
              />
              <span
                className="font-mono text-sm tracking-widest uppercase"
                style={{ color: "var(--fg-mid)", letterSpacing: "0.1em" }}
              >
                ChronoCoder
              </span>
            </div>
            <nav className="hidden md:flex items-center gap-8 text-sm">
              <a
                href="#mentors"
                style={{ color: "var(--fg-mid)" }}
                className="hover:text-[oklch(94%_0.006_265)] transition-colors duration-150"
              >
                Mentors
              </a>
              <a
                href="#features"
                style={{ color: "var(--fg-mid)" }}
                className="hover:text-[oklch(94%_0.006_265)] transition-colors duration-150"
              >
                How it works
              </a>
              <a
                href="https://github.com/anubhavanand/chronocoder-1"
                target="_blank"
                rel="noopener noreferrer"
                style={{ color: "var(--fg-mid)" }}
                className="hover:text-[oklch(94%_0.006_265)] transition-colors duration-150"
              >
                GitHub
              </a>
            </nav>
          </div>
        </header>

        {/* ── Hero Section ────────────────────────────────────────── */}
        <section
          data-od-id="hero"
          className="relative min-h-[70vh] flex items-center justify-center px-6 py-24 overflow-hidden"
          style={{ zIndex: 1 }}
        >
          {/* WebGL distortion target for hero background */}
          <HeroGLTarget />

          {/* Content */}
          <div className="relative z-10 text-center max-w-5xl mx-auto">

            {/* Title */}
            <h1
              data-od-id="hero-title"
              className="text-5xl md:text-7xl font-black mb-6 leading-[1.05]"
              style={{ fontFamily: "var(--font-display)", letterSpacing: "-0.04em" }}
            >
              Learn Python from{" "}
              <span className="gradient-text">Legends</span>
              <br />
              of Computing
            </h1>

            {/* Sub-heading */}
            <p
              className="text-lg md:text-xl mb-10 max-w-2xl mx-auto leading-relaxed"
              style={{ color: "var(--fg-mid)" }}
            >
              Get personalized code reviews from 8 legendary programmers who
              analyze your work through their unique historical lens and
              teaching philosophy.
            </p>

            {/* CTAs — one primary, one secondary */}
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link
                data-od-id="cta-primary"
                href="#mentors"
                className="px-8 py-4 rounded-xl bg-gradient-primary text-white font-semibold text-sm tracking-wide hover:shadow-neon transition-all duration-200 hover:-translate-y-0.5 active:translate-y-0"
              >
                Meet Your Mentors
              </Link>
              <Link
                href="#features"
                className="px-8 py-4 rounded-xl text-sm font-semibold transition-all duration-200"
                style={{
                  background: "oklch(14% 0.012 265 / 0.5)",
                  backdropFilter: "blur(12px)",
                  border: "1px solid oklch(100% 0 0 / 0.1)",
                  color: "var(--fg)",
                }}
              >
                How It Works
              </Link>
            </div>

          </div>

          {/* Scroll indicator (from gallery) */}
          <ScrollIndicator />
        </section>

        {/* ── Section Divider (from gallery) ───────────────────────── */}
        <div
          className="flex items-center gap-4 mx-auto max-w-7xl mb-16"
          style={{
            fontFamily: "var(--font-mono)",
            fontSize: "10px",
            letterSpacing: "0.2em",
            textTransform: "uppercase",
            color: "var(--muted)",
          }}
        >
          <span>Works</span>
          <span style={{ flex: 1, height: "1px", background: "var(--border)" }} />
          <span style={{ flex: 1, height: "1px", background: "var(--border)" }} />
        </div>

        {/* ── Mentors Gallery ─────────────────────────────────────── */}
        <section
          id="mentors"
          data-od-id="mentors-section"
          className="relative py-24 px-6"
          style={{ zIndex: 1 }}
        >
          <div className="container mx-auto max-w-7xl">

            {/* Section header */}
            <div className="text-center mb-16">
              <p
                className="font-mono text-xs tracking-[0.2em] uppercase mb-4"
                style={{ color: "oklch(72% 0.18 165)" }}
              >
                Select a Mentor
              </p>
              <h2
                className="text-4xl md:text-5xl font-black mb-4"
                style={{ fontFamily: "var(--font-display)", letterSpacing: "-0.035em" }}
              >
                Choose Your{" "}
                <span className="gradient-text">Guide</span>
              </h2>
              <p
                className="max-w-2xl mx-auto leading-relaxed"
                style={{ color: "var(--fg-mid)" }}
              >
                Each mentor represents a pivotal moment in computing history.
                Select one to begin receiving personalized feedback on your code.
              </p>
            </div>

            {/* Mentor Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
              {MENTORS.map((mentor, index) => (
                <MentorCard key={mentor.id} {...mentor} index={index} />
              ))}
            </div>
          </div>
        </section>

        {/* ── Section Divider (from gallery) ───────────────────────── */}
        <div
          className="flex items-center gap-4 mx-auto max-w-7xl mb-16"
          style={{
            fontFamily: "var(--font-mono)",
            fontSize: "10px",
            letterSpacing: "0.2em",
            textTransform: "uppercase",
            color: "var(--muted)",
          }}
        >
          <span>Features</span>
          <span style={{ flex: 1, height: "1px", background: "var(--border)" }} />
          <span style={{ flex: 1, height: "1px", background: "var(--border)" }} />
        </div>

        {/* ── Features Section ─────────────────────────────────────── */}
        <section
          id="features"
          data-od-id="features-section"
          className="relative py-24 px-6"
          style={{
            zIndex: 1,
            borderTop: "1px solid oklch(100% 0 0 / 0.06)",
          }}
        >
          <div className="container mx-auto max-w-7xl">

            <div className="text-center mb-16">
              <h2
                className="text-4xl font-black mb-4"
                style={{ fontFamily: "var(--font-display)", letterSpacing: "-0.03em" }}
              >
                Why ChronoCoder?
              </h2>
              <p style={{ color: "var(--fg-mid)" }}>
                Experience education like never before with AI-powered personalisation
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-5 max-w-6xl mx-auto">
              {[
                {
                  label: "01",
                  title: "Personalised Feedback",
                  description:
                    "Each mentor has a distinct teaching style, reviewing your code through their unique historical perspective and expertise.",
                },
                {
                  label: "02",
                  title: "Real-Time Analysis",
                  description:
                    "Instant code parsing and AI-generated feedback streamed directly to your screen with typewriter-style rendering.",
                },
                {
                  label: "03",
                  title: "AST-Based Insights",
                  description:
                    "Static analysis extracts functions, classes, variables, and complexity metrics to provide structural understanding.",
                },
                {
                  label: "04",
                  title: "Session Persistence",
                  description:
                    "Your learning journey is automatically saved across devices. Pick up exactly where you left off anytime.",
                },
                {
                  label: "05",
                  title: "Global Edge Access",
                  description:
                    "Deployed on edge networks for minimal latency. Perfect experience on desktop, tablet, and mobile devices.",
                },
                {
                  label: "06",
                  title: "Privacy First",
                  description:
                    "Your code stays private. Sessions are encrypted and optionally exportable for personal records.",
                },
              ].map((feature) => (
                <div
                  key={feature.label}
                  data-od-id={`feature-card-${feature.label}`}
                  className="glass-card p-6"
                >
                  <p
                    className="font-mono text-xs mb-4"
                    style={{ color: "oklch(72% 0.18 165 / 0.7)" }}
                  >
                    {feature.label}
                  </p>
                  <h3
                    className="text-lg font-bold mb-2"
                    style={{ color: "var(--fg)" }}
                  >
                    {feature.title}
                  </h3>
                  <p className="text-sm leading-relaxed" style={{ color: "var(--fg-mid)" }}>
                    {feature.description}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── Footer ───────────────────────────────────────────────── */}
        <footer
          data-od-id="site-footer"
          className="relative py-12 px-6"
          style={{
            zIndex: 1,
            borderTop: "1px solid oklch(100% 0 0 / 0.06)",
          }}
        >
          <div className="container mx-auto max-w-7xl text-center">
            <p
              className="text-sm mb-4"
              style={{ color: "var(--muted)" }}
            >
              Built by Anubhav · Next.js 16 + FastAPI + Google Gemini
            </p>
            <div className="flex items-center justify-center gap-6 text-sm">
              {["Documentation", "GitHub", "Privacy Policy"].map((link) => (
                <Link
                  key={link}
                  href="#"
                  className="transition-colors duration-150 hover:text-[oklch(72%_0.18_165)]"
                  style={{ color: "var(--muted)" }}
                >
                  {link}
                </Link>
              ))}
            </div>
          </div>
        </footer>

        {/* ── Scroll progress updater (from gallery) ───────────────── */}
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                const trackFill = document.getElementById('trackFill');
                function updateTrack() {
                  const max = document.documentElement.scrollHeight - window.innerHeight;
                  const pct = max > 0 ? (window.scrollY / max) * 100 : 0;
                  if (trackFill) trackFill.style.height = pct.toFixed(1) + '%';
                }
                window.addEventListener('scroll', updateTrack, { passive: true });
                updateTrack();
              })();
            `,
          }}
        />
      </main>
    </>
  );
}
