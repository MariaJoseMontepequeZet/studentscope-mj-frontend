import { avisarErrorCarga, obtenerTodosLosEstudiantes } from './Datos.js';
import { api, esc, state } from './Estado.js';
import { mostrarErrorCampo, ocupado, setFieldError, showToast } from './Interfaz.js';
import { esAdministrador, esDemo, puedeGestionar } from './Permisos.js';
import { actualizarUsuarioActual } from './Sesion.js';

function tarjetaSistema() {
    return '<section class="config-card" aria-labelledby="cfg-sys">' +
        '<h3 class="config-card__title" id="cfg-sys">Sistema y datos</h3>' +
        '<div class="config-actions-list">' +
        '<div class="config-action-row">' +
        '<div><p class="config-action-title">Exportar estudiantes (JSON)</p>' +
        '<p class="config-action-sub">Descarga todos los registros en formato JSON</p></div>' +
        '<button class="btn btn-secondary" data-action="exportar-json">Exportar</button>' +
        '</div>' +
        '<div class="config-action-row">' +
        '<div><p class="config-action-title">Exportar estudiantes (CSV)</p>' +
        '<p class="config-action-sub">Compatible con Excel y Google Sheets</p></div>' +
        '<button class="btn btn-secondary" data-action="exportar-csv">Exportar CSV</button>' +
        '</div>' +
        '</div>' +
        '<p class="config-version">StudentScope MJ v2.3 · Vanilla JS · CSS Puro · Sin frameworks</p>' +
        '</section>';
}

function renderizarConfiguracionDemo(sec) {
    sec.innerHTML =
        '<header class="page-header">' +
        '<div><h2 class="page-header__title">Configuración <span>de la demo</span></h2>' +
        '<p class="page-header__meta">La cuenta de demostración no se puede modificar</p></div>' +
        '</header>' +
        '<div class="config-grid">' + tarjetaSistema() + '</div>';
    sec._rendered = true;
}

export function renderizarConfiguracion() {
    var sec = document.getElementById('secConfiguracion');
    if (!sec || sec._rendered) return;
    if (esDemo()) { renderizarConfiguracionDemo(sec); return; }

    var admin = esAdministrador();
    var u = state.usuario || {};

    sec.innerHTML =
        '<header class="page-header">' +
        '<div><h2 class="page-header__title">' +
        (admin ? 'Configuración <span>del Sistema</span>' : 'Mi <span>perfil</span>') + '</h2>' +
        '<p class="page-header__meta">' +
        (admin ? 'Ajustes generales · StudentScope MJ v2.3' : 'Tus datos y tu contraseña') + '</p></div>' +
        '</header>' +

        '<div class="config-grid">' +

        /* Tarjeta: Perfil */
        '<section class="config-card" aria-labelledby="cfg-perfil">' +
        '<h3 class="config-card__title" id="cfg-perfil">Mi cuenta</h3>' +
        '<div class="config-form">' +
        '<div class="form-group"><label class="config-label" for="cfgNombre">Nombre completo</label>' +
        '<input type="text" class="form-input config-input" id="cfgNombre" maxlength="100" value="' + esc(u.nombre) + '" />' +
        '<span class="form-group__error" aria-live="polite"></span></div>' +
        '<div class="form-group"><label class="config-label" for="cfgEmail">Correo electrónico</label>' +
        '<input type="email" class="form-input config-input" id="cfgEmail" value="' + esc(u.email) + '" readonly /></div>' +
        '<div class="form-group"><label class="config-label" for="cfgRol">Rol</label>' +
        '<input type="text" class="form-input config-input" id="cfgRol" value="' + (admin ? 'Administrador' : 'Usuario') + '" readonly /></div>' +
        '<button class="btn btn-primary" id="btnGuardarPerfil" data-action="guardar-perfil">Guardar perfil</button>' +
        '</div></section>' +

        /* Tarjeta: Avatar */
        '<section class="config-card config-card--avatar" aria-labelledby="cfg-avatar">' +
        '<h3 class="config-card__title" id="cfg-avatar">Mi avatar</h3>' +
        '<div class="avatar-editor">' +
        '<div class="avatar-usuario avatar-editor__vista" id="avatarVista" aria-hidden="true"></div>' +
        '<div class="avatar-editor__opciones" id="avatarOpciones" role="radiogroup" aria-label="Elige un avatar"></div>' +
        '</div>' +
        '<div class="avatar-editor__acciones">' +
        '<button class="btn btn-secondary" type="button" data-action="avatar-mezclar">Mezclar</button>' +
        '<button class="btn btn-secondary" type="button" data-action="avatar-predeterminado">Usar el predeterminado</button>' +
        '<button class="btn btn-primary" type="button" id="btnGuardarAvatar" data-action="avatar-guardar">Guardar avatar</button>' +
        '</div>' +
        '<span class="form-group__error" id="avatarError" aria-live="polite"></span>' +
        '</section>' +

        /* Tarjeta: Seguridad */
        '<section class="config-card" aria-labelledby="cfg-seg">' +
        '<h3 class="config-card__title" id="cfg-seg">Seguridad</h3>' +
        '<div class="config-form">' +
        '<div class="form-group"><label class="config-label" for="cfgPassActual">Contraseña actual</label>' +
        '<input type="password" class="form-input config-input" id="cfgPassActual" autocomplete="current-password" />' +
        '<span class="form-group__error" aria-live="polite"></span></div>' +
        '<div class="form-group"><label class="config-label" for="cfgPassNueva">Nueva contraseña</label>' +
        '<input type="password" class="form-input config-input" id="cfgPassNueva" autocomplete="new-password" />' +
        '<span class="form-group__error" aria-live="polite"></span></div>' +
        '<div class="form-group"><label class="config-label" for="cfgPassConfirm">Confirmar contraseña</label>' +
        '<input type="password" class="form-input config-input" id="cfgPassConfirm" autocomplete="new-password" />' +
        '<span class="form-group__error" aria-live="polite"></span></div>' +
        '<button class="btn btn-primary" id="btnCambiarPassword" data-action="cambiar-password">Cambiar contraseña</button>' +
        '</div></section>' +

        (admin ? (
        /* Tarjetas solo para administradores: Notificaciones y Sistema */
        '<section class="config-card" aria-labelledby="cfg-notif">' +
        '<h3 class="config-card__title" id="cfg-notif">Notificaciones</h3>' +
        '<div class="config-toggles">' +
        toggleRow('notifEmail', 'Notificaciones por email', true) +
        toggleRow('notifProgreso', 'Alertas de progreso bajo (<40%)', true) +
        toggleRow('notifNuevos', 'Nuevos registros de estudiantes', true) +
        toggleRow('notifInactivos', 'Recordatorio de inactivos', false) +
        toggleRow('notifReportes', 'Reportes semanales automáticos', false) +
        '</div>' +
        '<button class="btn btn-primary" style="margin-top:1.25rem" data-action="guardar-notificaciones">Guardar preferencias</button>' +
        '</section>' +

        tarjetaSistema()) : '') +

        '</div>';

    sec._rendered = true;
    iniciarSelectorAvatar();
}

