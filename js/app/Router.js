import { renderizarConfiguracion } from './Configuracion.js';
import { mostrarCursos } from './Cursos.js';
import { cargarPanel } from './Datos.js';
import { state } from './Estado.js';
import { actualizarFechaTopbar } from './Interfaz.js';
import { aplicarRol, esAdministrador, puedeGestionar } from './Permisos.js';
import { renderizarReportes, vaciarReportes } from './Reportes.js';
import { actualizarUsuarioDashboard } from './Sesion.js';

var destinoPendiente = null;
var cambioPendiente = null;

export function mostrarVista(nombre, datos) {
    var saliente = document.getElementById('view-' + state.vistaActual);
    var entrante = document.getElementById('view-' + nombre);
    if (!entrante || nombre === (destinoPendiente || state.vistaActual)) return;

    clearTimeout(cambioPendiente);
    destinoPendiente = nombre;
    if (saliente && saliente !== entrante) {
        saliente.classList.add('view--leaving');
        setTimeout(function () {
            if (state.vistaActual !== saliente.id.replace('view-', '')) {
                saliente.classList.remove('view--active', 'view--leaving');
            }
        }, 350);
    }

    cambioPendiente = setTimeout(function () {
        destinoPendiente = null;
        document.querySelectorAll('.view').forEach(function (v) {
            if (v !== entrante) v.classList.remove('view--active', 'view--leaving');
        });
        entrante.classList.remove('view--leaving');
        entrante.classList.add('view--active');
        state.vistaActual = nombre;
        window.scrollTo(0, 0);

        if (nombre === 'dashboard') {
            actualizarUsuarioDashboard(datos || {});
            reiniciarVistasDinamicas();
            aplicarRol();
            activarSeccion('dashboard');
            actualizarFechaTopbar();
            cargarPanel();
        }
        if (nombre === 'landing') {
            window.StudentScope && window.StudentScope.closeSidebar && window.StudentScope.closeSidebar();
        }
    }, nombre === 'dashboard' ? 350 : 0);
}

function reiniciarVistasDinamicas() {
    ['secConfiguracion', 'secCuentas'].forEach(function (id) {
        var sec = document.getElementById(id);
        if (!sec) return;
        sec._rendered = false;
        sec.innerHTML = '';
    });
    vaciarReportes();
}

var SECCIONES = {
    'dashboard': 'secDashboard',
    'estudiantes': 'secEstudiantes',
    'cursos': 'secCursos',
    'reportes': 'secReportes',
    'cuentas': 'secCuentas',
    'configuracion': 'secConfiguracion'
};

var SECCIONES_GESTION = ['estudiantes', 'reportes'];

var SECCIONES_ADMIN = ['cuentas'];

function activarSeccion(seccion) {
    if (!SECCIONES[seccion]) return;
    if (SECCIONES_ADMIN.indexOf(seccion) !== -1 && !esAdministrador()) seccion = 'dashboard';
    if (SECCIONES_GESTION.indexOf(seccion) !== -1 && !puedeGestionar()) seccion = 'dashboard';

    document.querySelectorAll('.db-sidebar__nav-link').forEach(function (l) {
        l.classList.toggle('db-sidebar__nav-link--active', l.getAttribute('data-section') === seccion);
    });

    Object.keys(SECCIONES).forEach(function (k) {
        var sec = document.getElementById(SECCIONES[k]);
        if (!sec) return;
        if (k === seccion) {
            sec.classList.remove('db-section--hidden');
            sec.style.display = 'block';
        } else {
            sec.classList.add('db-section--hidden');
            sec.style.display = 'none';
        }
    });

    if (seccion === 'cursos') mostrarCursos();
    if (seccion === 'reportes') renderizarReportes();
    if (seccion === 'cuentas') window.StudentScope.cuentas.mostrar();
    if (seccion === 'configuracion') renderizarConfiguracion();
}

export function initNavSidebar() {
    document.querySelectorAll('.db-sidebar__nav-link').forEach(function (link) {
        link.addEventListener('click', function (e) {
            e.preventDefault();
            var seccion = this.getAttribute('data-section');
            if (!seccion) return;
            activarSeccion(seccion);

            if (window.innerWidth < 768) {
                window.StudentScope && window.StudentScope.closeSidebar && window.StudentScope.closeSidebar();
            }
        });
    });
}
