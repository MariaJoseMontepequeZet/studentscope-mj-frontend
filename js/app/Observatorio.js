/* El observatorio: cada estudiante es un punto según su fecha de inscripción y su avance. */
import { esc, num, state } from './Estado.js';
import { formatFecha } from './Interfaz.js';

const MAXIMO_EN_LISTA = 6;
const NOMBRES_DE_ESTADO = { activo: 'En curso', abandono: 'Dejó el curso', completo: 'Terminó' };

const cielo = () => window.StudentScope.cielo;
const porId = (id) => document.getElementById(id);

function escribir(id, texto) {
    const el = porId(id);
    if (el) el.textContent = texto;
}

function punto(estudiante, rango) {
    const estado = cielo().estadoDe(estudiante);
    const lugar = cielo().posicion(estudiante, rango);
    const elegido = estudiante.id === state.cieloElegido;
    return '<circle class="punto punto--' + estado + (elegido ? ' punto--elegido' : '') + '" cx="' + lugar.x +
        '%" cy="' + lugar.y + '%" r="' + cielo().radio(estudiante.plan) + '" data-action="cielo-punto" data-id="' +
        num(estudiante.id) + '"><title>' + esc(estudiante.nombre + ' ' + estudiante.apellido) + ', ' +
        num(estudiante.progreso) + ' %</title></circle>';
}

function pintarMapa() {
    const mapa = porId('mapaCielo');
    if (!mapa) return;
    const rango = cielo().rangoDeFechas(state.cielo);
    const visibles = state.cielo.filter((e) => !state.cieloOcultos.includes(cielo().estadoDe(e)));
    const guias = [5, 27.5, 50, 72.5, 95]
        .map((y) => '<line class="guia" x1="0" x2="100%" y1="' + y + '%" y2="' + y + '%" />')
        .join('');

    mapa.innerHTML = guias + visibles.map((e) => punto(e, rango)).join('');
    mapa.setAttribute('aria-label', 'Mapa de ' + visibles.length +
        (visibles.length === 1 ? ' estudiante' : ' estudiantes') + ' por fecha de inscripción y avance');

    const hay = state.cielo.length > 0;
    escribir('cieloDesde', hay ? formatFecha(new Date(rango.desde).toISOString().slice(0, 10)) : '');
    escribir('cieloHasta', hay ? formatFecha(new Date(rango.hasta).toISOString().slice(0, 10)) : '');
}

function pintarFicha() {
    const ficha = porId('cieloFicha');
    if (!ficha) return;
    const e = state.cielo.find((x) => x.id === state.cieloElegido);
    ficha.hidden = !e;
    if (!e) {
        ficha.innerHTML = '';
        return;
    }
    ficha.innerHTML = '<p class="cielo__ficha-nombre">' + esc(e.nombre + ' ' + e.apellido) + '</p>' +
        '<p>' + esc(e.curso.nombre) + ', ' + num(e.progreso) + ' % de avance</p>' +
        '<p>' + NOMBRES_DE_ESTADO[cielo().estadoDe(e)] + '. Se inscribió el ' + esc(formatFecha(e.fechaInscripcion)) + '</p>' +
        '<button type="button" class="btn btn-sol btn--sm" data-action="editar" data-id="' + num(e.id) + '">Abrir ficha</button>';
}

function pintarRezagados() {
    const lista = porId('listaRezagados');
    if (!lista) return;
    const rezagados = cielo().abandonos(state.cielo);
    if (!rezagados.length) {
        lista.innerHTML = '<li class="rezagados__vacio">Nadie pendiente. Cuando alguien quede inactivo sin terminar, aparecerá aquí.</li>';
        return;
    }
    const filas = rezagados.slice(0, MAXIMO_EN_LISTA).map((e) =>
        '<li><span class="rezagados__avance">' + num(e.progreso) + ' %</span>' +
        '<span class="rezagados__quien"><strong>' + esc(e.nombre + ' ' + e.apellido) + '</strong>' +
        '<span>' + esc(e.curso.nombre) + '</span></span>' +
        '<a class="rezagados__correo" href="mailto:' + encodeURIComponent(e.email) + '">Escribirle</a>' +
        '<button type="button" class="btn btn-secondary btn--sm" data-action="editar" data-id="' + num(e.id) +
        '" aria-label="Abrir la ficha de ' + esc(e.nombre + ' ' + e.apellido) + '">Ficha</button></li>'
    ).join('');
    const resto = rezagados.length - MAXIMO_EN_LISTA;
    lista.innerHTML = filas + (resto > 0 ? '<li class="rezagados__vacio">Y ' + resto + ' más en la lista de estudiantes.</li>' : '');
}

export function pintarCielo() {
    const cuentas = cielo().contar(state.cielo);
    escribir('cieloTitular', cielo().titular(state.cielo.length, cuentas.abandono));
    escribir('cuentaActivo', cuentas.activo);
    escribir('cuentaAbandono', cuentas.abandono);
    escribir('cuentaCompleto', cuentas.completo);
    if (!state.cielo.some((e) => e.id === state.cieloElegido)) state.cieloElegido = null;
    pintarMapa();
    pintarFicha();
    pintarRezagados();
}

/* Las cuentas sin permiso de gestión solo ven cifras: no reciben datos de personas. */
export function pintarResumenSinMapa(resumen) {
    if (!resumen) return;
    escribir('cieloTitular', resumen.total === 1 ? '1 estudiante en la academia' : resumen.total + ' estudiantes en la academia');
}

export function pintarCiudades(porCiudad) {
    const lista = porId('ciudadesBarras');
    if (!lista) return;
    const mayor = Math.max(1, ...porCiudad.map((c) => c.total));
    lista.innerHTML = porCiudad.map((c) =>
        '<li><span>' + esc(c.ciudad) + '</span><span class="ciudades__barra"><i style="width:' +
        Math.round((c.total / mayor) * 100) + '%"></i></span><b>' + num(c.total) + '</b></li>'
    ).join('');
}

export function elegirPunto(id) {
    state.cieloElegido = state.cieloElegido === id ? null : id;
    pintarMapa();
    pintarFicha();
}

export function alternarEstado(boton) {
    const estado = boton.getAttribute('data-estado');
    const oculto = state.cieloOcultos.includes(estado);
    state.cieloOcultos = oculto
        ? state.cieloOcultos.filter((e) => e !== estado)
        : state.cieloOcultos.concat(estado);
    boton.setAttribute('aria-pressed', String(oculto));
    pintarMapa();
}

export function limpiarCielo() {
    ['mapaCielo', 'listaRezagados', 'ciudadesBarras', 'cieloFicha'].forEach((id) => {
        const el = porId(id);
        if (el) el.innerHTML = '';
    });
    const ficha = porId('cieloFicha');
    if (ficha) ficha.hidden = true;
    document.querySelectorAll('[data-action="cielo-filtro"]').forEach((b) => b.setAttribute('aria-pressed', 'true'));
    escribir('cieloTitular', 'Mirando el cielo…');
}
