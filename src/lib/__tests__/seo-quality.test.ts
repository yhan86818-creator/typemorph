import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';
import { INDEXED_EN_SLUGS, INDEXED_JP_SLUGS } from '../seo';

describe('SEO Index Quality Enforcement', () => {
  const manualEnDir = path.join(process.cwd(), 'scripts', 'manual_content', 'en');
  const manualJpDir = path.join(process.cwd(), 'scripts', 'manual_content', 'jp');

  it('enforces that every indexed English slug has a high-quality manual content page', () => {
    expect(INDEXED_EN_SLUGS.size).toBeGreaterThan(0);

    for (const slug of INDEXED_EN_SLUGS) {
      const filePath = path.join(manualEnDir, `${slug}.html`);
      
      // Rule 1: High-quality manual page must exist
      const fileExists = fs.existsSync(filePath);
      expect(fileExists, `Whitelisted slug "${slug}" is missing a manual content file at scripts/manual_content/en/${slug}.html`).toBe(true);

      const content = fs.readFileSync(filePath, 'utf8');

      // Rule 2: Must contain code examples (Input/Output or standard pre/code blocks)
      const hasCodeBlock = content.includes('<code') || content.includes('<pre');
      expect(hasCodeBlock, `SEO page for "${slug}" must contain code examples (<pre> or <code> blocks) for developers`).toBe(true);

      // Rule 3: Must not contain legacy branding "TypeFlow"
      const hasLegacyBranding = content.toLowerCase().includes('typeflow');
      expect(hasLegacyBranding, `SEO page for "${slug}" contains legacy "TypeFlow" branding`).toBe(false);

      // Rule 4: Must not be a thin generic "Dev Diary" template page
      const isDevDiaryTemplate = content.includes('Dev Diary') || content.includes('Dev Diary:');
      expect(isDevDiaryTemplate, `SEO page for "${slug}" cannot use the thin "Dev Diary" template structure`).toBe(false);

      // Rule 5: Content volume must be sufficient (>1500 characters for rich topics)
      expect(content.length, `SEO page for "${slug}" has thin content (${content.length} chars, must be > 1500 chars)`).toBeGreaterThan(1500);
    }
  });

  it('enforces that every indexed Japanese slug has a high-quality manual content page', () => {
    expect(INDEXED_JP_SLUGS.size).toBeGreaterThan(0);

    for (const slug of INDEXED_JP_SLUGS) {
      const filePath = path.join(manualJpDir, `${slug}.html`);
      
      // Rule 1: High-quality manual page must exist
      const fileExists = fs.existsSync(filePath);
      expect(fileExists, `Whitelisted Japanese slug "${slug}" is missing a manual content file at scripts/manual_content/jp/${slug}.html`).toBe(true);

      const content = fs.readFileSync(filePath, 'utf8');

      // Rule 2: Must contain code examples
      const hasCodeBlock = content.includes('<code') || content.includes('<pre');
      expect(hasCodeBlock, `Japanese SEO page for "${slug}" must contain code examples (<pre> or <code> blocks)`).toBe(true);

      // Rule 3: Must not contain legacy branding "TypeFlow"
      const hasLegacyBranding = content.toLowerCase().includes('typeflow');
      expect(hasLegacyBranding, `Japanese SEO page for "${slug}" contains legacy "TypeFlow" branding`).toBe(false);

      // Rule 4: Must not be a thin generic "Dev Diary" template page
      const isDevDiaryTemplate = content.includes('Dev Diary') || content.includes('Dev Diary:');
      expect(isDevDiaryTemplate, `Japanese SEO page for "${slug}" cannot use the thin "Dev Diary" template structure`).toBe(false);

      // Rule 5: Content volume must be sufficient (>1500 characters)
      expect(content.length, `Japanese SEO page for "${slug}" has thin content (${content.length} chars, must be > 1500 chars)`).toBeGreaterThan(1500);
    }
  });
});
