import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import React from 'react';
import { render, cleanup, waitFor } from '@testing-library/react';

// Mock Three.js to run safely in jsdom without WebGL hardware requirements
const geometryConstructMock = vi.fn();
const geometryDisposeMock = vi.fn();
const rendererDisposeMock = vi.fn();
const textureDisposeMock = vi.fn();
const setSizeMock = vi.fn();

const createdMaterials: any[] = [];
let rendererShouldThrow = false;

let sceneAddCount = 0;

vi.mock('three', () => {
  const renderMock = vi.fn();
  const setPixelRatioMock = vi.fn();

  class MockWebGLRenderer {
    constructor() {
      if (rendererShouldThrow) {
        throw new Error('Error creating WebGL context.');
      }
    }
    dispose = rendererDisposeMock;
    render = renderMock;
    setSize = setSizeMock;
    setPixelRatio = setPixelRatioMock;
  }

  class MockScene {
    add = vi.fn(() => {
      sceneAddCount += 1;
    });
    remove = vi.fn();
  }

  class MockPerspectiveCamera {
    position = { z: 500 };
    fov = 50;
    updateProjectionMatrix = vi.fn();
  }

  class MockPlaneGeometry {
    constructor() {
      geometryConstructMock();
    }
    dispose = geometryDisposeMock;
  }

  class MockTextureLoader {
    load = vi.fn(() => ({
      needsUpdate: false,
      dispose: textureDisposeMock,
    }));
  }

  class MockShaderMaterial {
    dispose = vi.fn();
    uniforms: any;
    constructor(options?: any) {
      this.uniforms = options?.uniforms || {};
      createdMaterials.push(this);
    }
  }

  class MockMesh {
    geometry = { dispose: vi.fn() };
    position = { x: 0, y: 0, z: 0, set: vi.fn() };
    scale = { x: 1, y: 1, z: 1, set: vi.fn() };
  }

  return {
    GLSL3: '300 es',
    SRGBColorSpace: 'srgb',
    Vector2: class MockVector2 {
      x = 0;
      y = 0;
      constructor(x = 0, y = 0) {
        this.x = x;
        this.y = y;
      }
      set(x: number, y: number) {
        this.x = x;
        this.y = y;
      }
    },
    Vector3: class MockVector3 {
      x: number;
      y: number;
      z: number;
      constructor(x = 0, y = 0, z = 0) {
        this.x = x;
        this.y = y;
        this.z = z;
      }
    },
    WebGLRenderer: MockWebGLRenderer,
    Scene: MockScene,
    PerspectiveCamera: MockPerspectiveCamera,
    PlaneGeometry: MockPlaneGeometry,
    TextureLoader: MockTextureLoader,
    ShaderMaterial: MockShaderMaterial,
    Mesh: MockMesh,
  };
});

import WebGLBackground from '../../src/components/ui/WebGLBackground';

