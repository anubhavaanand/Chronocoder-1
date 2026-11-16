/**
 * HeroDistortion Component & Utilities Unit Tests
 *
 * Covers:
 * - Color normalization for SVG gradient builder (#CC-062)
 * - mentorTextureSrc data URI generation for hex, rgb, hsl, named, and modern color strings
 * - MentorGLTarget rendering with correct data-gl attributes
 * - HeroGLTarget rendering
 * - ScrollIndicator rendering
 */

import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import {
  normalizeColorForSvg,
  mentorTextureSrc,
  MentorGLTarget,
  HeroGLTarget,
  ScrollIndicator,
} from '@/components/mentor/HeroDistortion';

describe('HeroDistortion', () => {
  describe('normalizeColorForSvg (#CC-062)', () => {
    it('preserves valid hex colors with leading #', () => {
      expect(normalizeColorForSvg('#c08585')).toBe('#c08585');
      expect(normalizeColorForSvg('#fff')).toBe('#fff');
      expect(normalizeColorForSvg('#11223344')).toBe('#11223344');
    });

    it('adds leading # to hex strings without hash', () => {
      expect(normalizeColorForSvg('c08585')).toBe('#c08585');
      expect(normalizeColorForSvg('abc')).toBe('#abc');
    });

    it('preserves rgb and rgba color strings', () => {
      expect(normalizeColorForSvg('rgb(100, 150, 200)')).toBe('rgb(100, 150, 200)');
      expect(normalizeColorForSvg('rgba(10, 20, 30, 0.5)')).toBe('rgba(10, 20, 30, 0.5)');
    });

    it('preserves hsl and hsla color strings', () => {
      expect(normalizeColorForSvg('hsl(200, 80%, 50%)')).toBe('hsl(200, 80%, 50%)');
    });

    it('preserves standard named colors', () => {
      expect(normalizeColorForSvg('purple')).toBe('purple');
      expect(normalizeColorForSvg('cyan')).toBe('cyan');
    });

    it('gracefully falls back for unsupported oklch or color expressions', () => {
      expect(normalizeColorForSvg('oklch(72% 0.18 165)')).toBe('#4f46e5');
      expect(normalizeColorForSvg('color(display-p3 1 0 0)')).toBe('#4f46e5');
    });

    it('handles empty or non-string inputs safely', () => {
      expect(normalizeColorForSvg('')).toBe('#4f46e5');
      expect(normalizeColorForSvg(null as unknown as string)).toBe('#4f46e5');
      expect(normalizeColorForSvg(undefined as unknown as string)).toBe('#4f46e5');
    });
  });

  describe('mentorTextureSrc', () => {
    it('produces valid base64 SVG data URI containing the normalized color', () => {
      const srcHex = mentorTextureSrc('#c08585');
      expect(srcHex).toMatch(/^data:image\/svg\+xml;base64,/);

      const base64Data = srcHex.replace('data:image/svg+xml;base64,', '');
      const decodedSvg = atob(base64Data);
      expect(decodedSvg).toContain('stop-color="#c08585"');
    });

    it('correctly builds SVG data URI when given non-hex rgb accent color', () => {
      const srcRgb = mentorTextureSrc('rgb(255, 100, 50)');
      const base64Data = srcRgb.replace('data:image/svg+xml;base64,', '');
      const decodedSvg = atob(base64Data);
      expect(decodedSvg).toContain('stop-color="rgb(255, 100, 50)"');
      expect(decodedSvg).not.toContain('#rgb');
    });
  });

  describe('MentorGLTarget', () => {
    it('renders an invisible headless texture anchor for WebGL', () => {
      const { container } = render(
        <MentorGLTarget mentorId="ada_lovelace" accentColor="#c08585" />
      );
      const img = container.querySelector('img');
      expect(img).toBeInTheDocument();
      expect(img).toHaveAttribute('data-gl-mentor', 'ada_lovelace');
      expect(img).toHaveAttribute('data-gl-src');
      expect(img).toHaveAttribute('aria-hidden', 'true');
    });
  });

  describe('HeroGLTarget', () => {
    it('renders hero background target with deep space SVG', () => {
      const { container } = render(<HeroGLTarget />);
      const img = container.querySelector('img');
      expect(img).toBeInTheDocument();
      expect(img).toHaveAttribute('data-gl-target', 'hero');
      expect(img).toHaveAttribute('data-gl-src');
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
