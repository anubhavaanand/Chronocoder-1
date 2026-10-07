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
 *   - Planes are created for each `img[data-gl-src]` element in the DOM
 *   - ResizeObserver keeps plane positions synced to DOM layout
 *   - Native scroll via window.scrollY — no dependency on Lenis or other libs
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
in vec2 vUv;
in vec2 vUvCover;
out vec4 outColor;

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

  vec3 col = texture(uTexture, tc).rgb;

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
  domEl: HTMLImageElement;
  measure: () => void;
  update: (scrollY: number, vel: number, time: number) => void;
  el: HTMLImageElement;
  enter: number;
  over: { cx: number; cy: number; tx: number; ty: number };
  tEnter: number;
  b: DOMRect;
  top: number;
  left: number;
  w: number;
  h: number;
  mat: THREE.ShaderMaterial;
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
    const renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));

    // ---- Scene / Camera ----
    const scene = new THREE.Scene();
    const CAMERA_POS = 500;

    const calcFov = (z: number) => 2 * Math.atan((window.innerHeight / 2) / z) * (180 / Math.PI);
    const camera = new THREE.PerspectiveCamera(50, window.innerWidth / window.innerHeight, 10, 1000);
    camera.position.z = CAMERA_POS;
    camera.fov = calcFov(CAMERA_POS);
    camera.updateProjectionMatrix();

    const geometry = new THREE.PlaneGeometry(1, 1, 28, 28);
    const loader = new THREE.TextureLoader();
    const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
    const store: PlaneEntry[] = [];

    /* ---- Media class: one instance per img[data-gl-src] ---- */
    class Media implements PlaneEntry {
      el: HTMLImageElement;
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
      domEl: HTMLImageElement;

      constructor(el: HTMLImageElement) {
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
          },
        });
        this.material = this.mat;

        this.mesh = new THREE.Mesh(geometry, this.mat);
        scene.add(this.mesh);

        this.mat.uniforms.uTexture.value = loader.load(el.src, (tex) => {
          tex.colorSpace = THREE.SRGBColorSpace;
          this.mat.uniforms.uTextureSize.value.set(tex.image.width, tex.image.height);
        });

        /* Pointer events on the invisible DOM image */
        el.addEventListener("pointerenter", () => { this.tEnter = 1; });
        el.addEventListener("pointerleave", () => { this.tEnter = 0; this.over.tx = 0.5; this.over.ty = 0.5; });
        el.addEventListener("pointermove", (e: PointerEvent) => {
          const b = el.getBoundingClientRect();
          this.over.tx = (e.clientX - b.left) / b.width;
          this.over.ty = (e.clientY - b.top) / b.height;
        });

        this.measure();
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

        const u = this.mat.uniforms;
        u.uScrollVelocity.value = vel;
        u.uMouseEnter.value = this.enter;
        u.uMouseOverPos.value.set(this.over.cx, this.over.cy);
        u.uTime.value = time;
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

    /* ---- Boot: build Media instances then run RAF ---- */
    let prevY = window.scrollY, vel = 0;

    function boot() {
      Array.from(document.querySelectorAll<HTMLImageElement>("img[data-gl-src]")).forEach((im) => store.push(new Media(im)));

      (function frame(t?: number) {
        requestAnimationFrame(frame);
        resize();
        const time = (t || 0) / 1000;
        const y = window.scrollY;
        const raw = y - prevY;
        prevY = y;
        vel = lerp(vel, raw * 0.065, 0.1);
        store.forEach((m) => m.update(y, vel, time));
        renderer.render(scene, camera);
      })();
    }

    /* Wait for all img[data-gl-src] textures to have natural dimensions */
    (function whenReady(cb: () => void) {
      const imgs = Array.from(document.querySelectorAll<HTMLImageElement>("img[data-gl-src]"));
      let n = 0;
      const total = imgs.length;
      const done = () => { if (++n >= total) cb(); };
      imgs.forEach((im) => {
        if (im.complete && im.naturalWidth) done();
        else { im.onload = done; im.onerror = done; }
      });
      if (!total) cb();
    })(boot);

    // ---- Reduced motion ----
    const prefersReduced = window.matchMedia("(prefers-reduced-motion: reduce)");
    // Note: gallery keeps grain even with reduced motion, only disables transforms
    // We'll keep grain but could disable if needed

    // ---- Cleanup ----
    return () => {
      window.removeEventListener("resize", resize);
      store.forEach(({ mesh, mat }) => {
        scene.remove(mesh);
        mesh.geometry.dispose();
        mat.dispose();
      });
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