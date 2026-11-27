import { api, state } from './Estado.js';
import { mostrarEstadoListado, poblarCursos, poblarSelectCiudades, renderizarCards } from './Estudiantes.js';
import { showToast, valorDe } from './Interfaz.js';
import { pintarCielo, pintarCiudades, pintarResumenSinMapa } from './Observatorio.js';
import { puedeGestionar } from './Permisos.js';

export function avisarErrorCarga(error) {
    if (error && error.estado === 401) return;
    showToast((error && error.message) || 'No se pudieron cargar los datos', 'error');
}

async function cargarResumen() {
    state.resumen = await api.get('/api/resumen');
    poblarSelectCiudades();
    actualizarKPIs();
}

/* El mapa necesita a todos los estudiantes, no solo la página del listado. */
async function cargarCielo() {
    if (!puedeGestionar()) {
        pintarResumenSinMapa(state.resumen);
        return;
    }
    var todos = await obtenerTodosLosEstudiantes();
    if (!state.usuario) return;
    state.cielo = todos;
    pintarCielo();
}

export async function cargarPanel() {
    try {
        var resultados = await Promise.all([api.get('/api/resumen'), api.get('/api/cursos')]);
        state.resumen = resultados[0];
        state.cursos = resultados[1].cursos;
    } catch (error) {
        avisarErrorCarga(error);
        return;
    }
    if (!state.usuario) return;
    poblarCursos();
    poblarSelectCiudades();
    actualizarKPIs();
    try {
        await cargarCielo();
    } catch (error) {
        avisarErrorCarga(error);
    }
    if (puedeGestionar()) await cargarEstudiantes();
}

function consultaEstudiantes() {
    var p = new URLSearchParams();
    [['buscar', 'searchInput'], ['ciudad', 'filterCiudad'], ['curso', 'filterCurso'], ['plan', 'filterPlan'], ['estado', 'filterEstado']]
        .forEach(function (par) {
            var v = valorDe(par[1]);
            if (v) p.set(par[0], v);
        });
    p.set('pagina', state.paginaActual);
    p.set('limite', state.itemsPorPagina);
    return p.toString();
}

export async function cargarEstudiantes() {
    var turno = ++state.peticion;
    try {
        var r = await api.get('/api/estudiantes?' + consultaEstudiantes());
        if (turno !== state.peticion) return;
        if (r.paginas > 0 && state.paginaActual > r.paginas) {
            state.paginaActual = r.paginas;
            return cargarEstudiantes();
        }
        state.estudiantes = r.estudiantes;
        state.total = r.total;
        state.paginas = r.paginas;
        renderizarCards();
    } catch (error) {
        if (turno !== state.peticion) return;
        avisarErrorCarga(error);
        if (!state.estudiantes.length) {
            mostrarEstadoListado('No se pudo cargar', 'Revisa tu conexión e inténtalo de nuevo.');
        }
    }
}

export async function refrescarDatos() {
    try {
        await cargarResumen();
        await cargarCielo();
        await cargarEstudiantes();
    } catch (error) {
        avisarErrorCarga(error);
    }
}

/* Contador de inactivos sobre la campana. Vive aquí porque se llena al cargar el panel. */
export function mostrarAvisoPendiente(inactivos) {
    var badge = document.getElementById('notifBadge');
    if (!badge) return;
    badge.textContent = inactivos || '';
    badge.style.display = inactivos && puedeGestionar() ? 'flex' : 'none';
}

function actualizarKPIs() {
    var r = state.resumen;
    if (!r) return;
    var set = function (id, val) { var el = document.getElementById(id); if (el) el.textContent = val; };
    set('kpiCursos', r.activos);
    set('kpiProgreso', r.progresoPromedio + '%');
    set('kpiTotal', r.total);
    var bar = document.getElementById('kpiProgresoBar');
    if (bar) bar.style.width = r.progresoPromedio + '%';
    var medidor = document.getElementById('kpiProgresoMedidor');
    if (medidor) medidor.setAttribute('aria-valuenow', r.progresoPromedio);
    mostrarAvisoPendiente(r.inactivos);
    pintarCiudades(r.porCiudad);
}

export async function obtenerTodosLosEstudiantes() {
    var todos = [];
    var pagina = 1;
    var paginas;
    do {
        var r = await api.get('/api/estudiantes?pagina=' + pagina + '&limite=100');
        todos = todos.concat(r.estudiantes);
        paginas = r.paginas;
        pagina++;
    } while (pagina <= paginas);
    return todos;
}
