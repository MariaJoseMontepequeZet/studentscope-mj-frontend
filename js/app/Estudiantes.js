import { avisarErrorCarga, cargarEstudiantes, refrescarDatos } from './Datos.js';
import { PLANES_MONTO, api, esc, ico, num, state } from './Estado.js';
import { abrirConfirm, abrirDialogo, cerrarDialogo, formatFecha, ocupado, planSlug, progresoClass, setFieldError, showToast, valorDe } from './Interfaz.js';
import { puedeGestionar } from './Permisos.js';

export function mostrarEstadoListado(titulo, texto) {
    var grid = document.getElementById('studentsGrid');
    if (!grid) return;
    grid.innerHTML = '<div class="empty-state"><div class="empty-state__icon">' + ico('buscar') + '</div>' +
        '<p class="empty-state__title">' + esc(titulo) + '</p>' +
        '<p>' + esc(texto) + '</p></div>';
    actualizarContador(0);
    renderizarPaginacion();
}

export function renderizarCards() {
    var grid = document.getElementById('studentsGrid');
    if (!grid) return;
    if (!state.estudiantes.length) {
        mostrarEstadoListado('Sin resultados', 'Ajusta los filtros o agrega un estudiante.');
        return;
    }
    grid.innerHTML = state.estudiantes.map(function (e, i) {
        return '<article class="student-card' + (e.activo ? '' : ' student-card--inactive') + '" ' +
            'style="animation-delay:' + Math.min(i * 30, 300) + 'ms" data-id="' + num(e.id) + '">' +
            '<div class="card-header">' +
            '<div class="card-avatar" aria-hidden="true">' + window.StudentScope.avatar(e.email) + '</div>' +
            '<div class="card-info">' +
            '<p class="card-name">' + esc(e.nombre + ' ' + e.apellido) + '</p>' +
            '<p class="card-email">' + esc(e.email) + '</p>' +
            '</div>' +
            '<span class="plan-badge plan-badge--' + esc(planSlug(e.plan)) + '">' + esc(e.plan) + '</span>' +
            '</div>' +
            '<div class="card-body">' +
            '<div class="card-detail"><span class="card-detail__icon">' + ico('ubicacion') + '</span><span>' + esc(e.ciudad) + '</span></div>' +
            '<div class="card-detail"><span class="card-detail__icon">' + ico('monitor') + '</span><span>' + esc(e.curso.nombre) + '</span></div>' +
            '<div class="card-detail"><span class="card-detail__icon">' + ico('calendario') + '</span><span>' + esc(formatFecha(e.fechaInscripcion)) + '</span></div>' +
            '</div>' +
            '<div class="progress-wrap">' +
            '<div class="progress-label"><span>Progreso</span><strong>' + num(e.progreso) + '%</strong></div>' +
            '<div class="progress-track"><div class="progress-fill ' + progresoClass(num(e.progreso)) + '" style="width:' + num(e.progreso) + '%"></div></div>' +
            '</div>' +
            '<div class="card-actions">' +
            '<button class="btn btn-secondary btn--sm" data-action="editar" data-id="' + num(e.id) + '">Editar</button>' +
            '<button class="btn btn-danger btn--sm" data-action="eliminar" data-id="' + num(e.id) + '">Eliminar</button>' +
            '</div>' +
            '</article>';
    }).join('');
    actualizarContador(state.total);
    renderizarPaginacion();
}

function renderizarPaginacion() {
    var container = document.getElementById('paginationContainer');
    if (!container) {
        container = document.createElement('div');
        container.id = 'paginationContainer';
        container.className = 'pagination';
        var grid = document.getElementById('studentsGrid');
        if (grid) grid.parentNode.insertBefore(container, grid.nextSibling);
    }
    if (state.paginas <= 1) { container.innerHTML = ''; return; }
    var bA = state.paginaActual === 1 ? 'disabled' : '';
    var bS = state.paginaActual === state.paginas ? 'disabled' : '';
    container.innerHTML =
        '<button class="btn btn-secondary btn--sm" data-action="pagina" data-page="' + (state.paginaActual - 1) + '" ' + bA + '>← Anterior</button>' +
        '<span class="pagination__info">Página ' + state.paginaActual + ' de ' + state.paginas + '</span>' +
        '<button class="btn btn-secondary btn--sm" data-action="pagina" data-page="' + (state.paginaActual + 1) + '" ' + bS + '>Siguiente →</button>';
}

