import { createRequire } from 'node:module';
import { describe, expect, it } from 'vitest';

const require = createRequire(import.meta.url);
const { aCSV, celda, COLUMNAS } = require('../js/Csv.js');

const estudiante = {
  id: 1,
  nombre: 'Juan',
  apellido: 'Pérez',
  email: 'juan@example.test',
  ciudad: 'Bogotá',
  curso: { id: 1, nombre: 'Desarrollo Web' },
  plan: 'Premium',
  montoUSD: 99.99,
  progreso: 75,
  fechaInscripcion: '2023-01-15',
  activo: true
};

describe('celda', () => {
  it('deja intacto el texto simple', () => {
    expect(celda('Bogotá')).toBe('Bogotá');
    expect(celda(75)).toBe('75');
    expect(celda(true)).toBe('true');
  });

  it('entrecomilla y duplica las comillas internas', () => {
    expect(celda('Pérez, Juan')).toBe('"Pérez, Juan"');
    expect(celda('dijo "hola"')).toBe('"dijo ""hola"""');
  });

  it('entrecomilla los saltos de línea', () => {
    expect(celda('a\nb')).toBe('"a\nb"');
  });

  it('neutraliza las fórmulas de hoja de cálculo', () => {
    ['=SUM(A1)', '+1', '-1', '@cmd', '\tx'].forEach((peligroso) => {
      expect(celda(peligroso).replace(/^"/, '').startsWith("'")).toBe(true);
    });
  });

  it('trata null y undefined como vacío', () => {
    expect(celda(null)).toBe('');
    expect(celda(undefined)).toBe('');
  });
});

describe('aCSV', () => {
  it('empieza con BOM y la cabecera completa', () => {
    const csv = aCSV([estudiante]);
    expect(csv.startsWith('﻿' + COLUMNAS.join(','))).toBe(true);
  });

  it('escribe una fila por estudiante con el nombre del curso', () => {
    const lineas = aCSV([estudiante]).split('\r\n');
    expect(lineas).toHaveLength(2);
    expect(lineas[1]).toBe(
      '1,Juan,Pérez,juan@example.test,Bogotá,Desarrollo Web,75,2023-01-15,Premium,99.99,true'
    );
  });

  it('con una lista vacía solo escribe la cabecera', () => {
    expect(aCSV([]).split('\r\n')).toHaveLength(1);
  });

  it('no deja pasar fórmulas en el nombre', () => {
    const lineas = aCSV([{ ...estudiante, nombre: '=HYPERLINK("http://x")' }]).split('\r\n');
    expect(lineas[1].split(',')[1].startsWith('"\'=')).toBe(true);
  });

  it('tolera un estudiante sin curso', () => {
    const lineas = aCSV([{ ...estudiante, curso: undefined }]).split('\r\n');
    expect(lineas[1].split(',')[5]).toBe('');
  });
});
