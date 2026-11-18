/**
 * HeroDistortion Component Tests
 *
 * Covers:
 * - MentorGLTarget / HeroGLTarget render color-only anchors (#274)
 * - No <img> is emitted, so no hidden bitmap gets decoded
 * - ScrollIndicator rendering
 */

import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import {
  MentorGLTarget,
  HeroGLTarget,
  ScrollIndicator,
} from '@/components/mentor/HeroDistortion';

describe('HeroDistortion', () => {
  describe('MentorGLTarget', () => {
    it('renders a color-only anchor carrying the accent color', () => {
      const { container } = render(
        <MentorGLTarget mentorId="ada_lovelace" accentColor="#c08585" />
      );
      const el = container.querySelector('[data-gl-color]');
      expect(el).toBeInTheDocument();
      expect(el).toHaveAttribute('data-gl-color', '#c08585');
      expect(el).toHaveAttribute('data-gl-mentor', 'ada_lovelace');
      expect(el).toHaveAttribute('aria-hidden', 'true');
    });

    it('renders no <img>, so no hidden image is decoded (#274)', () => {
      const { container } = render(
        <MentorGLTarget mentorId="ada_lovelace" accentColor="#c08585" />
      );
      expect(container.querySelector('img')).toBeNull();
      expect(container.querySelector('svg')).toBeNull();
    });

    it('is positioned behind card content and does not intercept pointers', () => {
      const { container } = render(
        <MentorGLTarget mentorId="grace_hopper" accentColor="rgb(255, 100, 50)" />
      );
      const el = container.querySelector<HTMLElement>('[data-gl-color]')!;
      expect(el.style.position).toBe('absolute');
      expect(el.style.zIndex).toBe('-1');
      expect(el.style.pointerEvents).toBe('none');
    });
  });

  describe('HeroGLTarget', () => {
    it('renders a color-only hero anchor', () => {
      const { container } = render(<HeroGLTarget />);
      const el = container.querySelector('[data-gl-color]');
      expect(el).toBeInTheDocument();
      expect(el).toHaveAttribute('data-gl-target', 'hero');
      expect(el).toHaveAttribute('aria-hidden', 'true');
    });

    it('renders no <img> for the hero backdrop (#274)', () => {
      const { container } = render(<HeroGLTarget />);
      expect(container.querySelector('img')).toBeNull();
    });
  });

  describe('ScrollIndicator', () => {
    it('renders floating scroll indicator SVG', () => {
      const { container } = render(<ScrollIndicator />);
      const svg = container.querySelector('svg');
      expect(svg).toBeInTheDocument();
      expect(container.firstChild).toHaveClass('animate-float');
    });
  });
});