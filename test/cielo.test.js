import { describe, expect, it } from 'vitest';
import { createRequire } from 'node:module';
import { readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const cielo = createRequire(import.meta.url)('../js/Cielo.js');

const estudiante = (id, progreso, activo, fechaInscripcion = '2024-01-01', plan = 'Básico') => ({
  id,
  progreso,
  activo,
  fechaInscripcion,
  plan
});

describe('mapa del observatorio', () => {
  it('distingue a quien terminó, a quien sigue y a quien dejó el curso', () => {
    expect(cielo.estadoDe(estudiante(1, 100, false))).toBe('completo');
    expect(cielo.estadoDe(estudiante(2, 40, true))).toBe('activo');
    expect(cielo.estadoDe(estudiante(3, 40, false))).toBe('abandono');
  });

  it('cuenta los tres estados y ordena los abandonos de menor a mayor avance', () => {
    const lista = [
      estudiante(1, 100, true),
      estudiante(2, 60, false),
      estudiante(3, 20, false),
      estudiante(4, 10, true)
    ];

    expect(cielo.contar(lista)).toEqual({ completo: 1, activo: 1, abandono: 2 });
    expect(cielo.abandonos(lista).map((e) => e.id)).toEqual([3, 2]);
  });

  it('pone a los recientes a la derecha y a los avanzados arriba, siempre dentro del mapa', () => {
    const lista = [estudiante(1, 0, true, '2023-01-01'), estudiante(2, 100, true, '2025-01-01')];
    const rango = cielo.rangoDeFechas(lista);
    const viejo = cielo.posicion(lista[0], rango);
    const nuevo = cielo.posicion(lista[1], rango);

    expect(nuevo.x).toBeGreaterThan(viejo.x);
    expect(nuevo.y).toBeLessThan(viejo.y);
    for (const punto of [viejo, nuevo]) {
      expect(punto.x).toBeGreaterThanOrEqual(2);
      expect(punto.x).toBeLessThanOrEqual(98);
      expect(punto.y).toBeGreaterThanOrEqual(2);
      expect(punto.y).toBeLessThanOrEqual(98);
    }
  });

  it('separa un poco a dos personas con los mismos datos, siempre en el mismo lugar', () => {
    const a = estudiante(7, 50, true);
    const b = estudiante(8, 50, true);
    const rango = cielo.rangoDeFechas([a, b]);

    expect(cielo.posicion(a, rango)).toEqual(cielo.posicion(a, rango));
    expect(cielo.posicion(a, rango)).not.toEqual(cielo.posicion(b, rango));
  });

  it('un solo estudiante o una lista vacía no rompen el cálculo', () => {
    const solo = estudiante(1, 50, true);

    expect(cielo.posicion(solo, cielo.rangoDeFechas([solo])).x).toBeGreaterThan(0);
    expect(cielo.contar([])).toEqual({ completo: 0, activo: 0, abandono: 0 });
  });

  it('el plan define el tamaño del punto', () => {
    expect(cielo.radio('Premium')).toBeGreaterThan(cielo.radio('Estándar'));
    expect(cielo.radio('Estándar')).toBeGreaterThan(cielo.radio('Básico'));
    expect(cielo.radio('otro')).toBe(cielo.radio('Básico'));
  });

  it('dice en una frase quién se quedó atrás', () => {
    expect(cielo.titular(0, 0)).toBe('Todavía no hay estudiantes');
    expect(cielo.titular(35, 0)).toBe('Nadie ha dejado su curso sin terminar');
    expect(cielo.titular(35, 1)).toBe('1 estudiante dejó su curso sin terminar');
    expect(cielo.titular(35, 3)).toBe('3 estudiantes dejaron su curso sin terminar');
  });
});

describe('el observatorio en la página', () => {
  it('carga el cálculo antes que la aplicación y tiene el mapa, la leyenda y la lista', () => {
    const raiz = resolve(dirname(fileURLToPath(import.meta.url)), '..');
    const html = readFileSync(join(raiz, 'index.html'), 'utf8');

    expect(html.indexOf('js/Cielo.js')).toBeGreaterThan(0);
    expect(html.indexOf('js/Cielo.js')).toBeLessThan(html.indexOf('js/App.js'));
    for (const id of ['mapaCielo', 'cieloFicha', 'listaRezagados', 'ciudadesBarras']) {
      expect(html).toContain(`id="${id}"`);
    }
    expect(html.match(/data-action="cielo-filtro"/g)).toHaveLength(3);
  });

  it('quienes no pueden gestionar no ven el mapa ni la lista de personas', () => {
    const raiz = resolve(dirname(fileURLToPath(import.meta.url)), '..');
    const html = readFileSync(join(raiz, 'index.html'), 'utf8');

    expect(html).toMatch(/class="cielo__marco" data-gestion/);
    expect(html).toMatch(/class="rezagados" aria-labelledby="rezagadosTitulo" data-gestion/);
  });
});
