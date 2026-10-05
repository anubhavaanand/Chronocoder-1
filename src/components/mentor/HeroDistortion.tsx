"use client";

/**
 * MentorGLTarget — A single invisible-to-the-eye but correctly-positioned
 * element that the WebGLBackground canvas reads via getBoundingClientRect
 * to place a distortion plane exactly over a mentor card.
 *
 * Render this *inside* the MentorCard wrapper so it shares the card's
 * layout position. The WebGL canvas then creates a mesh at that exact
 * screen rect and draws the distorted gradient texture in its place.
 *
 * The element is `position: absolute; inset: 0; z-index: -1` so it
 * fills the card but sits behind all card content.
 */

interface MentorGLTargetProps {
  mentorId: string;
  accentColor: string;
}

function mentorTextureSrc(accentColor: string): string {
  const hex = accentColor.replace("#", "");
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="400" height="560">
    <defs>
      <radialGradient id="g" cx="50%" cy="30%" r="70%">
        <stop offset="0%" stop-color="#${hex}" stop-opacity="0.4"/>
        <stop offset="60%" stop-color="#0a0a14" stop-opacity="0.9"/>
        <stop offset="100%" stop-color="#06060f" stop-opacity="1"/>
      </radialGradient>
    </defs>
    <rect width="400" height="560" fill="#06060f"/>
    <rect width="400" height="560" fill="url(#g)"/>
  </svg>`;
  if (typeof window === "undefined") return "";
  return `data:image/svg+xml;base64,${btoa(svg)}`;
}

export function MentorGLTarget({ mentorId, accentColor }: MentorGLTargetProps) {
  const src = mentorTextureSrc(accentColor);
  if (!src) {
    // Server-side or no src: render placeholder to avoid hydration mismatch
    return (
      <img
        data-gl-src=""
        data-gl-mentor={mentorId}
        alt=""
        aria-hidden="true"
        style={{
          position: "absolute",
          inset: 0,
          width: "100%",
          height: "100%",
          objectFit: "cover",
          zIndex: -1,
          opacity: 0,
          pointerEvents: "none",
        }}
      />
    );
  }
  return (
    <img
      data-gl-src={src}
      data-gl-mentor={mentorId}
      src={src}
      alt=""
      aria-hidden="true"
      style={{
        position: "absolute",
        inset: 0,
        width: "100%",
        height: "100%",
        objectFit: "cover",
        zIndex: -1,
        opacity: 0,
        pointerEvents: "none",
      }}
    />
  );
}

/**
 * HeroGLTarget — Full-width background target for the hero section.
 * Enhanced with gallery-style deep-space gradient that bends with scroll.
 */
export function HeroGLTarget() {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1920" height="800">
    <defs>
      <radialGradient id="a" cx="30%" cy="50%" r="60%">
        <stop offset="0%" stop-color="#1a2040" stop-opacity="0.8"/>
        <stop offset="100%" stop-color="#06060f" stop-opacity="1"/>
      </radialGradient>
      <radialGradient id="b" cx="75%" cy="40%" r="50%">
        <stop offset="0%" stop-color="#0d2030" stop-opacity="0.6"/>
        <stop offset="100%" stop-color="#06060f" stop-opacity="0"/>
      </radialGradient>
      <radialGradient id="c" cx="50%" cy="50%" r="40%">
        <stop offset="0%" stop-color="#002030" stop-opacity="0.3"/>
        <stop offset="100%" stop-color="#06060f" stop-opacity="0"/>
      </radialGradient>
    </defs>
    <rect width="1920" height="800" fill="#06060f"/>
    <rect width="1920" height="800" fill="url(#a)"/>
    <rect width="1920" height="800" fill="url(#b)"/>
    <rect width="1920" height="800" fill="url(#c)"/>
  </svg>`;

  if (typeof window === "undefined") {
    // Server-side: render placeholder to avoid hydration mismatch
    return (
      <img
        data-gl-src=""
        data-gl-target="hero"
        alt=""
        aria-hidden="true"
        style={{
          position: "absolute",
          inset: 0,
          width: "100%",
          height: "100%",
          objectFit: "cover",
          zIndex: -1,
          opacity: 0,
          pointerEvents: "none",
        }}
      />
    );
  }
  const src = `data:image/svg+xml;base64,${btoa(svg)}`;

  return (
    <img
      data-gl-src={src}
      data-gl-target="hero"
      src={src}
      alt=""
      aria-hidden="true"
      style={{
        position: "absolute",
        inset: 0,
        width: "100%",
        height: "100%",
        objectFit: "cover",
        zIndex: -1,
        opacity: 0,
        pointerEvents: "none",
      }}
    />
  );
}

/**
 * ScrollIndicator — Animated scroll hint from gallery design
 */
export function ScrollIndicator() {
  return (
    <div
      className="absolute bottom-8 left-1/2 -translate-x-1/2 animate-float"
      aria-hidden="true"
      style={{ zIndex: 1 }}
    >
      <svg
        className="w-5 h-5"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
        style={{ color: "var(--muted)" }}
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={1.5}
          d="M19 14l-7 7m0 0l-7-7m7 7V3"
        />
      </svg>
    </div>
  );
}
