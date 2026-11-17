"use client";

import { SearchBar } from "./SearchBar";
import { BorderBeam } from "border-beam";
import { useReducedMotion } from "@/hooks/useReducedMotion";

export function SearchBarSection({
  className,
  large,
  currentMentorId,
}: {
  className?: string;
  large?: boolean;
  currentMentorId?: string;
}) {
  // BorderBeam runs a continuous decorative animation. Skip it entirely when
  // the user has asked for reduced motion rather than trying to slow it down.
  const prefersReducedMotion = useReducedMotion();

  const content = (
    <div
      className="w-full"
      style={{
        background: "oklch(10% 0.008 265 / 0.6)",
        borderRadius: "20px",
        padding: large ? "2rem" : "1.5rem",
        border: "1px solid oklch(100% 0 0 / 0.08)",
        backdropFilter: "blur(20px) saturate(160%)",
        WebkitBackdropFilter: "blur(20px) saturate(160%)",
      }}
    >
      <SearchBar large={large} currentMentorId={currentMentorId} />
    </div>
  );

  return (
    <div className={`mt-10 mx-auto w-full ${className || "max-w-2xl"}`}>
      {prefersReducedMotion ? (
        content
      ) : (
        <BorderBeam size="md" colorVariant="colorful" duration={3.1} borderRadius={20}>
          {content}
        </BorderBeam>
      )}
    </div>
  );
}