export function cambiarPagina(p) {
    if (p >= 1 && p <= state.paginas && p !== state.paginaActual) {
        state.paginaActual = p;
        cargarEstudiantes();
        var sec = document.getElementById('secEstudiantes');
        if (sec) sec.scrollIntoView({ behavior: 'smooth' });
    }
}

function actualizarContador(n) {
    var el = document.getElementById('resultsCount');
    if (el) el.innerHTML = 'Mostrando <strong>' + num(n) + '</strong> ' + (n === 1 ? 'estudiante' : 'estudiantes') + ' en total';
}

export function filtrar() {
    clearTimeout(state.temporizadorBusqueda);
    var hay = valorDe('searchInput') || valorDe('filterCiudad') || valorDe('filterCurso') || valorDe('filterPlan') || valorDe('filterEstado');
    var btn = document.getElementById('btnResetFiltros');
    if (btn) btn.classList.toggle('visible', !!hay);
    state.paginaActual = 1;
    return cargarEstudiantes();
}

export function buscarConRetraso() {
    clearTimeout(state.temporizadorBusqueda);
    state.temporizadorBusqueda = setTimeout(filtrar, 300);
}

export function abrirModal(id) {
    if (!puedeGestionar()) return;
    if (!state.cursos.length) { showToast('Los cursos aún no se han cargado', 'info'); return; }
    state.editandoId = id || null;
    limpiarFormulario();
    if (id) {
        var e = state.estudiantes.find(function (x) { return x.id === id; });
        if (!e) return;
        document.getElementById('modalTitulo').textContent = 'Editar Estudiante';
        document.getElementById('fNombre').value = e.nombre;
        document.getElementById('fApellido').value = e.apellido;
        document.getElementById('fEmail').value = e.email;
        document.getElementById('fCiudad').value = e.ciudad;
        document.getElementById('fCurso').value = e.curso.id;
        document.getElementById('fPlan').value = e.plan;
        document.getElementById('fProgreso').value = e.progreso;
        document.getElementById('fProgresoVal').textContent = e.progreso + '%';
        document.getElementById('fFecha').value = e.fechaInscripcion;
        document.getElementById('fActivo').checked = e.activo;
        sincronizarMonto(e.plan);
    } else {
        document.getElementById('modalTitulo').textContent = 'Agregar Estudiante';
        document.getElementById('fProgreso').value = 0;
        document.getElementById('fProgresoVal').textContent = '0%';
        document.getElementById('fActivo').checked = true;
        document.getElementById('fFecha').value = window.StudentScope.validar.hoy();
        document.getElementById('fPlan').value = 'Básico';
        sincronizarMonto('Básico');
    }
    var campoFecha = document.getElementById('fFecha');
    campoFecha.min = window.StudentScope.validar.FECHA_MINIMA;
    campoFecha.max = window.StudentScope.validar.hoy();
    abrirDialogo(document.getElementById('modalOverlay'), document.getElementById('fNombre'));
}

export function cerrarModal() {
    cerrarDialogo(document.getElementById('modalOverlay'));
    state.editandoId = null;
}

function limpiarFormulario() {
    var f = document.getElementById('formEstudiante'); if (!f) return;
    f.reset();
    f.querySelectorAll('.is-error').forEach(function (el) { el.classList.remove('is-error'); });
    f.querySelectorAll('.form-group__error').forEach(function (el) { el.classList.remove('visible'); el.textContent = ''; });
}

