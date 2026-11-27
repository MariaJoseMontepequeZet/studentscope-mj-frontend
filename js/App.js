/**
 * StudentScope MJ: punto de entrada de la aplicación.
 * Cada sección vive en su propio módulo dentro de js/app/.
 */
import { cambiarPassword, elegirAvatar, exportarCSV, exportarJSON, guardarAvatar, guardarPerfil, mezclarAvatares, usarAvatarPredeterminado } from './app/Configuracion.js';
import { num, state } from './app/Estado.js';
import { abrirModal, buscarConRetraso, cambiarPagina, cerrarModal, eliminarEstudiante, filtrar, guardarEstudiante, sincronizarMonto } from './app/Estudiantes.js';
import { abrirConfirm, abrirDialogo, atraparFoco, cerrarConfirm, cerrarDialogo, ejecutarConfirm, setFieldError, showToast } from './app/Interfaz.js';
import { abrirPanelNotificaciones, cerrarPanelNotificaciones, notifPanelAbierto } from './app/Notificaciones.js';
import { alternarEstado, elegirPunto } from './app/Observatorio.js';
import { initNavSidebar, mostrarVista } from './app/Router.js';
import { actualizarUsuarioActual, cerrarSesion, iniciarDemo, iniciarSesion, registrarCuenta, restaurarSesion, sesionExpirada } from './app/Sesion.js';

function init() {
    window.StudentScope.pintarIconos();

    var vLanding = document.getElementById('view-landing');
    if (vLanding) vLanding.classList.add('view--active');

    var fLogin = document.getElementById('formLogin');
    if (fLogin) fLogin.addEventListener('submit', iniciarSesion);

    var fRegistro = document.getElementById('formRegistro');
    if (fRegistro) fRegistro.addEventListener('submit', registrarCuenta);

    document.addEventListener('studentscope:sesion-expirada', sesionExpirada);

    var btnNotif = document.getElementById('btnNotificaciones');
    if (btnNotif) {
        btnNotif.addEventListener('click', function (e) {
            e.stopPropagation();
            abrirPanelNotificaciones();
        });
    }

    /* Cerrar panel al hacer click fuera */
    document.addEventListener('click', function (e) {
        var panel = document.getElementById('notifPanel');
        var btn = document.getElementById('btnNotificaciones');
        if (panel && notifPanelAbierto &&
            !panel.contains(e.target) &&
            e.target !== btn && !btn.contains(e.target)) {
            cerrarPanelNotificaciones();
        }
    });

    /* ── FIX: Logout → landing (no login) ── */
    var btnLogout = document.getElementById('btnLogout');
    if (btnLogout) btnLogout.addEventListener('click', cerrarSesion);

    initNavSidebar();

    var si = document.getElementById('searchInput');
    if (si) si.addEventListener('input', buscarConRetraso);
    ['filterCiudad', 'filterCurso', 'filterPlan', 'filterEstado'].forEach(function (id) {
        var el = document.getElementById(id); if (el) el.addEventListener('change', filtrar);
    });

    var bReset = document.getElementById('btnResetFiltros');
    if (bReset) bReset.addEventListener('click', function () {
        ['searchInput', 'filterCiudad', 'filterCurso', 'filterPlan', 'filterEstado'].forEach(function (id) {
            var el = document.getElementById(id); if (el) el.value = '';
        });
        filtrar();
    });

    var sl = document.getElementById('fProgreso');
    var sv = document.getElementById('fProgresoVal');
    if (sl && sv) sl.addEventListener('input', function () { sv.textContent = this.value + '%'; });

    var fp = document.getElementById('fPlan');
    if (fp) fp.addEventListener('change', function () { sincronizarMonto(this.value); });

    var ba = document.getElementById('btnAgregarEstudiante');
    if (ba) ba.addEventListener('click', function () { abrirModal(); });

    var mo = document.getElementById('modalOverlay');
    if (mo) mo.addEventListener('click', function (e) { if (e.target === mo) cerrarModal(); });

    var co = document.getElementById('confirmOverlay');
    if (co) co.addEventListener('click', function (e) { if (e.target === co) cerrarConfirm(); });

    document.addEventListener('keydown', function (e) {
        if (e.key === 'Escape') { cerrarModal(); cerrarConfirm(); cerrarPanelNotificaciones(); }
        if (e.key === 'Tab') atraparFoco(e);
    });

    document.addEventListener('click', function (e) {
        const elemento = e.target.closest('[data-action]');
        if (!elemento || elemento.disabled) return;
        const accion = ACCIONES[elemento.getAttribute('data-action')];
        if (accion) accion(elemento);
    });

    window.StudentScope.cuentas.iniciar();
    restaurarSesion();
}

