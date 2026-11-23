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

var dialogosAbiertos = [];

var FOCALIZABLES = 'a[href], button:not([disabled]), input:not([disabled]):not([type="hidden"]), ' +
    'select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

function focalizables(overlay) {
    return Array.prototype.filter.call(overlay.querySelectorAll(FOCALIZABLES), function (el) {
        return el.getClientRects().length > 0;
    });
}

/* Abre un diálogo: recuerda dónde estaba el foco y lo mueve adentro cuando ya es visible. */
export function abrirDialogo(overlay, inicial) {
    if (!overlay) return;
    dialogosAbiertos.push({ overlay: overlay, previo: document.activeElement });
    overlay.classList.add('is-open');
    /* El overlay sigue oculto durante el primer fotograma de la transición: el foco se pide un poco después. */
    function enfocar(intentos) {
        var destino = inicial || focalizables(overlay)[0];
        if (!destino || !overlay.classList.contains('is-open')) return;
        destino.focus();
        if (document.activeElement !== destino && intentos > 0) setTimeout(function () { enfocar(intentos - 1); }, 60);
    }
    setTimeout(function () { enfocar(3); }, 30);
}

/* Cierra el diálogo y devuelve el foco al elemento que lo abrió. */
export function cerrarDialogo(overlay) {
    if (!overlay) return;
    overlay.classList.remove('is-open');
    for (var i = dialogosAbiertos.length - 1; i >= 0; i--) {
        if (dialogosAbiertos[i].overlay !== overlay) continue;
        var previo = dialogosAbiertos.splice(i, 1)[0].previo;
        if (previo && previo.isConnected && typeof previo.focus === 'function') previo.focus();
        break;
    }
}

/* Mantiene Tab y Shift+Tab dentro del diálogo que está arriba. */
export function atraparFoco(evento) {
    var actual = dialogosAbiertos[dialogosAbiertos.length - 1];
    if (!actual || !actual.overlay.classList.contains('is-open')) return;
    var lista = focalizables(actual.overlay);
    if (!lista.length) return;
    var primero = lista[0];
    var ultimo = lista[lista.length - 1];
    var dentro = actual.overlay.contains(document.activeElement);
    if (evento.shiftKey && (document.activeElement === primero || !dentro)) {
        evento.preventDefault();
        ultimo.focus();
    } else if (!evento.shiftKey && (document.activeElement === ultimo || !dentro)) {
        evento.preventDefault();
        primero.focus();
    }
}

export function abrirConfirm(t, m, cb, etiqueta) {
    document.getElementById('confirmTitulo').textContent = t;
    document.getElementById('confirmMsg').innerHTML = m;
    document.getElementById('confirmAceptar').textContent = etiqueta || 'Sí, eliminar';
    state.confirmCb = cb;
    abrirDialogo(document.getElementById('confirmOverlay'), document.querySelector('#confirmOverlay [data-action="cerrar-confirm"]'));
}

export function cerrarConfirm() { cerrarDialogo(document.getElementById('confirmOverlay')); state.confirmCb = null; }

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
