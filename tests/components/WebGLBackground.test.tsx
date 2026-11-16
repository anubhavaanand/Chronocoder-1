import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import React from 'react';
import { render, cleanup } from '@testing-library/react';

// Mock Three.js to run safely in jsdom without WebGL hardware requirements
vi.mock('three', () => {
  const disposeMock = vi.fn();
  const renderMock = vi.fn();
  const setSizeMock = vi.fn();
  const setPixelRatioMock = vi.fn();

  class MockWebGLRenderer {
    dispose = disposeMock;
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
    dispose = vi.fn();
  }

  class MockTextureLoader {
    load = vi.fn(() => ({
      needsUpdate: false,
      dispose: vi.fn(),
    }));
  }

  return {
    WebGLRenderer: MockWebGLRenderer,
    Scene: MockScene,
    PerspectiveCamera: MockPerspectiveCamera,
    PlaneGeometry: MockPlaneGeometry,
    TextureLoader: MockTextureLoader,
    ShaderMaterial: vi.fn().mockImplementation(() => ({
      dispose: vi.fn(),
      uniforms: {
        uTexture: { value: null },
      },
    })),
    Mesh: vi.fn().mockImplementation(() => ({
      geometry: { dispose: vi.fn() },
      position: { x: 0, y: 0, z: 0, set: vi.fn() },
      scale: { x: 1, y: 1, z: 1, set: vi.fn() },
    })),
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
    const { container } = render(<WebGLBackground />);
    const canvas = container.querySelector('canvas');
    expect(canvas).toBeInTheDocument();
    expect(canvas).toHaveAttribute('aria-hidden', 'true');
  });

  it('initiates animation frame loop and cancels it on unmount without leaking (#CC-051)', () => {
    const { unmount } = render(<WebGLBackground />);

    expect(requestAnimationFrameSpy).toHaveBeenCalled();
    const lastIssuedRafId = nextRafId;

    unmount();

    expect(cancelAnimationFrameSpy).toHaveBeenCalledWith(lastIssuedRafId);
  });
});
