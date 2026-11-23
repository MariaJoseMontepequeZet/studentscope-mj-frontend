import { semillaDe } from './Configuracion.js';
import { api, state } from './Estado.js';
import { limpiarErrores, mostrarErrorCampo, mostrarErroresServidor, ocupado, showToast } from './Interfaz.js';
import { cerrarPanelNotificaciones } from './Notificaciones.js';
import { mostrarVista } from './Router.js';

export function actualizarUsuarioDashboard(d) {
    var nombreCompleto = (d && d.nombre) ? d.nombre.trim() : 'Usuario';
    var primerNombre = nombreCompleto.split(' ')[0] || nombreCompleto;
    var set = function (id, val) { var el = document.getElementById(id); if (el) el.textContent = val; };
    set('greetingNombre', primerNombre);
    set('sidebarNombre', nombreCompleto);
    set('sidebarRol', d && d.rol === 'administrador' ? 'Administrador' : d && d.rol === 'demo' ? 'Demostración' : 'Usuario');
    var av = document.getElementById('sidebarAvatar');
    if (av) av.innerHTML = window.StudentScope.avatar(semillaDe(d) || nombreCompleto);
}

function entrar(usuario) {
    state.usuario = usuario;
    mostrarVista('dashboard', usuario);
}

export function actualizarUsuarioActual(usuario) {
    state.usuario = usuario;
    actualizarUsuarioDashboard(usuario);
    var campoNombre = document.getElementById('cfgNombre');
    if (campoNombre) campoNombre.value = usuario.nombre;
}

function limpiarSesionLocal() {
    state.usuario = null;
    state.estudiantes = [];
    state.total = 0;
    state.paginas = 0;
    state.resumen = null;
    state.cursos = [];
    state.paginaActual = 1;
    state.peticion++;
    ['searchInput', 'filterCiudad', 'filterCurso', 'filterPlan', 'filterEstado'].forEach(function (id) {
        var el = document.getElementById(id); if (el) el.value = '';
    });
    cerrarPanelNotificaciones();
    window.StudentScope.cuentas.reiniciar();
}

export async function iniciarSesion(e) {
    e.preventDefault();
    var email = document.getElementById('loginEmail').value.trim();
    var password = document.getElementById('loginPassword').value;
    var boton = document.getElementById('btnLogin');

    limpiarErrores(['loginEmailError', 'loginPasswordError']);
    if (!email) mostrarErrorCampo('loginEmailError', 'Ingresa tu correo');
    if (!password) mostrarErrorCampo('loginPasswordError', 'Ingresa tu contraseña');
    if (!email || !password) return;

    ocupado(boton, true, 'Ingresando…');
    try {
        var r = await window.StudentScope.api.post('/api/auth/login', { email: email, password: password });
        document.getElementById('loginPassword').value = '';
        entrar(r.usuario);
    } catch (error) {
        mostrarErroresServidor(error, { email: 'loginEmailError', password: 'loginPasswordError' }, 'loginPasswordError');
    } finally {
        ocupado(boton, false);
    }
}

function errorPasswordLocal(password) {
    if (password.length < 8) return 'La contraseña debe tener al menos 8 caracteres';
    if (password.length > 72) return 'La contraseña no puede superar 72 caracteres';
    if (!/[A-Za-z]/.test(password) || !/\d/.test(password)) return 'La contraseña debe incluir letras y números';
    return '';
}

export async function registrarCuenta(e) {
    e.preventDefault();
    var valor = function (id) { return document.getElementById(id).value; };
    var nombre = valor('regNombre').trim();
    var email = valor('regEmail').trim();
    var password = valor('regPassword');
    var repetida = valor('regPassword2');
    var boton = document.getElementById('btnRegistro');

    limpiarErrores(['regNombreError', 'regEmailError', 'regPasswordError', 'regPassword2Error']);
    var errores = {
        regNombreError: nombre ? '' : 'Ingresa tu nombre',
        regEmailError: email ? '' : 'Ingresa tu correo',
        regPasswordError: errorPasswordLocal(password),
        regPassword2Error: password === repetida ? '' : 'Las contraseñas no coinciden'
    };
    var hayErrores = false;
    Object.keys(errores).forEach(function (id) {
        mostrarErrorCampo(id, errores[id]);
        if (errores[id]) hayErrores = true;
    });
    if (hayErrores) return;

    ocupado(boton, true, 'Creando cuenta…');
    try {
        var r = await window.StudentScope.api.post('/api/auth/registro', { nombre: nombre, email: email, password: password });
        ['regNombre', 'regEmail', 'regPassword', 'regPassword2'].forEach(function (id) {
            document.getElementById(id).value = '';
        });
        entrar(r.usuario);
        showToast('Cuenta creada. Te damos la bienvenida', 'success');
    } catch (error) {
        if (error.codigo === 'EMAIL_DUPLICADO') {
            mostrarErrorCampo('regEmailError', error.message);
        } else {
            mostrarErroresServidor(error, {
                nombre: 'regNombreError', email: 'regEmailError', password: 'regPasswordError'
            }, 'regPassword2Error');
        }
    } finally {
        ocupado(boton, false);
    }
}

export async function iniciarDemo(boton) {
    mostrarErrorCampo('demoError', '');
    ocupado(boton, true, 'Entrando…');
    try {
        var r = await api.post('/api/auth/demo');
        entrar(r.usuario);
    } catch (error) {
        var mensaje = error.codigo === 'DEMO_NO_DISPONIBLE'
            ? 'La demo no está disponible por ahora'
            : error.message;
        if (state.vistaActual === 'login') mostrarErrorCampo('demoError', mensaje);
        else showToast(mensaje, 'error');
    } finally {
        ocupado(boton, false);
    }
}

export async function cerrarSesion() {
    try {
        await window.StudentScope.api.post('/api/auth/logout');
    } catch {
        /* la sesión local se cierra de todos modos */
    }
    limpiarSesionLocal();
    mostrarVista('landing');
}

export function sesionExpirada() {
    if (!state.usuario) return;
    limpiarSesionLocal();
    mostrarVista('login');
    showToast('Tu sesión expiró. Inicia sesión de nuevo', 'info');
}

export async function restaurarSesion() {
    try {
        var r = await window.StudentScope.api.get('/api/auth/yo');
        entrar(r.usuario);
    } catch {
        if (new URLSearchParams(window.location.search).get('demo') === '1') iniciarDemo(null);
    }
}
