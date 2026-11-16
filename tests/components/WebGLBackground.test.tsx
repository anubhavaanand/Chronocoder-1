import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import React from 'react';
import { render, cleanup } from '@testing-library/react';

// Mock Three.js to run safely in jsdom without WebGL hardware requirements
const geometryConstructMock = vi.fn();
const geometryDisposeMock = vi.fn();
const rendererDisposeMock = vi.fn();
const textureDisposeMock = vi.fn();

vi.mock('three', () => {
  const renderMock = vi.fn();
  const setSizeMock = vi.fn();
  const setPixelRatioMock = vi.fn();

  class MockWebGLRenderer {
    dispose = rendererDisposeMock;
    render = renderMock;
    setSize = setSizeMock;
    setPixelRatio = setPixelRatioMock;
  }

  class MockScene {
    add = vi.fn();
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
});
