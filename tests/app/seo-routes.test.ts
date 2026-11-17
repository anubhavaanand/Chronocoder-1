/**
 * SEO routes tests (#200): sitemap.xml and robots.txt.
 */

import { describe, it, expect } from 'vitest';
import sitemap from '@/app/sitemap';
import robots from '@/app/robots';
import { MENTORS } from '@/data/mentors';

describe('sitemap', () => {
  it('includes the landing page', () => {
    const entries = sitemap();
    const home = entries.find((e) => e.url === 'https://chronocoder-1.onrender.com');
    expect(home).toBeTruthy();
    expect(home!.priority).toBe(1);
  });

  it('includes every mentor workspace', () => {
    const entries = sitemap();
    const urls = entries.map((e) => e.url);
    for (const mentor of MENTORS) {
      expect(urls).toContain(`https://chronocoder-1.onrender.com/workspace/${mentor.id}`);
    }
    expect(entries.length).toBe(MENTORS.length + 1);
  });
});

describe('robots', () => {
  it('allows all and disallows private routes', () => {
    const cfg = robots();
    expect(cfg.rules).toBeTruthy();
    const rule = Array.isArray(cfg.rules) ? cfg.rules[0] : cfg.rules;
    expect(rule).toMatchObject({ userAgent: '*', allow: '/' });
    expect((rule as { disallow: string[] }).disallow).toEqual(
      expect.arrayContaining(['/api/', '/health'])
    );
  });

  it('points at the sitemap', () => {
    const cfg = robots();
    expect(cfg.sitemap).toBe('https://chronocoder-1.onrender.com/sitemap.xml');
  });
});