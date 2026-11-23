import { state } from './Estado.js';
import { cerrarPanelNotificaciones } from './Notificaciones.js';

export function esAdministrador() {
    return !!(state.usuario && state.usuario.rol === 'administrador');
}

export function esDemo() {
    return !!(state.usuario && state.usuario.rol === 'demo');
}

export function puedeGestionar() {
    return esAdministrador() || esDemo();
}

export function aplicarRol() {
    var admin = esAdministrador();
    var gestion = puedeGestionar();
    document.querySelectorAll('[data-solo-admin]').forEach(function (el) { el.hidden = !admin; });
    document.querySelectorAll('[data-gestion]').forEach(function (el) { el.hidden = !gestion; });
    var aviso = document.getElementById('avisoDemo');
    if (aviso) aviso.hidden = !esDemo();
    var textoConfig = document.querySelector('.db-sidebar__nav-link[data-section="configuracion"] .db-sidebar__nav-text');
    if (textoConfig) textoConfig.textContent = gestion ? 'Configuración' : 'Mi perfil';
    if (!gestion) cerrarPanelNotificaciones();
}
