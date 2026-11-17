/**
 * Root layout metadata tests (#199).
 *
 * The layout had openGraph/twitter metadata but no metadataBase and no
 * images, so social share cards had no preview and relative URLs couldn't
 * resolve. This asserts metadataBase and OG/Twitter images are present.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import React from 'react';

vi.mock('next/font/local', () => ({
  default: () => ({ variable: '--font-jetbrains' }),
}));

import { metadata } from '@/app/layout';

describe('root layout metadata', () => {
  const originalAppUrl = process.env.NEXT_PUBLIC_APP_URL;

  afterEach(() => {
    if (originalAppUrl === undefined) delete process.env.NEXT_PUBLIC_APP_URL;
    else process.env.NEXT_PUBLIC_APP_URL = originalAppUrl;
  });

  it('defines metadataBase as an absolute URL (#199)', () => {
    const metadataBase = metadata.metadataBase as URL;
    expect(metadataBase).toBeInstanceOf(URL);
    expect(metadataBase.protocol).toBe('https:');
  });

  it('has openGraph images with explicit dimensions (#199)', () => {
    const og = metadata.openGraph as Record<string, unknown>;
    expect(Array.isArray(og.images)).toBe(true);
    const images = og.images as Array<Record<string, unknown>>;
    expect(images.length).toBeGreaterThan(0);
    expect(images[0].url).toBe('/og.png');
    expect(images[0].width).toBe(1200);
    expect(images[0].height).toBe(630);
  });

  it('has twitter images (#199)', () => {
    const twitter = metadata.twitter as Record<string, unknown>;
    expect(twitter.card).toBe('summary_large_image');
    expect(twitter.images).toEqual(['/og.png']);
  });
});