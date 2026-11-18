"use client";

/**
 * WebGLBackground — Three.js WebGL canvas fixed behind the entire page.
 * Upgraded with Distortion & Grain effects from OpenDesign gallery.
 *
 * Effects:
 *   • Vertex bend: planes wave sinusoidally scaled by scroll velocity
 *   • Simplex noise UV ripple: cursor proximity distorts each plane
 *   • Film grain: per-frame GLSL hash noise layered over the entire canvas
 *
 * Architecture:
 *   - Fixed z-index: 0, pointer-events: none — never intercepts UI interaction
 *   - Planes are created for each `[data-gl-src]` or `[data-gl-color]` element
 *   - ResizeObserver keeps plane positions synced to DOM layout
 *   - Native scroll via window.scrollY — no dependency on Lenis or other libs
 *   - Color-only targets render procedurally; no hidden bitmaps are decoded (#274)
 *
 * Credits: effect pattern by Jan Kohlbach / Codrops (MIT)
 *          simplex noise: Ashima Arts (MIT)
 */

import { useEffect, useRef } from "react";
import * as THREE from "three";

// ---------------------------------------------------------------------------
// GLSL — Simplex noise (Ashima Arts, MIT) — Gallery version
// ---------------------------------------------------------------------------
const SIMPLEX_GLSL = /* glsl */ `
vec3 mod289(vec3 x){return x-floor(x*(1.0/289.0))*289.0;}
vec2 mod289(vec2 x){return x-floor(x*(1.0/289.0))*289.0;}
vec3 permute(vec3 x){return mod289(((x*34.0)+10.0)*x);}
float snoise(vec2 v){
  const vec4 C=vec4(0.211324865405187,0.366025403784439,-0.577350269189626,0.024390243902439);
  vec2 i=floor(v+dot(v,C.yy));
  vec2 x0=v-i+dot(i,C.xx);
  vec2 i1=(x0.x>x0.y)?vec2(1.0,0.0):vec2(0.0,1.0);
  vec4 x12=x0.xyxy+C.xxzz; x12.xy-=i1;
  i=mod289(i);
  vec3 p=permute(permute(i.y+vec3(0.0,i1.y,1.0))+i.x+vec3(0.0,i1.x,1.0));
  vec3 m=max(0.5-vec3(dot(x0,x0),dot(x12.xy,x12.xy),dot(x12.zw,x12.zw)),0.0);
  m=m*m; m=m*m;
  vec3 x=2.0*fract(p*C.www)-1.0;
  vec3 h=abs(x)-0.5;
  vec3 ox=floor(x+0.5);
  vec3 a0=x-ox;
  m*=1.79284291400159-0.85373472095314*(a0*a0+h*h);
  vec3 g;
  g.x=a0.x*x0.x+h.x*x0.y;
  g.yz=a0.yz*x12.xz+h.yz*x12.yw;
  return 130.0*dot(m,g);
}
vec2 getCoverUvVert(vec2 uv,vec2 t,vec2 q){
  vec2 r=vec2(min((q.x/q.y)/(t.x/t.y),1.0),min((q.y/q.x)/(t.y/t.x),1.0));
  return vec2(uv.x*r.x+(1.0-r.x)*0.5,uv.y*r.y+(1.0-r.y)*0.5);
}`;

// ---------------------------------------------------------------------------
// Vertex shader — scroll-velocity bend + cursor ripple (simplex noise)
// ---------------------------------------------------------------------------
const VERTEX_SHADER = /* glsl */ `
${SIMPLEX_GLSL}

uniform float uScrollVelocity;
uniform vec2  uTextureSize;
uniform vec2  uQuadSize;
out vec2 vUv;
out vec2 vUvCover;

vec3 deform(vec3 pos, vec2 uv) {
  /* Sinusoidal bow along the vertical axis, driven by scroll speed */
  float bend = sin(uv.x * 3.14159265) * min(abs(uScrollVelocity), 5.0) * sign(uScrollVelocity) * -0.01;
  pos.y -= bend;
  return pos;
}

void main() {
  vUv = uv;
  vUvCover = getCoverUvVert(uv, uTextureSize, uQuadSize);
  gl_Position = projectionMatrix * modelViewMatrix * vec4(deform(position, vUvCover), 1.0);
}
`;