const ACCIONES = {
    'ir-login': function () { mostrarVista('login'); },
    'ir-registro': function () { mostrarVista('registro'); },
    'ir-landing': function () { mostrarVista('landing'); },
    'entrar-demo': function (el) { iniciarDemo(el); },
    'editar': function (el) { abrirModal(num(el.getAttribute('data-id'))); },
    'cielo-punto': function (el) { elegirPunto(num(el.getAttribute('data-id'))); },
    'cielo-filtro': function (el) { alternarEstado(el); },
    'ver-estudiantes': function () { document.querySelector('.db-sidebar__nav-link[data-section="estudiantes"]').click(); },
    'eliminar': function (el) { eliminarEstudiante(num(el.getAttribute('data-id'))); },
    'pagina': function (el) { cambiarPagina(num(el.getAttribute('data-page'))); },
    'cerrar-modal': function () { cerrarModal(); },
    'guardar-estudiante': function () { guardarEstudiante(); },
    'cerrar-confirm': function () { cerrarConfirm(); },
    'ejecutar-confirm': function () { ejecutarConfirm(); },
    'cerrar-notificaciones': function () { cerrarPanelNotificaciones(); },
    'guardar-perfil': function () { guardarPerfil(); },
    'cambiar-password': function () { cambiarPassword(); },
    'avatar-elegir': function (el) { elegirAvatar(num(el.getAttribute('data-indice'))); },
    'avatar-mezclar': function () { mezclarAvatares(); },
    'avatar-predeterminado': function () { usarAvatarPredeterminado(); },
    'avatar-guardar': function (el) { guardarAvatar(el); },
    'exportar-json': function (el) { exportarJSON(el); },
    'exportar-csv': function (el) { exportarCSV(el); }
};

/* API pública */
window.StudentScope = window.StudentScope || {};
window.StudentScope.abrirModal = abrirModal;
window.StudentScope.cerrarModal = cerrarModal;
window.StudentScope.guardarEstudiante = guardarEstudiante;
window.StudentScope.eliminarEstudiante = eliminarEstudiante;
window.StudentScope.cerrarConfirm = cerrarConfirm;
window.StudentScope.ejecutarConfirm = ejecutarConfirm;
window.StudentScope.mostrarVista = mostrarVista;
window.StudentScope.cambiarPagina = cambiarPagina;
window.StudentScope.guardarPerfil = guardarPerfil;
window.StudentScope.cambiarPassword = cambiarPassword;
window.StudentScope.exportarJSON = exportarJSON;
window.StudentScope.exportarCSV = exportarCSV;
window.StudentScope.cerrarPanelNotificaciones = cerrarPanelNotificaciones;
window.StudentScope.toast = showToast;
window.StudentScope.confirmar = abrirConfirm;
window.StudentScope.abrirDialogo = abrirDialogo;
window.StudentScope.cerrarDialogo = cerrarDialogo;
window.StudentScope.marcarError = setFieldError;
window.StudentScope.usuarioActual = function () { return state.usuario; };
window.StudentScope.actualizarUsuarioActual = actualizarUsuarioActual;
window.StudentScope.registrarAcciones = function (acciones) { Object.assign(ACCIONES, acciones); };

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
} else {
    init();
}
