"use client";

import { useEffect } from "react";

export function ScrollProgressTracker() {
  useEffect(() => {
    function updateTrack() {
      // Resolve the fill element on every update rather than once on mount.
      // A single mount-time lookup caches `null` whenever this component's
      // effect runs before the element is committed (or when the element is
      // mounted later by a Suspense boundary), and then the bar never moves.
      const trackFill = document.getElementById("trackFill");
      const max = document.documentElement.scrollHeight - window.innerHeight;
      const pct = max > 0 ? (window.scrollY / max) * 100 : 0;
      if (trackFill) trackFill.style.height = pct.toFixed(1) + "%";
    }

    window.addEventListener("scroll", updateTrack, { passive: true });
    // Document height changes on resize, so recompute there too.
    window.addEventListener("resize", updateTrack);
    updateTrack();

    return () => {
      window.removeEventListener("scroll", updateTrack);
      window.removeEventListener("resize", updateTrack);
    };
  }, []);

  return null;
}