export async function guardarEstudiante() {
    if (!puedeGestionar()) return;
    var g = function (id) { return document.getElementById(id); };
    var d = {
        nombre: g('fNombre').value.trim(),
        apellido: g('fApellido').value.trim(),
        email: g('fEmail').value.trim(),
        ciudad: g('fCiudad').value.trim(),
        cursoId: g('fCurso').value,
        plan: g('fPlan').value,
        progreso: parseInt(g('fProgreso').value, 10),
        fecha: g('fFecha').value,
        activo: g('fActivo').checked
    };
    if (validarCampos(d).length) return;

    var registro = {
        id: state.editandoId || 1, nombre: d.nombre, apellido: d.apellido, email: d.email,
        ciudad: d.ciudad, curso: g('fCurso').selectedOptions[0].textContent, plan: d.plan,
        progreso: d.progreso, fechaInscripcion: d.fecha,
        montoUSD: PLANES_MONTO[d.plan], activo: d.activo
    };
    if (!validarRegistroCompleto(registro)) return;

    var cuerpo = {
        nombre: d.nombre, apellido: d.apellido, email: d.email, ciudad: d.ciudad,
        cursoId: Number(d.cursoId), plan: d.plan, progreso: d.progreso,
        fechaInscripcion: d.fecha, activo: d.activo
    };
    var editando = state.editandoId;
    var boton = document.querySelector('[data-action="guardar-estudiante"]');
    ocupado(boton, true, 'Guardando…');
    try {
        if (editando) await api.patch('/api/estudiantes/' + editando, cuerpo);
        else await api.post('/api/estudiantes', cuerpo);
        cerrarModal();
        showToast(editando ? 'Estudiante actualizado' : 'Estudiante agregado', 'success');
        await refrescarDatos();
    } catch (error) {
        if (error.codigo === 'ESTUDIANTE_NO_ENCONTRADO') {
            cerrarModal();
            showToast(error.message, 'error');
            await refrescarDatos();
        } else {
            mostrarErroresDelServidor(error);
        }
    } finally {
        ocupado(boton, false);
    }
}

var ENTRADA_POR_CAMPO = {
    nombre: 'fNombre', apellido: 'fApellido', email: 'fEmail', ciudad: 'fCiudad',
    curso: 'fCurso', cursoId: 'fCurso', plan: 'fPlan', progreso: 'fProgreso',
    fechaInscripcion: 'fFecha'
};

function mostrarErroresDelServidor(error) {
    var campos = error.campos || {};
    var usado = false;
    Object.keys(campos).forEach(function (campo) {
        if (ENTRADA_POR_CAMPO[campo]) {
            setFieldError(ENTRADA_POR_CAMPO[campo], campos[campo]);
            usado = true;
        }
    });
    if (!usado) avisarErrorCarga(error);
}

function validarRegistroCompleto(registro) {
    var cursos = state.cursos.map(function (c) { return c.nombre; });
    var errores = window.StudentScope.validar.registro(registro, { cursos: cursos }).errores.filter(function (e) {
        /* El formato del correo ya se revisó con la misma regla del servidor. */
        return e.nivel === 'ERROR' && e.regla !== 'V-04';
    });
    errores.forEach(function (e, i) {
        var mensaje = e.mensaje.split('. ')[0];
        var entrada = ENTRADA_POR_CAMPO[e.campo];
        if (entrada) setFieldError(entrada, mensaje);
        else if (i === 0) showToast(mensaje, 'error');
    });
    return errores.length === 0;
}

function validarCampos(d) {
    var err = [];
    [['fNombre', d.nombre, 'Nombre requerido'], ['fApellido', d.apellido, 'Apellido requerido'],
    ['fCiudad', d.ciudad, 'Escribe la ciudad'], ['fCurso', d.cursoId, 'Selecciona curso'],
    ['fPlan', d.plan, 'Selecciona plan'], ['fFecha', d.fecha, 'Fecha requerida']
    ].forEach(function (r) {
        setFieldError(r[0], !r[1] ? r[2] : '');
        if (!r[1]) err.push(r[0]);
    });
    var re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!d.email || !re.test(d.email)) {
        setFieldError('fEmail', 'Email inválido'); err.push('fEmail');
    } else { setFieldError('fEmail', ''); }
    if (isNaN(d.progreso) || d.progreso < 0 || d.progreso > 100) {
        setFieldError('fProgreso', 'Entre 0 y 100'); err.push('fProgreso');
    } else { setFieldError('fProgreso', ''); }
    return err;
}

export function eliminarEstudiante(id) {
    if (!puedeGestionar()) return;
    var e = state.estudiantes.find(function (x) { return x.id === id; }); if (!e) return;
    abrirConfirm(
        '¿Eliminar estudiante?',
        'Vas a eliminar a <strong>' + esc(e.nombre + ' ' + e.apellido) + '</strong>. Esta acción no se puede deshacer.',
        async function () {
            try {
                await api.delete('/api/estudiantes/' + id);
                showToast('Estudiante eliminado', 'info');
            } catch (error) {
                avisarErrorCarga(error);
            }
            await refrescarDatos();
        }
    );
}