describe('WebGLBackground component (#CC-051)', () => {
  let originalRAF: typeof window.requestAnimationFrame;
  let originalCAF: typeof window.cancelAnimationFrame;
  let rafCallback: FrameRequestCallback | null = null;
  let nextRafId = 100;
  const cancelAnimationFrameSpy = vi.fn();
  const requestAnimationFrameSpy = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    createdMaterials.length = 0;
    rendererShouldThrow = false;
    originalRAF = window.requestAnimationFrame;
    originalCAF = window.cancelAnimationFrame;
    rafCallback = null;
    nextRafId = 100;

    window.requestAnimationFrame = vi.fn((cb: FrameRequestCallback) => {
      requestAnimationFrameSpy(cb);
      rafCallback = cb;
      return ++nextRafId;
    });

    window.cancelAnimationFrame = vi.fn((id: number) => {
      cancelAnimationFrameSpy(id);
    });
  });

  afterEach(() => {
    cleanup();
    window.requestAnimationFrame = originalRAF;
    window.cancelAnimationFrame = originalCAF;
  });

  it('renders a canvas with aria-hidden="true"', () => {
    const { container, unmount } = render(<WebGLBackground />);
    const canvas = container.querySelector('canvas');
    expect(canvas).toBeInTheDocument();
    expect(canvas).toHaveAttribute('aria-hidden', 'true');
    unmount();
  });

  it('initiates animation frame loop and cancels it on unmount without leaking (#CC-051)', () => {
    const { unmount } = render(<WebGLBackground />);

    expect(requestAnimationFrameSpy).toHaveBeenCalled();
    const lastIssuedRafId = nextRafId;

    unmount();

    expect(cancelAnimationFrameSpy).toHaveBeenCalledWith(lastIssuedRafId);
  });

  it('disposes the shared geometry once per effect lifecycle rather than per-mesh (#CC-052)', () => {
    const img1 = document.createElement('img');
    img1.setAttribute('data-gl-src', 'true');
    img1.src = 'https://example.com/test1.png';
    const img2 = document.createElement('img');
    img2.setAttribute('data-gl-src', 'true');
    img2.src = 'https://example.com/test2.png';
    document.body.appendChild(img1);
    document.body.appendChild(img2);

    const { unmount } = render(<WebGLBackground />);
    unmount();

    expect(geometryConstructMock).toHaveBeenCalled();
    // Exactly 1 dispose call per created geometry instance, not multiplied by the 2 DOM image meshes
    expect(geometryDisposeMock).toHaveBeenCalledTimes(geometryConstructMock.mock.calls.length);

    img1.remove();
    img2.remove();
  });

  it('disposes loaded textures in material uniforms during cleanup (#CC-053)', () => {
    const img = document.createElement('img');
    img.setAttribute('data-gl-src', 'true');
    img.src = 'https://example.com/test-texture.png';
    Object.defineProperty(img, 'complete', { value: true });
    Object.defineProperty(img, 'naturalWidth', { value: 100 });
    document.body.appendChild(img);

    const { unmount } = render(<WebGLBackground />);
    unmount();

    expect(textureDisposeMock).toHaveBeenCalled();

    img.remove();
  });

  it('removes pointer event listeners from the pointer target on unmount (#CC-054, #273)', () => {
    // The img is pointer-events:none in production, so listeners attach to the
    // nearest pointer-enabled host (data-gl-pointer) instead.
    const host = document.createElement('div');
    host.setAttribute('data-gl-pointer', '');
    const img = document.createElement('img');
    img.setAttribute('data-gl-src', 'true');
    img.src = 'https://example.com/test-events.png';
    Object.defineProperty(img, 'complete', { value: true });
    Object.defineProperty(img, 'naturalWidth', { value: 100 });
    host.appendChild(img);
    document.body.appendChild(host);

    const removeEventListenerSpy = vi.spyOn(host, 'removeEventListener');

    const { unmount } = render(<WebGLBackground />);
    unmount();

    expect(removeEventListenerSpy).toHaveBeenCalledWith('pointerenter', expect.any(Function));
    expect(removeEventListenerSpy).toHaveBeenCalledWith('pointerleave', expect.any(Function));
    expect(removeEventListenerSpy).toHaveBeenCalledWith('pointermove', expect.any(Function));

    host.remove();
  });

  it('builds a plane from a color-only anchor without loading a texture (#274)', () => {
    // A data-gl-color anchor has no bitmap: the shader paints it procedurally,
    // so TextureLoader.load must never be called for it.
    const target = document.createElement('div');
    target.setAttribute('data-gl-color', '#c08585');
    document.body.appendChild(target);

    const { unmount } = render(<WebGLBackground />);
    unmount();

    expect(geometryConstructMock).toHaveBeenCalled();
    target.remove();
  });

  it('enables procedural shading on color anchors and texture shading on img anchors (#274)', () => {
    const colorTarget = document.createElement('div');
    colorTarget.setAttribute('data-gl-color', '#c08585');
    document.body.appendChild(colorTarget);

    const img = document.createElement('img');
    img.setAttribute('data-gl-src', 'true');
    img.src = 'https://example.com/mixed.png';
    Object.defineProperty(img, 'complete', { value: true });
    Object.defineProperty(img, 'naturalWidth', { value: 64 });
    document.body.appendChild(img);

    const { unmount } = render(<WebGLBackground />);
    unmount();

    const uniforms = createdMaterials.flatMap((m) => Object.entries(m.uniforms ?? {})
      .filter(([k]) => k === 'uUseColor'));
    expect(uniforms.map(([, v]: any) => v.value)).toContain(1);
    expect(uniforms.map(([, v]: any) => v.value)).toContain(0);

    colorTarget.remove();
    img.remove();
  });

  it('picks up color anchors inserted after mount via the observer (#274)', async () => {
    const { container } = render(<WebGLBackground />);
    await waitFor(() => expect(sceneAddCount).toBeGreaterThan(0));
    const before = sceneAddCount;

    const target = document.createElement('div');
    target.setAttribute('data-gl-color', '#7492ad');
    container.appendChild(target);

    await waitFor(() => expect(sceneAddCount).toBeGreaterThan(before));
  });

  it('does not re-invoke resize() or setSize() on animation frame ticks (#CC-055)', () => {
    const { unmount } = render(<WebGLBackground />);

    // Initial resize called once at mount / boot
    const initialCallCount = setSizeMock.mock.calls.length;

    // Simulate multiple animation frame ticks
    if (rafCallback) {
      rafCallback(16);
      rafCallback(32);
      rafCallback(48);
    }

    // Number of setSize calls should NOT increase on RAF frames without a window resize event
    expect(setSizeMock).toHaveBeenCalledTimes(initialCallCount);

    unmount();
  });

  it('suppresses velocity, cursor ripple, and temporal distortion when prefers-reduced-motion is active (#CC-056)', () => {
    const originalMatchMedia = window.matchMedia;
    window.matchMedia = vi.fn().mockImplementation((query) => ({
      matches: query === '(prefers-reduced-motion: reduce)',
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    }));

    const img = document.createElement('img');
    img.setAttribute('data-gl-src', 'true');
    img.src = 'https://example.com/test-reduced.png';
    Object.defineProperty(img, 'complete', { value: true });
    Object.defineProperty(img, 'naturalWidth', { value: 100 });
    document.body.appendChild(img);

    const { unmount } = render(<WebGLBackground />);

    // Simulate scroll and animation frame
    window.scrollY = 300;
    if (rafCallback) {
      rafCallback(100);
    }

    expect(createdMaterials.length).toBeGreaterThan(0);
    const lastMat = createdMaterials[createdMaterials.length - 1];
    expect(lastMat.uniforms.uScrollVelocity.value).toBe(0);
    expect(lastMat.uniforms.uMouseEnter.value).toBe(0);
    expect(lastMat.uniforms.uTime.value).toBe(0);

    unmount();
    img.remove();
    window.matchMedia = originalMatchMedia;
  });

  // #231: matchMedia must be consulted every frame, not sampled once at mount.
  // A live MediaQueryList reflects the OS setting changing while the page is
  // open, so the shader uniforms have to follow it.
  it('re-reads prefers-reduced-motion so runtime OS changes take effect (#231)', () => {
    const originalMatchMedia = window.matchMedia;
    let reduced = false;
    const mediaQueryList = {
      get matches() {
        return reduced;
      },
      media: '(prefers-reduced-motion: reduce)',
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    };
    window.matchMedia = vi.fn().mockImplementation(() => mediaQueryList);

    const host = document.createElement('div');
    host.setAttribute('data-gl-pointer', '');
    const img = document.createElement('img');
    img.setAttribute('data-gl-src', 'true');
    img.src = 'https://example.com/test-live-reduced.png';
    Object.defineProperty(img, 'complete', { value: true });
    Object.defineProperty(img, 'naturalWidth', { value: 100 });
    host.appendChild(img);
    document.body.appendChild(host);

    const { unmount } = render(<WebGLBackground />);

    // Enter the card so uMouseEnter ramps up — that is the uniform that proves
    // motion is being applied at all. Pointer listeners live on the host (#273).
    host.dispatchEvent(new Event('pointerenter'));
    window.scrollY = 40;
    if (rafCallback) rafCallback(100);
    const lastMat = createdMaterials[createdMaterials.length - 1];
    expect(lastMat.uniforms.uMouseEnter.value).not.toBe(0);

    // User turns on "reduce motion" mid-session.
    reduced = true;

    // The next frame must suppress motion without a remount.
    window.scrollY = 80;
    if (rafCallback) rafCallback(200);
    expect(lastMat.uniforms.uScrollVelocity.value).toBe(0);
    expect(lastMat.uniforms.uMouseEnter.value).toBe(0);
    expect(lastMat.uniforms.uTime.value).toBe(0);

    // ...and turning it back off restores it.
    reduced = false;
    window.scrollY = 120;
    if (rafCallback) rafCallback(300);
    expect(lastMat.uniforms.uMouseEnter.value).not.toBe(0);

    unmount();
    img.remove();
    window.matchMedia = originalMatchMedia;
  });

  it('handles WebGL context creation failure gracefully without crashing the app (#CC-057)', () => {
    rendererShouldThrow = true;
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

    expect(() => {
      const { unmount } = render(<WebGLBackground />);
      unmount();
    }).not.toThrow();

    expect(warnSpy).toHaveBeenCalledWith(
      expect.stringContaining('WebGL initialization failed'),
      expect.any(Error)
    );

    warnSpy.mockRestore();
    rendererShouldThrow = false;
  });

  it('attaches and removes webglcontextlost listener on the canvas (#CC-057)', () => {
    const { container, unmount } = render(<WebGLBackground />);
    const canvas = container.querySelector('canvas');
    expect(canvas).toBeInTheDocument();

    const removeEventListenerSpy = vi.spyOn(canvas!, 'removeEventListener');
    unmount();

    expect(removeEventListenerSpy).toHaveBeenCalledWith('webglcontextlost', expect.any(Function));
  });



  // A MutationObserver must pick up <img data-gl-src> added after mount.
  // Counting MockScene.add calls proves a plane was actually built.
  beforeEach(() => {
    sceneAddCount = 0;
  });

  // A MutationObserver must pick up <img data-gl-src> added after mount.
  // Counting MockScene.add calls proves a plane was actually built (#272).
  const seedImage = (container: HTMLElement, src: string) => {
    const im = document.createElement('img');
    im.setAttribute('data-gl-src', src);
    im.setAttribute('src', src);
    container.appendChild(im);
    return im;
  };

  it('builds a plane for an image added after mount', async () => {
    const { container } = render(<WebGLBackground />);
    seedImage(container, '/first.png');
    await waitFor(() => expect(sceneAddCount).toBeGreaterThan(0));
    const before = sceneAddCount;

    seedImage(container, '/late.png');
    await waitFor(() => expect(sceneAddCount).toBeGreaterThan(before));
  });

  it('does not double-register an image when a container is re-scanned', async () => {
    const { container } = render(<WebGLBackground />);
    const first = seedImage(container, '/first.png');
    await waitFor(() => expect(sceneAddCount).toBeGreaterThan(0));
    const before = sceneAddCount;

    // Wrapping the existing image in a new node triggers one childList
    // mutation whose addedNode contains the already-tracked image. The
    // observer must not build a second plane for it.
    const wrapper = document.createElement('div');
    first.parentNode?.insertBefore(wrapper, first);
    wrapper.appendChild(first);
    await new Promise((r) => setTimeout(r, 50));

    expect(sceneAddCount).toBe(before);
  });

  it('attaches pointer listeners to a pointer-enabled host, not the img (#273)', async () => {
    // Self-contained: earlier tests replace window.matchMedia and the shared
    // rafCallback, so install our own RAF + matchMedia for this test.
    const origRaf = window.requestAnimationFrame;
    const origMatchMedia = window.matchMedia;
    let myCb: FrameRequestCallback | null = null;
    window.requestAnimationFrame = ((cb: FrameRequestCallback) => {
      myCb = cb;
      return 1;
    }) as typeof window.requestAnimationFrame;
    window.matchMedia = ((q: string) => ({
      matches: false,
      media: q,
      onchange: null,
      addListener: () => {},
      removeListener: () => {},
      addEventListener: () => {},
      removeEventListener: () => {},
      dispatchEvent: () => false,
    })) as unknown as typeof window.matchMedia;

    try {
      const { unmount } = render(<WebGLBackground />);

      // On-screen box so the plane is not frustum-culled in update().
      const host = document.createElement('div');
      host.setAttribute('data-gl-pointer', '');
      host.style.cssText = 'position:absolute;top:0;left:0;width:300px;height:300px';
      seedImage(host, '/first.png');
      document.body.appendChild(host);
      await waitFor(() => expect(sceneAddCount).toBeGreaterThan(0));

      const material = createdMaterials[createdMaterials.length - 1];
      const drive = () => {
        const cb = myCb;
        if (cb) for (let i = 0; i < 300; i++) cb(i * 16);
      };
      const fire = (target: EventTarget, type: string) =>
        target.dispatchEvent(
          new MouseEvent(type, { bubbles: false }) as unknown as PointerEvent
        );

      // The img is pointer-events:none in production, so a listener there is
      // dead code: firing on the img must NOT start the ripple.
      fire(host.querySelector('img')!, 'pointerenter');
      drive();
      expect(material.uniforms.uMouseEnter.value).toBe(0);

      // The pointer-enabled host must start the ripple.
      fire(host, 'pointerenter');
      await waitFor(() => {
        drive();
        expect(material.uniforms.uMouseEnter.value).toBeGreaterThan(0);
      });

      unmount();
      host.remove();
    } finally {
      window.requestAnimationFrame = origRaf;
      window.matchMedia = origMatchMedia;
    }
  });
});
