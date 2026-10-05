"use client";

import { useEffect } from "react";

export function ScrollProgressTracker() {
  useEffect(() => {
    const trackFill = document.getElementById("trackFill");
    function updateTrack() {
      const max = document.documentElement.scrollHeight - window.innerHeight;
      const pct = max > 0 ? (window.scrollY / max) * 100 : 0;
      if (trackFill) trackFill.style.height = pct.toFixed(1) + "%";
    }
    window.addEventListener("scroll", updateTrack, { passive: true });
    updateTrack();
    return () => window.removeEventListener("scroll", updateTrack);
  }, []);

  return null;
}