import { state } from './Estado.js';

export function actualizarFechaTopbar() {
    var el = document.getElementById('topbarFecha');
    if (!el) return;
    var dias = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
    var meses = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
    var hoy = new Date();
    el.textContent = dias[hoy.getDay()] + ', ' + hoy.getDate() + ' de ' + meses[hoy.getMonth()] + ' de ' + hoy.getFullYear();
}

export function valorDe(id) { return ((document.getElementById(id) || {}).value || '').trim(); }

export function planSlug(p) {
    return (p || '').toLowerCase()
        .replace(/á/g, 'a').replace(/é/g, 'e').replace(/í/g, 'i')
        .replace(/ó/g, 'o').replace(/ú/g, 'u').replace(/\s+/g, '');
}

export function progresoClass(p) { return p >= 100 ? 'progress-fill--complete' : p < 40 ? 'progress-fill--low' : ''; }

export function formatFecha(d) {
    if (typeof d !== 'string') return '—';
    var p = d.split('-');
    return p.length === 3 ? p[2] + '/' + p[1] + '/' + p[0] : '—';
}

export function setFieldError(id, msg) {
    var inp = document.getElementById(id); if (!inp) return;
    var errEl = inp.parentNode && inp.parentNode.querySelector('.form-group__error');
    if (msg) {
        inp.classList.add('is-error');
        if (errEl) { errEl.textContent = msg; errEl.classList.add('visible'); }
    } else {
        inp.classList.remove('is-error');
        if (errEl) { errEl.textContent = ''; errEl.classList.remove('visible'); }
    }
}

export function abrirConfirm(t, m, cb, etiqueta) {
    document.getElementById('confirmTitulo').textContent = t;
    document.getElementById('confirmMsg').innerHTML = m;
    document.getElementById('confirmAceptar').textContent = etiqueta || 'Sí, eliminar';
    state.confirmCb = cb;
    document.getElementById('confirmOverlay').classList.add('is-open');
}

export function cerrarConfirm() { document.getElementById('confirmOverlay').classList.remove('is-open'); state.confirmCb = null; }

export function ejecutarConfirm() { if (typeof state.confirmCb === 'function') state.confirmCb(); cerrarConfirm(); }

var _toastTimer;

export function showToast(msg, tipo) {
    var icons = { success: '✓', error: '×', info: 'i' };
    var t = document.getElementById('toast'); if (!t) return;
    t.className = 'toast toast--' + (tipo || 'success');
    const icono = document.createElement('span');
    icono.className = 'toast__icon';
    icono.textContent = icons[tipo] || '✓';
    t.replaceChildren(icono, document.createTextNode(' ' + msg));
    t.classList.add('is-visible');
    clearTimeout(_toastTimer);
    _toastTimer = setTimeout(function () { t.classList.remove('is-visible'); }, 3000);
}

export function mostrarErrorCampo(idError, mensaje) {
    var el = document.getElementById(idError);
    if (!el) return;
    el.textContent = mensaje || '';
    el.classList.toggle('visible', !!mensaje);
}

export function limpiarErrores(ids) {
    ids.forEach(function (id) { mostrarErrorCampo(id, ''); });
}

export function mostrarErroresServidor(error, mapa, idGeneral) {
    var usado = false;
    Object.keys(error.campos || {}).forEach(function (campo) {
        if (mapa[campo]) {
            mostrarErrorCampo(mapa[campo], error.campos[campo]);
            usado = true;
        }
    });
    if (!usado) mostrarErrorCampo(idGeneral, error.message);
}

export function ocupado(boton, estaOcupado, texto) {
    if (!boton) return;
    if (estaOcupado) {
        boton.dataset.texto = boton.textContent;
        boton.textContent = texto;
    } else if (boton.dataset.texto) {
        boton.textContent = boton.dataset.texto;
    }
    boton.disabled = estaOcupado;
}
