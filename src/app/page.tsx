import { MentorCard } from "@/components/mentor/MentorCard";
import { MentorJourney } from "@/components/mentor/MentorJourney";
import { HeroGLTarget, ScrollIndicator } from "@/components/mentor/HeroDistortion";
import WebGLBackgroundWrapper from "@/components/ui/WebGLBackgroundWrapper";
import { HeroSearch } from "@/components/ui/HeroSearch";
import { ScrollProgressTracker } from "@/components/ui/ScrollProgressTracker";
import { MENTORS } from "@/data/mentors";
import Link from "next/link";

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

      {/* Scroll progress fill (updates #trackFill on scroll) */}
      <ScrollProgressTracker />

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
          className="relative min-h-[80vh] flex items-center justify-center px-6 py-24 overflow-hidden"
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
              Choose a legend as your model — eight pioneering minds, each
              reviewing your Python through their own historical lens and
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

            {/* Glowing search bar */}
            <HeroSearch />
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

        {/* ── Mentors Gallery Journey ─────────────────────────────── */}
        <section
          id="mentors"
          data-od-id="mentors-section"
          className="relative py-10 px-6"
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
                A Century of{" "}
                <span className="gradient-text">Minds</span>
              </h2>
              <p
                className="max-w-2xl mx-auto leading-relaxed"
                style={{ color: "var(--fg-mid)" }}
              >
                Walk from 1843 to 1991 — eight portraits, eight ways of
                thinking. Stop at any of them and make their lens yours.
              </p>
            </div>

            {/* Quick-select grid (original gallery cards) */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
              {MENTORS.map((mentor, index) => (
                <MentorCard
                  key={mentor.id}
                  id={mentor.id}
                  name={mentor.name}
                  era={mentor.era}
                  icon={mentor.icon}
                  greeting={mentor.greeting}
                  accentColor={mentor.accentColor}
                  expertise={mentor.expertise}
                  index={index}
                />
              ))}
            </div>

            {/* Divider into the journey */}
            <div
              className="flex items-center gap-4 mt-20 mb-4"
              style={{
                fontFamily: "var(--font-mono)",
                fontSize: "10px",
                letterSpacing: "0.2em",
                textTransform: "uppercase",
                color: "var(--muted)",
              }}
            >
              <span>Their Stories</span>
              <span style={{ flex: 1, height: "1px", background: "var(--border)" }} />
              <span>1843 — 1991</span>
            </div>
          </div>

          {/* The journey */}
          <MentorJourney />
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
                  title: "Personas as Models",
                  description:
                    "Pick a legend the way you'd pick an AI model. Each persona has its own voice, values, and feedback structure — from Ada's poetical science to Linus's show-me-the-code.",
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
      </main>
    </>
  );
}
