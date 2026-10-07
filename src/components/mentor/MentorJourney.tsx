"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { MENTORS, type Mentor } from "@/data/mentors";
import { MENTOR_BIOS } from "@/data/mentor-bios";
import { MentorGLTarget } from "./HeroDistortion";

/**
 * MentorJourney — the homepage gallery walk through computing history.
 * One full-width section per mentor, alternating portrait/article sides.
 * Each portrait sits on a WebGL distortion plane (scroll bend + cursor
 * ripple + film grain via WebGLBackground), and reveals as it scrolls
 * into view.
 */

const EASE = [0.2, 0, 0, 1] as const;

function PortraitMedallion({ mentor }: { mentor: Mentor }) {
  return (
    <div className="relative mx-auto h-[280px] w-[280px] md:h-[360px] md:w-[360px]">
      <MentorGLTarget mentorId={mentor.id} accentColor={mentor.accentColor} />

      {/* Accent halo */}
      <div
        aria-hidden="true"
        className="absolute -inset-8 rounded-full"
        style={{
          background: `radial-gradient(circle, ${mentor.accentColor}26 0%, transparent 68%)`,
        }}
      />

      <motion.img
        src={mentor.avatarUrl}
        alt={`Portrait of ${mentor.name}`}
        loading="lazy"
        initial={{ opacity: 0, scale: 0.92, y: 28 }}
        whileInView={{ opacity: 1, scale: 1, y: 0 }}
        viewport={{ once: true, margin: "-80px" }}
        transition={{ duration: 0.7, ease: EASE }}
        className="relative z-10 h-full w-full rounded-full object-cover"
        style={{
          objectPosition: mentor.portraitPosition || "center",
          border: `1px solid ${mentor.accentColor}66`,
          boxShadow: `0 0 0 8px oklch(13% 0.012 265 / 0.55), 0 0 56px ${mentor.accentColor}30, 0 24px 56px oklch(0% 0 0 / 0.5)`,
        }}
      />

      {/* Timeline index badge */}
      <div
        className="absolute -bottom-1 left-1/2 z-20 -translate-x-1/2 whitespace-nowrap px-4 py-1.5 font-mono text-[10px] uppercase tracking-[0.25em]"
        style={{
          background: "oklch(10% 0.008 265 / 0.9)",
          border: "1px solid var(--border-hi)",
          borderRadius: "999px",
          color: "var(--muted)",
          backdropFilter: "blur(12px)",
        }}
      >
        {String(MENTORS.indexOf(mentor) + 1).padStart(2, "0")} · {mentor.era}
      </div>
    </div>
  );
}

function JourneySection({ mentor, index }: { mentor: Mentor; index: number }) {
  const bio = MENTOR_BIOS[mentor.id];
  const reversed = index % 2 === 1;

  return (
    <section
      id={mentor.id}
      data-od-id={`mentor-${mentor.id}`}
      className="relative px-6 py-16 md:py-20"
      style={{ zIndex: 1 }}
    >
      <div className="container mx-auto max-w-6xl">
        <div
          className={`flex flex-col items-center gap-12 md:gap-16 ${
            reversed ? "md:flex-row-reverse" : "md:flex-row"
          }`}
        >
          <div className="shrink-0 md:w-[400px]">
            <PortraitMedallion mentor={mentor} />
          </div>

          <motion.article
            initial={{ opacity: 0, y: 32 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-80px" }}
            transition={{ duration: 0.6, delay: 0.1, ease: EASE }}
            className="min-w-0 flex-1"
          >
            {/* Known-for strip */}
            <p
              className="mb-3 font-mono text-[11px] uppercase tracking-[0.2em]"
              style={{ color: mentor.accentColor }}
            >
              {bio.knownFor}
            </p>

            <h3
              className="mb-1 text-3xl font-black md:text-4xl"
              style={{
                fontFamily: "var(--font-display)",
                letterSpacing: "-0.03em",
                color: "var(--fg)",
              }}
            >
              {mentor.name}
            </h3>

            <p className="mb-5 text-sm font-medium" style={{ color: "oklch(72% 0.18 165)" }}>
              {mentor.expertise}
            </p>

            {/* Article body */}
            <div className="space-y-4" style={{ color: "var(--fg-mid)" }}>
              {bio.paragraphs.map((paragraph, i) => (
                <p key={i} className="leading-relaxed">
                  {paragraph}
                </p>
              ))}
            </div>

            {/* Signature quote */}
            <blockquote
              className="mt-6 border-l-2 pl-4"
              style={{ borderColor: `${mentor.accentColor}80` }}
            >
              <p className="italic" style={{ color: "var(--fg)" }}>
                &ldquo;{bio.quote}&rdquo;
              </p>
              <cite
                className="mt-1 block font-mono text-[10px] uppercase not-italic tracking-[0.15em]"
                style={{ color: "var(--muted)" }}
              >
                {bio.quoteContext}
              </cite>
            </blockquote>

            {/* Focus areas */}
            <div className="mt-6 flex flex-wrap gap-2">
              {mentor.focusAreas.map((area) => (
                <span
                  key={area}
                  className="px-3 py-1 font-mono text-[10px] uppercase tracking-[0.15em]"
                  style={{
                    border: "1px solid var(--border-hi)",
                    borderRadius: "999px",
                    color: "var(--muted)",
                  }}
                >
                  {area.replace(/_/g, " ")}
                </span>
              ))}
            </div>

            {/* CTA */}
            <Link
              href={`/workspace/${mentor.id}`}
              className="group/cta mt-8 inline-flex items-center gap-2 px-6 py-3 text-sm font-semibold transition-all duration-200 hover:-translate-y-0.5"
              style={{
                background: mentor.accentColor,
                color: "oklch(10% 0.01 265)",
                borderRadius: "12px",
                boxShadow: `0 4px 24px ${mentor.accentColor}40`,
              }}
            >
              Review code with {mentor.name.split(" ")[0]}
              <ArrowRight className="h-4 w-4 transition-transform duration-200 group-hover/cta:translate-x-1" />
            </Link>
          </motion.article>
        </div>
      </div>
    </section>
  );
}

export function MentorJourney() {
  return (
    <div className="relative" style={{ zIndex: 1 }}>
      {MENTORS.map((mentor, index) => (
        <div key={mentor.id}>
          <JourneySection mentor={mentor} index={index} />
          {index < MENTORS.length - 1 && (
            <div
              aria-hidden="true"
              className="mx-auto flex max-w-7xl items-center gap-4 px-6"
              style={{
                fontFamily: "var(--font-mono)",
                fontSize: "10px",
                letterSpacing: "0.2em",
                textTransform: "uppercase",
                color: "var(--muted)",
              }}
            >
              <span style={{ flex: 1, height: "1px", background: "var(--border)" }} />
              <span>·</span>
              <span style={{ flex: 1, height: "1px", background: "var(--border)" }} />
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
