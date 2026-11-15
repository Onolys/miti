import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

function luminance(hex: string): number {
  const rgb = hex.match(/[a-f\d]{2}/gi)!.map((channel) => {
    const value = parseInt(channel, 16) / 255;
    return value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * rgb[0] + 0.7152 * rgb[1] + 0.0722 * rgb[2];
}

describe('foundation tokens', () => {
  it('keeps the accent readable on white for text and button labels', () => {
    const tokens = readFileSync(new URL('./tokens.css', import.meta.url), 'utf8');
    const accent = tokens.match(/--color-accent:\s*(#[a-f\d]{6})/i)?.[1];
    expect(accent).toBeDefined();
    expect(1.05 / (luminance(accent!) + 0.05)).toBeGreaterThanOrEqual(4.5);
    expect(tokens).toMatch(/--gutter:\s*16px/);
  });
});