function toggleRow(id, label, checked) {
    return '<div class="toggle-row">' +
        '<label class="toggle-label" for="' + id + '">' + label + '</label>' +
        '<label class="toggle-switch" aria-label="' + label + '">' +
        '<input type="checkbox" id="' + id + '"' + (checked ? ' checked' : '') + ' />' +
        '<span class="toggle-track"><span class="toggle-thumb"></span></span>' +
        '</label></div>';
}

/* Acciones de configuración */
export async function guardarPerfil() {
    var campo = document.getElementById('cfgNombre');
    var boton = document.getElementById('btnGuardarPerfil');
    var nombre = campo ? campo.value.trim() : '';

    setFieldError('cfgNombre', nombre ? '' : 'El nombre es obligatorio');
    if (!nombre) return;

    if (boton) boton.disabled = true;
    try {
        var r = await window.StudentScope.api.patch('/api/auth/yo', { nombre: nombre });
        actualizarUsuarioActual(r.usuario);
        showToast('Perfil guardado correctamente', 'success');
    } catch (error) {
        setFieldError('cfgNombre', (error.campos && error.campos.nombre) || error.message);
    } finally {
        if (boton) boton.disabled = false;
    }
}

export async function cambiarPassword() {
    var valor = function (id) { return (document.getElementById(id) || {}).value || ''; };
    var actual = valor('cfgPassActual');
    var nueva = valor('cfgPassNueva');
    var confirmacion = valor('cfgPassConfirm');
    var boton = document.getElementById('btnCambiarPassword');

    setFieldError('cfgPassActual', actual ? '' : 'Ingresa tu contraseña actual');
    setFieldError('cfgPassNueva', nueva ? '' : 'Ingresa la nueva contraseña');
    setFieldError('cfgPassConfirm', nueva === confirmacion ? '' : 'Las contraseñas no coinciden');
    if (!actual || !nueva || nueva !== confirmacion) return;

    if (boton) boton.disabled = true;
    try {
        await window.StudentScope.api.patch('/api/auth/yo', { passwordActual: actual, passwordNueva: nueva });
        ['cfgPassActual', 'cfgPassNueva', 'cfgPassConfirm'].forEach(function (id) {
            var el = document.getElementById(id); if (el) el.value = '';
        });
        showToast('Contraseña actualizada correctamente', 'success');
    } catch (error) {
        var campos = error.campos || {};
        setFieldError('cfgPassActual', campos.passwordActual || '');
        setFieldError('cfgPassNueva', campos.passwordNueva || (campos.passwordActual ? '' : error.message));
    } finally {
        if (boton) boton.disabled = false;
    }
}

