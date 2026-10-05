"use client";

import dynamic from "next/dynamic";

/**
 * WebGLBackgroundWrapper — Client component wrapper for WebGLBackground.
 * Required because next/dynamic with ssr:false can only be used in Client Components.
 */

const WebGLBackground = dynamic(
  () => import("@/components/ui/WebGLBackground"),
  { ssr: false }
);

export default function WebGLBackgroundWrapper() {
  return <WebGLBackground />;
}