export function actualizarGrafico() {
    if (!state.resumen) return;
    var cities = state.resumen.porCiudad.map(function (c) { return c.ciudad; });
    var vals = state.resumen.porCiudad.map(function (c) { return c.total; });
    var clrs = ['rgba(245,166,35,.85)', 'rgba(59,130,246,.85)', 'rgba(34,197,94,.85)',
        'rgba(139,92,246,.85)', 'rgba(249,115,22,.85)', 'rgba(236,72,153,.85)', 'rgba(20,184,166,.85)'];
    var bgColors = cities.map(function (_, i) { return clrs[i % clrs.length]; });
    if (state.grafico) {
        state.grafico.data.labels = cities;
        state.grafico.data.datasets[0].data = vals;
        state.grafico.data.datasets[0].backgroundColor = bgColors;
        state.grafico.update(); return;
    }
    var ctx = document.getElementById('ciudadesChart');
    if (!ctx || typeof Chart === 'undefined') return;
    state.grafico = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: cities, datasets: [{
                label: 'Estudiantes', data: vals,
                backgroundColor: bgColors, borderRadius: 6, borderSkipped: false
            }]
        },
        options: {
            responsive: true, maintainAspectRatio: false,
            plugins: {
                legend: { display: false },
                tooltip: {
                    backgroundColor: '#161B22', borderColor: 'rgba(255,255,255,.1)', borderWidth: 1,
                    titleColor: '#F0F6FC', bodyColor: '#8B949E',
                    callbacks: { label: function (c) { return ' ' + c.parsed.y + ' estudiante' + (c.parsed.y !== 1 ? 's' : ''); } }
                }
            },
            scales: {
                x: { grid: { color: 'rgba(255,255,255,.05)' }, ticks: { color: '#8B949E', font: { family: "'DM Sans'", size: 11 } } },
                y: { beginAtZero: true, grid: { color: 'rgba(255,255,255,.05)' }, ticks: { color: '#8B949E', stepSize: 1, font: { family: "'DM Sans'", size: 11 } } }
            }
        }
    });
}

export function sincronizarMonto(plan) {
    var el = document.getElementById('fMontoDisplay');
    if (el && PLANES_MONTO[plan]) el.textContent = 'USD $' + PLANES_MONTO[plan];
}

/* Las ciudades que ya existen también se sugieren en el formulario. */
function sugerirCiudades() {
    var lista = document.getElementById('listaCiudades');
    if (!lista || !state.resumen) return;
    var conocidas = Array.from(lista.options, function (o) { return o.value; });
    state.resumen.porCiudad.forEach(function (c) {
        if (conocidas.indexOf(c.ciudad) !== -1) return;
        var opcion = document.createElement('option');
        opcion.value = c.ciudad;
        lista.appendChild(opcion);
    });
}

export function poblarSelectCiudades() {
    sugerirCiudades();
    var sel = document.getElementById('filterCiudad');
    if (!sel || !state.resumen) return;
    var ciudades = state.resumen.porCiudad.map(function (c) { return c.ciudad; }).sort();
    var cur = sel.value;
    while (sel.options.length > 1) sel.remove(1);
    ciudades.forEach(function (c) {
        var o = document.createElement('option'); o.value = c; o.textContent = c;
        if (c === cur) o.selected = true;
        sel.appendChild(o);
    });
}

export function poblarCursos() {
    var select = document.getElementById('fCurso');
    if (!select) return;
    var actual = select.value;
    while (select.options.length > 1) select.remove(1);
    state.cursos.forEach(function (curso) {
        var opcion = document.createElement('option');
        opcion.value = curso.id;
        opcion.textContent = curso.nombre;
        select.appendChild(opcion);
    });
    select.value = actual;
    poblarFiltroCurso();
}

function poblarFiltroCurso() {
    var filtro = document.getElementById('filterCurso');
    if (!filtro) return;
    var actual = filtro.value;
    while (filtro.options.length > 1) filtro.remove(1);
    state.cursos.forEach(function (curso) {
        var opcion = document.createElement('option');
        opcion.value = curso.id;
        opcion.textContent = curso.nombre;
        filtro.appendChild(opcion);
    });
    filtro.value = actual;
}