// ---------------------------------------------------------------------------
// Fragment shader — texture sample + cursor ripple + film grain
// ---------------------------------------------------------------------------
const FRAGMENT_SHADER = /* glsl */ `
${SIMPLEX_GLSL}

precision highp float;
uniform sampler2D uTexture;
uniform vec2      uQuadSize;
uniform float     uScrollVelocity;
uniform float     uMouseEnter;
uniform vec2      uMouseOverPos;
uniform float     uTime;
uniform vec3      uColor;
uniform float     uUseColor;
in vec2 vUv;
in vec2 vUvCover;
out vec4 outColor;

/* Procedural stand-in for the per-card mentor texture (#274). Previously every
   target embedded an invisible 400x560 SVG data URI, so the browser decoded a
   full image per card for no visual gain. The gradient is cheap to evaluate and
   keeps the same accent-at-the-top falloff. */
vec3 proceduralColor() {
  float d = distance(vec2(vUv.x, vUv.y), vec2(0.5, 0.7));
  float glow = 0.4 * (1.0 - smoothstep(0.0, 0.7, d));
  vec3 base = vec3(0.039, 0.039, 0.059);
  return mix(base, uColor, glow);
}

void main() {
  vec2 tc = vUvCover;
  float aspect  = uQuadSize.y / uQuadSize.x;

  /* Radial cursor influence */
  float circle = 1.0 - distance(
    vec2(uMouseOverPos.x, (1.0 - uMouseOverPos.y) * aspect),
    vec2(vUv.x, vUv.y * aspect)
  ) * 14.0;

  /* Simplex noise for UV offset */
  float n = snoise(gl_FragCoord.xy * 0.004 + uTime * 0.12);

  float strength = uMouseEnter + abs(uScrollVelocity) * 0.08;
  tc.x += circle * n * 0.012 * strength;
  tc.y += circle * n * 0.012 * strength;

  vec3 col = uUseColor > 0.5 ? proceduralColor() : texture(uTexture, tc).rgb;

  /* Film grain — fast hash, no per-pixel snoise */
  float g = fract(sin(dot(gl_FragCoord.xy, vec2(12.9898, 78.233)) + uTime * 57.0) * 43758.5453);
  col += (g - 0.5) * 0.07;

  outColor = vec4(col, 1.0);
}
`;

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
interface PlaneEntry {
  mesh: THREE.Mesh;
  material: THREE.ShaderMaterial;
  domEl: HTMLElement;
  measure: () => void;
  update: (scrollY: number, vel: number, time: number) => void;
  el: HTMLElement;
  enter: number;
  over: { cx: number; cy: number; tx: number; ty: number };
  tEnter: number;
  b: DOMRect;
  top: number;
  left: number;
  w: number;
  h: number;
  mat: THREE.ShaderMaterial;
  /** Undefined for procedural (data-gl-color) planes. */
  texture?: THREE.Texture | null;
  destroy?: () => void;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------
export default function WebGLBackground() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    // ---- Renderer ----
    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true });
      renderer.setSize(window.innerWidth, window.innerHeight);
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
    } catch (err) {
      console.warn("WebGL initialization failed; falling back gracefully without background distortion.", err);
      return;
    }

    // Context loss/restore bookkeeping (#230). Declared here because the
    // handlers below close over it, and they are registered before `boot()`.
    let isContextLost = false;

    const handleContextLost = (e: Event) => {
      e.preventDefault();
      // preventDefault() tells the browser we intend to restore, without it the
      // context is never given back and the canvas stays frozen (#230).
      isContextLost = true;
      console.warn("WebGL context lost.");
    };

    // Without this the page is left on the last frame forever: three.js marks
    // its internal state stale when the context drops, and only reinitialises
    // on a `webglcontextrestored` event (#230).
    const handleContextRestored = () => {
      if (isDisposed) return;
      isContextLost = false;
      renderer.resetState();
      resize();
      prevY = window.scrollY;
      console.info("WebGL context restored.");
    };

    canvas.addEventListener("webglcontextlost", handleContextLost, { passive: false });
    canvas.addEventListener("webglcontextrestored", handleContextRestored);

    // ---- Scene / Camera ----
    const scene = new THREE.Scene();
    const CAMERA_POS = 500;

    const calcFov = (z: number) => 2 * Math.atan((window.innerHeight / 2) / z) * (180 / Math.PI);
    const camera = new THREE.PerspectiveCamera(50, window.innerWidth / window.innerHeight, 10, 1000);
    camera.position.z = CAMERA_POS;
    camera.fov = calcFov(CAMERA_POS);
    camera.updateProjectionMatrix();

    /* A plane is driven either by a decoded <img data-gl-src> or, for
       color-only targets that must not decode an image, by data-gl-color (#274). */
    const GL_TARGET_SELECTOR = "img[data-gl-src], [data-gl-color]";

    const geometry = new THREE.PlaneGeometry(1, 1, 28, 28);
    const loader = new THREE.TextureLoader();
    const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
    const store: PlaneEntry[] = [];
    // Read the media query through a getter rather than caching `.matches`:
    // a MediaQueryList is a live object, so toggling the OS setting mid-session
    // is picked up on the next frame instead of being frozen at mount (#231).
    const prefersReduced = typeof window !== "undefined" && window.matchMedia ? window.matchMedia("(prefers-reduced-motion: reduce)") : null;
    const isReducedMotion = () => Boolean(prefersReduced?.matches);

    /* ---- Media class: one instance per [data-gl-src] / [data-gl-color] ---- */
    class Media implements PlaneEntry {
      el: HTMLElement;
      enter: number;
      over: { cx: number; cy: number; tx: number; ty: number };
      tEnter: number;
      b: DOMRect;
      top: number;
      left: number;
      w: number;
      h: number;
      mesh: THREE.Mesh;
      mat: THREE.ShaderMaterial;
      material: THREE.ShaderMaterial;
      domEl: HTMLElement;
      pointerTarget: HTMLElement;
      /* Set when the plane draws from uColor instead of a decoded image (#274). */
      procedural: boolean;
      texture: THREE.Texture | null = null;

      constructor(el: HTMLElement) {
        this.el = el;
        this.domEl = el;
        this.enter = 0;
        this.over = { cx: 0.5, cy: 0.5, tx: 0.5, ty: 0.5 };
        this.tEnter = 0;
        this.b = el.getBoundingClientRect();
        this.top = this.b.top + window.scrollY;
        this.left = this.b.left;
        this.w = this.b.width;
        this.h = this.b.height;
        this.procedural = !el.hasAttribute("data-gl-src");

        this.mat = new THREE.ShaderMaterial({
          glslVersion: THREE.GLSL3,
          vertexShader: VERTEX_SHADER,
          fragmentShader: FRAGMENT_SHADER,
          uniforms: {
            uTexture: { value: null },
            uTextureSize: { value: new THREE.Vector2(1, 1) },
            uQuadSize: { value: new THREE.Vector2(1, 1) },
            uScrollVelocity: { value: 0 },
            uMouseEnter: { value: 0 },
            uMouseOverPos: { value: new THREE.Vector2(0.5, 0.5) },
            uTime: { value: 0 },
            uColor: { value: cssToRgb(el.getAttribute("data-gl-color") ?? "") },
            uUseColor: { value: 0 },
          },
        });
        this.material = this.mat;

        this.mesh = new THREE.Mesh(geometry, this.mat);
        scene.add(this.mesh);

        if (this.procedural) {
          // No image to decode: the fragment shader paints the accent gradient.
          this.mat.uniforms.uUseColor.value = 1;
        } else {
          const src = el.getAttribute("data-gl-src")!;
          this.texture = loader.load(src, (tex) => {
            tex.colorSpace = THREE.SRGBColorSpace;
            this.mat.uniforms.uTextureSize.value.set(tex.image.width, tex.image.height);
          });
          this.mat.uniforms.uTexture.value = this.texture;
        }

        /* Pointer events. A plain [data-gl-src] anchor is `pointer-events: none`
           so it can't block clicks, which means listeners on it never fire
           (#273). Attach to the nearest ancestor that accepts pointer events
           instead, and fall back to the element itself. */
        this.pointerTarget = (el.closest("[data-gl-pointer]") as HTMLElement | null)
          ?? this.findPointerHost(el)
          ?? el;

        this.pointerTarget.addEventListener("pointerenter", this.onPointerEnter);
        this.pointerTarget.addEventListener("pointerleave", this.onPointerLeave);
        this.pointerTarget.addEventListener("pointermove", this.onPointerMove);

        this.measure();
      }

      /* Walk up until an ancestor actually receives pointer events. */
      findPointerHost(el: HTMLElement): HTMLElement | null {
        let node = el.parentElement;
        while (node) {
          const pe = window.getComputedStyle(node).pointerEvents;
          if (pe && pe !== "none") return node;
          node = node.parentElement;
        }
        return null;
      }

      onPointerEnter = () => {
        this.tEnter = 1;
      };

      onPointerLeave = () => {
        this.tEnter = 0;
        this.over.tx = 0.5;
        this.over.ty = 0.5;
      };

      onPointerMove = (e: PointerEvent) => {
        const b = this.el.getBoundingClientRect();
        this.over.tx = (e.clientX - b.left) / b.width;
        this.over.ty = (e.clientY - b.top) / b.height;
      };

      destroy() {
        this.pointerTarget.removeEventListener("pointerenter", this.onPointerEnter);
        this.pointerTarget.removeEventListener("pointerleave", this.onPointerLeave);
        this.pointerTarget.removeEventListener("pointermove", this.onPointerMove);
      }

      measure() {
        this.b = this.el.getBoundingClientRect();
        this.top = this.b.top + window.scrollY;
        this.left = this.b.left;
        this.w = this.b.width;
        this.h = this.b.height;
        this.mesh.scale.set(this.w, this.h, 1);
        this.mat.uniforms.uQuadSize.value.set(this.w, this.h);
      }

      update(scrollY: number, vel: number, time: number) {
        const vy = this.top - scrollY; // viewport-space top
        /* Frustum cull off-screen planes */
        this.mesh.visible = vy < window.innerHeight + 400 && vy + this.h > -400;
        if (!this.mesh.visible) return;

        this.mesh.position.x = this.left - window.innerWidth / 2 + this.w / 2;
        this.mesh.position.y = -this.top + window.innerHeight / 2 - this.h / 2 + scrollY;

        this.enter = lerp(this.enter, this.tEnter, 0.08);
        this.over.cx = lerp(this.over.cx, this.over.tx, 0.055);
        this.over.cy = lerp(this.over.cy, this.over.ty, 0.055);

        const isReduced = isReducedMotion();
        const u = this.mat.uniforms;
        u.uScrollVelocity.value = isReduced ? 0 : vel;
        u.uMouseEnter.value = isReduced ? 0 : this.enter;
        u.uMouseOverPos.value.set(this.over.cx, this.over.cy);
        u.uTime.value = isReduced ? 0 : time;
      }
    }

    /* ---- Resize handler ---- */
    let _rw = 0, _rh = 0;
    function resize() {
      const w = window.innerWidth, h = window.innerHeight;
      if (w === _rw && h === _rh) return;
      _rw = w; _rh = h;
      renderer.setSize(w, h);
      camera.aspect = w / h;
      camera.fov = calcFov(CAMERA_POS);
      camera.updateProjectionMatrix();
      store.forEach((m) => m.measure());
    }
    window.addEventListener("resize", resize, { passive: true });

    /* Targets are either an <img data-gl-src> (decoded texture) or any element
       carrying data-gl-color, which is painted procedurally in the shader
       (#274). Returns the ones newly created. */
    function addPlanesFor(el: ParentNode) {
      const created: Media[] = [];
      const seen = new Set(store.map((m) => m.el));
      const targets = el.querySelectorAll<HTMLElement>(GL_TARGET_SELECTOR);
      Array.from(targets).forEach((t) => {
        if (!seen.has(t)) {
          const m = new Media(t);
          store.push(m);
          created.push(m);
        }
      });
      if (created.length) resize();
      return created;
    }

    /* ---- Boot: build Media instances then run RAF ---- */
    let prevY = window.scrollY, vel = 0;
    let isDisposed = false;
    let rafId: number | null = null;

    /* Parse a CSS color for procedural planes (#274). Handles the formats the
       mentors data actually uses — hex (3/4/6/8 digits) and rgb()/rgba() — and
       falls back to the brand indigo for anything exotic (oklch, color-mix).
       Deliberately free of canvas: jsdom has no 2d context, and a canvas readback
       is overkill for a handful of constants. */
    function cssToRgb(color: string): THREE.Vector3 {
      const fallback = new THREE.Vector3(0.31, 0.275, 0.902); // #4f46e5
      if (!color) return fallback;
      const t = color.trim();

      if (/^#?[0-9a-fA-F]{3,8}$/.test(t)) {
        let hex = t.startsWith("#") ? t.slice(1) : t;
        if (hex.length === 3 || hex.length === 4) {
          hex = hex.split("").map((c) => c + c).join("");
        }
        if (hex.length === 6 || hex.length === 8) {
          const n = parseInt(hex.slice(0, 6), 16);
          return new THREE.Vector3(((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255);
        }
        return fallback;
      }

      const rgb = t.match(/^rgba?\(([^)]+)\)$/i);
      if (rgb) {
        const parts = rgb[1].split(/[,\s/]+/).filter(Boolean).slice(0, 3);
        if (parts.length === 3) {
          const ch = parts.map((p) => parseFloat(p));
          if (ch.every((c) => Number.isFinite(c) && c >= 0 && c <= 255)) {
            return new THREE.Vector3(ch[0] / 255, ch[1] / 255, ch[2] / 255);
          }
        }
      }

      return fallback;
    }

    /* One animation loop for the whole component, started on demand. Images
       inserted after mount have no loop of their own, so the observer kicks
       this to keep their uniforms animating (#272). */
    function ensureLoop() {
      if (isDisposed) return;
      (function frame(t?: number) {
        if (isDisposed) return;
        rafId = requestAnimationFrame(frame);
        // Skip drawing while the context is gone: the GL calls would be no-ops
        // and three.js would keep re-validating stale state every frame (#230).
        if (isContextLost) return;
        const time = (t || 0) / 1000;
        const y = window.scrollY;
        const raw = y - prevY;
        prevY = y;
        vel = lerp(vel, raw * 0.065, 0.1);
        store.forEach((m) => m.update(y, vel, time));
        renderer.render(scene, camera);
      })();
    }

    function boot() {
      if (isDisposed) return;
      addPlanesFor(document);
      ensureLoop();
    }

    /* Wait for all decoded textures to have natural dimensions */
    (function whenReady(cb: () => void) {
      const imgs = Array.from(document.querySelectorAll<HTMLImageElement>("img[data-gl-src]"));
      let n = 0;
      const total = imgs.length;
      // A data-gl-color target has no bitmap to wait for; only decode waits matter.
      const done = () => { if (++n >= total && !isDisposed) cb(); };
      imgs.forEach((im) => {
        if (im.complete && im.naturalWidth) done();
        else { im.onload = done; im.onerror = done; }
      });
      if (!total && !isDisposed) cb();
    })(boot);

    /* Newly-inserted targets (route changes, lazy sections) previously never
       got a plane, because boot() ran exactly once (#272). */
    let observer: MutationObserver | null = null;
    // Deferred so a node that is removed and re-inserted in the same task (a
    // move) keeps its plane instead of tearing it down and rebuilding.
    let sweepTimer: ReturnType<typeof setTimeout> | null = null;
    if (typeof MutationObserver !== "undefined") {
      const scheduleRemovalSweep = () => {
        if (sweepTimer !== null) clearTimeout(sweepTimer);
        sweepTimer = setTimeout(() => {
          sweepTimer = null;
          if (isDisposed) return;
          const live = new Set(
            Array.from(document.querySelectorAll<HTMLElement>(GL_TARGET_SELECTOR))
          );
          const stale = store.filter((m) => !live.has(m.el));
          if (!stale.length) return;
          stale.forEach((m) => {
            scene.remove(m.mesh);
            m.mat.uniforms.uTexture.value?.dispose();
            m.texture?.dispose();
            m.mat.dispose();
            m.destroy?.();
          });
          for (let i = store.length - 1; i >= 0; i--) {
            if (stale.includes(store[i])) store.splice(i, 1);
          }
          resize();
        }, 0);
      };

      observer = new MutationObserver((records) => {
        if (isDisposed) return;
        for (const r of records) {
          if (r.type !== "childList") continue;
          r.addedNodes.forEach((node) => {
            if (node.nodeType !== 1) return;
            const added = addPlanesFor(node as HTMLElement);
            if (added.length) ensureLoop();
          });
          if (r.removedNodes.length) scheduleRemovalSweep();
        }
      });
      observer.observe(document.body, { childList: true, subtree: true });
    }

    // ---- Cleanup ----
    return () => {
      isDisposed = true;
      observer?.disconnect();
      if (sweepTimer !== null) clearTimeout(sweepTimer);
      if (rafId !== null) {
        cancelAnimationFrame(rafId);
      }
      canvas.removeEventListener("webglcontextlost", handleContextLost);
      canvas.removeEventListener("webglcontextrestored", handleContextRestored);
      window.removeEventListener("resize", resize);
      store.forEach((entry) => {
        scene.remove(entry.mesh);
        entry.mat.uniforms.uTexture.value?.dispose();
        entry.mat.dispose();
        entry.destroy?.();
      });
      geometry.dispose();
      renderer.dispose();
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      aria-hidden="true"
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        width: "100%",
        height: "100%",
        zIndex: 0,
        pointerEvents: "none",
      }}
    />
  );
}