var OPCIONES_AVATAR = 12;

export function semillaDe(usuario) {
    return (usuario && (usuario.avatarSemilla || usuario.email)) || '';
}

function semillaAleatoria() {
    var bytes = new Uint8Array(6);
    crypto.getRandomValues(bytes);
    return Array.from(bytes, function (b) { return b.toString(36).padStart(2, '0'); }).join('');
}

function mezclarOpcionesAvatar() {
    var opciones = [state.avatarElegido];
    while (opciones.length < OPCIONES_AVATAR) opciones.push(semillaAleatoria());
    state.avatarOpciones = opciones;
}

function iniciarSelectorAvatar() {
    state.avatarElegido = (state.usuario && state.usuario.avatarSemilla) || null;
    mezclarOpcionesAvatar();
    renderizarSelectorAvatar();
}

function renderizarSelectorAvatar() {
    var vista = document.getElementById('avatarVista');
    var contenedor = document.getElementById('avatarOpciones');
    if (!vista || !contenedor || !state.usuario) return;

    var correo = state.usuario.email;
    vista.innerHTML = window.StudentScope.avatar(state.avatarElegido || correo);
    contenedor.innerHTML = state.avatarOpciones.map(function (semilla, i) {
        var activa = semilla === state.avatarElegido;
        return '<button type="button" class="avatar-opcion' + (activa ? ' avatar-opcion--activa' : '') + '" ' +
            'role="radio" aria-checked="' + activa + '" aria-label="Avatar ' + (i + 1) + '" ' +
            'data-action="avatar-elegir" data-indice="' + i + '">' +
            window.StudentScope.avatar(semilla || correo) + '</button>';
    }).join('');

    var guardado = state.usuario.avatarSemilla || null;
    var boton = document.getElementById('btnGuardarAvatar');
    if (boton) boton.disabled = state.avatarElegido === guardado;
    mostrarErrorCampo('avatarError', '');
}

export function elegirAvatar(indice) {
    if (indice < 0 || indice >= state.avatarOpciones.length) return;
    state.avatarElegido = state.avatarOpciones[indice];
    renderizarSelectorAvatar();
}

export function usarAvatarPredeterminado() {
    state.avatarElegido = null;
    if (state.avatarOpciones.indexOf(null) === -1) state.avatarOpciones[0] = null;
    renderizarSelectorAvatar();
}

export function mezclarAvatares() {
    mezclarOpcionesAvatar();
    renderizarSelectorAvatar();
}

export async function guardarAvatar(boton) {
    ocupado(boton, true, 'Guardando…');
    try {
        var r = await api.patch('/api/auth/yo', { avatarSemilla: state.avatarElegido });
        actualizarUsuarioActual(r.usuario);
        showToast('Avatar guardado', 'success');
    } catch (error) {
        mostrarErrorCampo('avatarError', (error.campos && error.campos.avatarSemilla) || error.message);
    } finally {
        ocupado(boton, false);
        renderizarSelectorAvatar();
    }
}

export function guardarNotificaciones() {
    showToast('Preferencias de notificaciones guardadas', 'success');
}

function descargar(nombre, contenido, tipo) {
    var blob = new Blob([contenido], { type: tipo });
    var url = URL.createObjectURL(blob);
    var a = document.createElement('a');
    a.href = url; a.download = nombre; a.click();
    URL.revokeObjectURL(url);
}

async function exportar(formato, boton) {
    if (!puedeGestionar()) return;
    ocupado(boton, true, 'Exportando…');
    try {
        var lista = await obtenerTodosLosEstudiantes();
        if (formato === 'json') {
            descargar('studentscope_estudiantes.json', JSON.stringify(lista, null, 2), 'application/json');
        } else {
            descargar('studentscope_estudiantes.csv', window.StudentScope.csv.aCSV(lista), 'text/csv;charset=utf-8;');
        }
        showToast((formato === 'json' ? 'JSON' : 'CSV') + ' exportado correctamente', 'success');
    } catch (error) {
        avisarErrorCarga(error);
    } finally {
        ocupado(boton, false);
    }
}

export function exportarJSON(boton) { return exportar('json', boton); }

export function exportarCSV(boton) { return exportar('csv', boton); }
