import { Style, Avatar } from '@dicebear/core';
import definition from '@dicebear/styles/voxel-art.json' with { type: 'json' };
import { OPCIONES_AVATAR } from './avatares-opciones.mjs';

const estilo = new Style(definition);
const cache = new Map();
const MAXIMO_EN_CACHE = 500;

export function svgDeAvatar(semilla) {
  const clave =
    String(semilla ?? '')
      .trim()
      .toLowerCase() || 'sin-nombre';
  if (cache.has(clave)) return cache.get(clave);
  const svg = new Avatar(estilo, { ...OPCIONES_AVATAR, seed: clave }).toString();
  if (cache.size >= MAXIMO_EN_CACHE) cache.delete(cache.keys().next().value);
  cache.set(clave, svg);
  return svg;
}

if (typeof window !== 'undefined') {
  window.StudentScope = window.StudentScope || {};
  window.StudentScope.avatar = svgDeAvatar;
}
