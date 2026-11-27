import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const raiz = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const leer = (ruta) => readFileSync(join(raiz, ruta), 'utf8');
const validar = createRequire(import.meta.url)('../js/Validacion.js');

const REGISTRO = {
  id: 1,
  nombre: 'Ana',
  apellido: 'Paz',
  email: 'ana@correo.com',
  ciudad: 'Bogotá',
  curso: 'Curso nuevo de la base',
  progreso: 10,
  fechaInscripcion: '2024-01-10',
  plan: 'Básico',
  montoUSD: 29.99,
  activo: true
};

describe('hallazgos de la revisión de calidad', () => {
  it('la ciudad se escribe o se elige, sin una lista cerrada que borre datos', () => {
    const html = leer('index.html');

    expect(html).toMatch(/<input type="text" id="fCiudad" list="listaCiudades" maxlength="60"/);
    expect(html).not.toContain('<select id="fCiudad">');
  });

  it('el validador acepta los cursos que vienen de la base de datos', () => {
    const erroresDeCurso = (opciones) =>
      validar.registro(REGISTRO, opciones).errores.filter((e) => e.regla === 'V-07');

    expect(erroresDeCurso({ hoy: '2024-06-01' })).toHaveLength(1);
    expect(erroresDeCurso({ hoy: '2024-06-01', cursos: [REGISTRO.curso] })).toHaveLength(0);
  });

  it('el valor de la barra de progreso se anuncia y se actualiza', () => {
    expect(leer('index.html')).toMatch(/id="kpiProgresoMedidor" role="progressbar"/);
    expect(leer('js/app/Datos.js')).toContain("setAttribute('aria-valuenow'");
  });

  it('el contador de avisos se pinta al cargar el panel, no solo al abrirlo', () => {
    const datos = leer('js/app/Datos.js');

    expect(datos).toContain('mostrarAvisoPendiente(r.inactivos)');
    expect(leer('js/app/Notificaciones.js')).toContain("setAttribute('aria-expanded'");
  });

  it('la cuenta de demostración aparece como tal y sin botones', () => {
    const cuentas = leer('js/Cuentas.js');

    expect(cuentas).toContain("cuenta.rol === 'demo'");
    expect(cuentas).toContain('La administra el servidor');
  });

  it('las tarjetas de reportes pasan a una columna en teléfonos angostos', () => {
    expect(leer('css/Dashboard.css')).toMatch(
      /@media \(max-width: 479px\) \{\s+\.rep-kpi-grid \{\s+grid-template-columns: minmax\(0, 1fr\);/
    );
  });
});
