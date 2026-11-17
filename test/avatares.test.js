import { describe, expect, it } from 'vitest';
import { svgDeAvatar } from '../scripts/avatares-entrada.mjs';

describe('svgDeAvatar', () => {
  it('devuelve un SVG', () => {
    const svg = svgDeAvatar('ana@example.test');
    expect(svg.startsWith('<svg')).toBe(true);
    expect(svg.trimEnd().endsWith('</svg>')).toBe(true);
  });

  it('es estable para la misma persona, sin importar mayúsculas ni espacios', () => {
    expect(svgDeAvatar('Ana@Example.test ')).toBe(svgDeAvatar('ana@example.test'));
  });

  it('da avatares distintos a personas distintas', () => {
    expect(svgDeAvatar('ana@example.test')).not.toBe(svgDeAvatar('luis@example.test'));
  });

  it('tolera valores vacíos', () => {
    expect(svgDeAvatar('').startsWith('<svg')).toBe(true);
    expect(svgDeAvatar(null)).toBe(svgDeAvatar(undefined));
  });

  it('no incluye la semilla ni código ejecutable en el resultado', () => {
    const hostil = '"><script>alert(1)</script><img onerror=x>';
    const svg = svgDeAvatar(hostil);
    expect(svg).not.toContain('alert(1)');
    for (let i = 0; i < 50; i++) {
      expect(svgDeAvatar(`usuario${i}@example.test`)).not.toMatch(/<script|onload=|onerror=|javascript:/i);
    }
  });
});
