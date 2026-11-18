"use client";

/**
 * MentorGLTarget — A positioning anchor for the WebGLBackground canvas.
 *
 * Render this *inside* the MentorCard wrapper so it shares the card's layout
 * position. The WebGL canvas reads getBoundingClientRect from it and draws a
 * procedural gradient plane at that exact screen rect.
 *
 * The element is `position: absolute; inset: 0; z-index: -1` so it fills the
 * card but sits behind all card content. It renders no pixels of its own.
 */

interface MentorGLTargetProps {
  mentorId: string;
  accentColor: string;
}

export function MentorGLTarget({ mentorId, accentColor }: MentorGLTargetProps) {
  return (
    // Color-only plane anchor (#274). The WebGL layer paints the accent
    // gradient procedurally from data-gl-color, so no image is decoded.
    <div
      data-gl-color={accentColor}
      data-gl-mentor={mentorId}
      aria-hidden="true"
      style={{
        position: "absolute",
        inset: 0,
        zIndex: -1,
        pointerEvents: "none",
      }}
    />
  );
}

/**
 * HeroGLTarget — Full-width background target for the hero section. The
 * deep-space gradient is painted by the shader, which bends with scroll.
 */
export function HeroGLTarget() {
  return (
    // Color-only plane anchor (#274); the shader paints the deep-space
    // gradient so there is no 1920x800 image to decode.
    <div
      data-gl-color="#1a2040"
      data-gl-target="hero"
      aria-hidden="true"
      style={{
        position: "absolute",
        inset: 0,
        zIndex: -1,
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
