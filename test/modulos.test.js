import { describe, expect, it } from 'vitest';
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const raiz = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const carpetaModulos = join(raiz, 'js', 'app');

const archivos = [
  join(raiz, 'js', 'App.js'),
  ...readdirSync(carpetaModulos).map((f) => join(carpetaModulos, f))
];

function leer(ruta) {
  return readFileSync(ruta, 'utf8');
}

function importaciones(ruta) {
  const resultado = [];
  const patron = /import\s*\{([^}]*)\}\s*from\s*'([^']+)'/g;
  for (const coincidencia of leer(ruta).matchAll(patron)) {
    const nombres = coincidencia[1]
      .split(',')
      .map((n) => n.trim())
      .filter(Boolean);
    resultado.push({ nombres, destino: resolve(dirname(ruta), coincidencia[2]) });
  }
  return resultado;
}

function exportaciones(ruta) {
  const patron = /^export\s+(?:async\s+)?(?:function|const|var|let)\s+([A-Za-z_$][\w$]*)/gm;
  return new Set([...leer(ruta).matchAll(patron)].map((m) => m[1]));
}

describe('módulos de la aplicación', () => {
  it('cada import apunta a un archivo que existe', () => {
    for (const archivo of archivos) {
      for (const { destino } of importaciones(archivo)) {
        expect(existsSync(destino), `${archivo} importa ${destino}`).toBe(true);
      }
    }
  });

  it('cada nombre importado está exportado por el módulo de origen', () => {
    for (const archivo of archivos) {
      for (const { nombres, destino } of importaciones(archivo)) {
        const exportados = exportaciones(destino);
        for (const nombre of nombres) {
          expect(exportados.has(nombre), `${nombre} no se exporta desde ${destino}`).toBe(true);
        }
      }
    }
  });

  it('index.html carga App.js como módulo', () => {
    const html = leer(join(raiz, 'index.html'));
    expect(html).toMatch(/<script type="module" src="js\/App\.js"><\/script>/);
  });

  it('index.html tiene descripción, favicon y un main por vista', () => {
    const html = leer(join(raiz, 'index.html'));
    expect(html).toMatch(/<meta name="description" content="[^"]{50,}"/);
    expect(html).toMatch(/<link rel="icon" href="data:image\/svg\+xml/);
    expect(html).toMatch(/<main id="contenidoLanding">/);
    expect(html).toMatch(/<main class="db-main" id="contenidoPrincipal"/);
  });

  it('el código ya no usa el nombre antiguo del espacio de nombres', () => {
    for (const archivo of archivos) {
      expect(leer(archivo)).not.toContain('EduTrack');
    }
  });
});
