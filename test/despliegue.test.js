import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const raiz = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const leer = (ruta) => readFileSync(join(raiz, ruta), 'utf8');

describe('instalaciones por cliente', () => {
  it('el compose toma el puerto de WEB_PUERTO y etiqueta la imagen de la API', () => {
    const compose = leer('despliegue/docker-compose.yml');

    expect(compose).toContain('"${WEB_PUERTO:-8080}:80"');
    expect(compose).toContain('image: studentscope-mj-api:local');
  });

  it('la API de cada cliente corre en produccion para que la cookie de sesion lleve Secure', () => {
    const compose = leer('despliegue/docker-compose.yml');

    expect(compose).toContain('NODE_ENV: production');
    expect(compose).not.toContain('NODE_ENV: development');
  });

  it('las claves y los respaldos de los clientes no se suben a git', () => {
    const ignorados = leer('.gitignore');

    expect(ignorados).toContain('despliegue/clientes/');
    expect(ignorados).toContain('despliegue/respaldos/');
  });

  it('clientes.sh es un script de bash estricto con finales de línea de Linux', () => {
    const script = leer('despliegue/clientes.sh');

    expect(script.startsWith('#!/usr/bin/env bash\n')).toBe(true);
    expect(script).toContain('set -euo pipefail');
    expect(script).not.toContain('\r');
    expect(leer('.gitattributes')).toMatch(/\*\.sh\s+text\s+eol=lf/);
  });

  it('n8n por cliente: versión fija, solo local y con las claves del cliente', () => {
    const n8n = leer('despliegue/docker-compose.n8n.yml');

    expect(n8n).toMatch(/image: n8nio\/n8n:\d+\.\d+\.\d+/);
    expect(n8n).toContain('"127.0.0.1:${N8N_PUERTO}:5678"');
    for (const variable of [
      'N8N_STUDENTSCOPE_EMAIL',
      'N8N_STUDENTSCOPE_PASSWORD',
      'N8N_AVISOS_DESTINO'
    ]) {
      expect(n8n).toContain('${' + variable + '}');
    }
    expect(leer('despliegue/clientes.sh')).toContain('docker-compose.n8n.yml');
  });

  it('el script ofrece los cuatro comandos', () => {
    const script = leer('despliegue/clientes.sh');

    for (const comando of ['nuevo)', 'lista)', 'actualizar)', 'respaldar)']) {
      expect(script).toContain(comando);
    }
  });
});

describe('configuracion privada del servidor', () => {
  it('docs/servidor esta en .gitignore y no depende de exclusiones locales', () => {
    expect(leer('.gitignore')).toMatch(/^docs\/servidor\/\r?$/m);
  });
});
