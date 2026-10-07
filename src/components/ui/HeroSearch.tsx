"use client";

import { SearchBar } from "./SearchBar";

/**
 * HeroSearch — the homepage search bar wrapped in an animated glow frame.
 * The glow wraps all four sides: a rotating conic-gradient ring plus a
 * blurred copy of the same ring acting as the light bloom. Submitting
 * smooth-scrolls down to the mentor gallery.
 */

const RING_BACKGROUND =
  "repeating-conic-gradient(from var(--glow-angle), oklch(72% 0.18 165 / 0.95) 0deg 30deg, transparent 30deg 110deg, oklch(62% 0.16 245 / 0.95) 110deg 140deg, transparent 140deg 220deg, oklch(68% 0.14 65 / 0.9) 220deg 250deg, transparent 250deg 360deg)";

export function HeroSearch() {
  const scrollToMentors = () => {
    document.getElementById("mentors")?.scrollIntoView({ behavior: "smooth" });
  };

  return (
    <div className="relative mx-auto mt-12 w-full max-w-[720px]">
      {/* Rotating ring */}
      <div
        aria-hidden="true"
        className="absolute -inset-[2px] rounded-[22px]"
        style={{
          background: RING_BACKGROUND,
          animation: "glow-rotate 7s linear infinite",
        }}
      />
      {/* Bloom layer */}
      <div
        aria-hidden="true"
        className="absolute -inset-[8px] rounded-[28px]"
        style={{
          background: RING_BACKGROUND,
          animation: "glow-rotate 7s linear infinite",
          filter: "blur(20px)",
          opacity: 0.45,
        }}
      />
      {/* Inner glass well */}
      <div
        className="relative px-5 py-5 sm:px-6"
        style={{
          background: "oklch(10% 0.008 265 / 0.88)",
          border: "1px solid oklch(100% 0 0 / 0.08)",
          borderRadius: "20px",
          backdropFilter: "blur(20px) saturate(160%)",
          WebkitBackdropFilter: "blur(20px) saturate(160%)",
          boxShadow: "inset 0 1px 0 oklch(100% 0 0 / 0.06)",
        }}
      >
        <SearchBar large onQuerySubmit={scrollToMentors} />
      </div>
    </div>
  );
}
