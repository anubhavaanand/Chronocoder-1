"use client";

import { SearchBar } from "./SearchBar";
import { BorderBeam } from "border-beam";

export function SearchBarSection({ className, large }: { className?: string; large?: boolean }) {
  return (
    <div className={`mt-10 mx-auto w-full ${className || "max-w-2xl"}`}>
      <BorderBeam size="md" colorVariant="colorful" duration={3.1} borderRadius={20}>
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
          <SearchBar large={large} />
        </div>
      </BorderBeam>
    </div>
  );
}
