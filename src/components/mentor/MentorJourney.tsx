"use client";

import { motion } from "framer-motion";
import Image from "next/image";
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

/**
 * Stable React key for a paragraph node. Paragraphs are static content, so
 * hashing the text lets React reconcile by identity instead of by position;
 * an array index would remount every node whenever a paragraph is inserted.
 */
function paragraphKey(text: string): string {
  let hash = 0;
  for (let i = 0; i < text.length; i++) {
    hash = (hash * 31 + text.charCodeAt(i)) | 0;
  }
  return `p${hash}`;
}

/**
 * Calculates a high-contrast text color (dark vs light) for a given background color
 * based on standard WCAG relative luminance, ensuring minimum 4.5:1 contrast ratio.
 */
export function getContrastingTextColor(backgroundHexOrColor: string): string {
  if (!backgroundHexOrColor || typeof backgroundHexOrColor !== "string") {
    return "#ffffff";
  }
  const hexMatch = backgroundHexOrColor.trim().match(/^#?([0-9a-fA-F]{6})$/);
  if (hexMatch) {
    const hex = hexMatch[1];
    const r = parseInt(hex.slice(0, 2), 16) / 255;
    const g = parseInt(hex.slice(2, 4), 16) / 255;
    const b = parseInt(hex.slice(4, 6), 16) / 255;
    const toLinear = (c: number) =>
      c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
    const L = 0.2126 * toLinear(r) + 0.7152 * toLinear(g) + 0.0722 * toLinear(b);
    return L < 0.2112 ? "#ffffff" : "oklch(10% 0.01 265)";
  }
  return "oklch(10% 0.01 265)";
}

function PortraitMedallion({
  mentor,
  mentors,
}: {
  mentor: Mentor;
  mentors: readonly Mentor[];
}) {
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

      <motion.div
        initial={{ opacity: 1, scale: 1, y: 0 }}
        whileInView={{ opacity: 1, scale: 1, y: 0 }}
        viewport={{ once: true, margin: "-80px" }}
        transition={{ duration: 0.7, ease: EASE }}
        className="relative z-10 h-full w-full overflow-hidden rounded-full"
        style={{
          border: `1px solid ${mentor.accentColor}66`,
          boxShadow: `0 0 0 8px oklch(13% 0.012 265 / 0.55), 0 0 56px ${mentor.accentColor}30, 0 24px 56px oklch(0% 0 0 / 0.5)`,
        }}
      >
        <Image
          src={mentor.avatarUrl}
          alt={`Portrait of ${mentor.name}`}
          width={360}
          height={360}
          sizes="(max-width: 768px) 280px, 360px"
          className="h-full w-full object-cover"
          style={{ objectPosition: mentor.portraitPosition || "center" }}
        />
      </motion.div>

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
        {String(mentors.indexOf(mentor) + 1).padStart(2, "0")} · {mentor.era}
      </div>
    </div>
  );
}

function JourneySection({
  mentor,
  index,
  mentors,
}: {
  mentor: Mentor;
  index: number;
  mentors: readonly Mentor[];
}) {
  const bio = MENTOR_BIOS[mentor.id];
  const reversed = index % 2 === 1;

  const knownFor = bio?.knownFor || mentor.expertise;
  const paragraphs = bio?.paragraphs || (mentor.greeting ? [mentor.greeting] : []);
  const quote = bio?.quote || mentor.greeting;
  const quoteContext = bio?.quoteContext || mentor.era;
  // Paraphrases are rendered without quotation marks and labelled, so a
  // summary of someone's views is never presented as their verbatim words.
  const isParaphrase = bio?.quoteKind === "paraphrase";

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
            <PortraitMedallion mentor={mentor} mentors={mentors} />
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
              {knownFor}
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
              {paragraphs.map((paragraph) => (
                <p key={paragraphKey(paragraph)} className="leading-relaxed">
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
                {isParaphrase ? quote : <>&ldquo;{quote}&rdquo;</>}
              </p>
              <cite
                className="mt-1 block font-mono text-[10px] uppercase not-italic tracking-[0.15em]"
                style={{ color: "var(--muted)" }}
              >
                {quoteContext}
                {isParaphrase ? " (paraphrased)" : ""}
              </cite>
            </blockquote>

            {/* Focus areas */}
            <div className="mt-6 flex flex-wrap gap-2">
              {(mentor.focusAreas || []).map((area) => (
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
                color: getContrastingTextColor(mentor.accentColor),
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

/**
 * The mentors to render, in order. Defaults to the canonical MENTORS export;
 * tests can pass a local array instead of mutating that shared module state.
 */
export function MentorJourney({ mentors = MENTORS }: { mentors?: readonly Mentor[] }) {
  return (
    <div className="relative" style={{ zIndex: 1 }}>
      {mentors.map((mentor, index) => (
        <div key={mentor.id}>
          <JourneySection mentor={mentor} index={index} mentors={mentors} />
          {index < mentors.length - 1 && (
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
