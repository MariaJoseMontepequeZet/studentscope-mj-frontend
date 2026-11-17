/**
 * StudentScope MJ — app.js v2.3
 * Cambios v2.3:
 * - Logout ahora va a 'landing' en vez de 'login'
 * - initNavSidebar incorpora cursos, reportes y configuracion
 * - renderizarCursos(), renderizarReportes(), renderizarConfiguracion()
 */
(function () {
    'use strict';

    const esc = window.EduTrack.escaparHTML;
    const num = window.EduTrack.aNumero;
    const ico = window.EduTrack.icono;
    const api = window.EduTrack.api;

    var PLANES_MONTO = { 'Básico': 29.99, 'Estándar': 59.99, 'Premium': 99.99 };

    var state = {
        estudiantes: [],
        total: 0,
        paginas: 0,
        resumen: null,
        cursos: [],
        peticion: 0,
        temporizadorBusqueda: null,
        editandoId: null,
        grafico: null,
        graficoPlan: null,
        graficoProgreso: null,
        confirmCb: null,
        vistaActual: 'landing',
        paginaActual: 1,
        itemsPorPagina: 12,
        filtroCategoria: 'todos',
        usuario: null
    };

    /* ════════════════════════════════════════════
       ROUTER
    ════════════════════════════════════════════ */
    function mostrarVista(nombre, datos) {
        var saliente = document.getElementById('view-' + state.vistaActual);
        var entrante = document.getElementById('view-' + nombre);
        if (!entrante || nombre === state.vistaActual) return;

        if (saliente) {
            saliente.classList.add('view--leaving');
            setTimeout(function () {
                saliente.classList.remove('view--active', 'view--leaving');
            }, 350);
        }

        setTimeout(function () {
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
                window.EduTrack && window.EduTrack.closeSidebar && window.EduTrack.closeSidebar();
            }
        }, nombre === 'dashboard' ? 350 : 0);
    }

    function actualizarUsuarioDashboard(d) {
        var nombreCompleto = (d && d.nombre) ? d.nombre.trim() : 'Usuario';
        var primerNombre = nombreCompleto.split(' ')[0] || nombreCompleto;
        var set = function (id, val) { var el = document.getElementById(id); if (el) el.textContent = val; };
        set('greetingNombre', primerNombre);
        set('sidebarNombre', nombreCompleto);
        set('sidebarRol', d && d.rol === 'administrador' ? 'Administrador' : 'Usuario');
        var av = document.getElementById('sidebarAvatar');
        if (av) av.innerHTML = window.EduTrack.avatar((d && d.email) || nombreCompleto);
    }

    function esAdministrador() {
        return !!(state.usuario && state.usuario.rol === 'administrador');
    }

    function aplicarRol() {
        var admin = esAdministrador();
        document.querySelectorAll('[data-solo-admin]').forEach(function (el) { el.hidden = !admin; });
        var textoConfig = document.querySelector('.db-sidebar__nav-link[data-section="configuracion"] .db-sidebar__nav-text');
        if (textoConfig) textoConfig.textContent = admin ? 'Configuración' : 'Mi perfil';
        if (!admin) cerrarPanelNotificaciones();
    }

    function invalidarReportes() {
        var sec = document.getElementById('secReportes');
        if (sec) {
            sec._rendered = false;
            sec.innerHTML = '';
        }
        if (state.graficoPlan) { state.graficoPlan.destroy(); state.graficoPlan = null; }
        if (state.graficoProgreso) { state.graficoProgreso.destroy(); state.graficoProgreso = null; }
    }

    function reiniciarVistasDinamicas() {
        ['secConfiguracion', 'secCuentas'].forEach(function (id) {
            var sec = document.getElementById(id);
            if (!sec) return;
            sec._rendered = false;
            sec.innerHTML = '';
        });
        invalidarReportes();
    }

    function actualizarFechaTopbar() {
        var el = document.getElementById('topbarFecha');
        if (!el) return;
        var dias = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
        var meses = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
        var hoy = new Date();
        el.textContent = dias[hoy.getDay()] + ', ' + hoy.getDate() + ' de ' + meses[hoy.getMonth()] + ' de ' + hoy.getFullYear();
    }

    /* ════════════════════════════════════════════
       NAVEGACIÓN DEL SIDEBAR
    ════════════════════════════════════════════ */
    var SECCIONES = {
        'dashboard': 'secDashboard',
        'estudiantes': 'secEstudiantes',
        'cursos': 'secCursos',
        'reportes': 'secReportes',
        'cuentas': 'secCuentas',
        'configuracion': 'secConfiguracion'
    };
    var SECCIONES_ADMIN = ['estudiantes', 'reportes', 'cuentas'];

    function activarSeccion(seccion) {
        if (!SECCIONES[seccion]) return;
        if (SECCIONES_ADMIN.indexOf(seccion) !== -1 && !esAdministrador()) seccion = 'dashboard';

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
        if (seccion === 'cuentas') window.EduTrack.cuentas.mostrar();
        if (seccion === 'configuracion') renderizarConfiguracion();
    }

    function initNavSidebar() {
        document.querySelectorAll('.db-sidebar__nav-link').forEach(function (link) {
            link.addEventListener('click', function (e) {
                e.preventDefault();
                var seccion = this.getAttribute('data-section');
                if (!seccion) return;
                activarSeccion(seccion);

                if (window.innerWidth < 768) {
                    window.EduTrack && window.EduTrack.closeSidebar && window.EduTrack.closeSidebar();
                }
            });
        });
    }

    /* ════════════════════════════════════════════
       DATOS
    ════════════════════════════════════════════ */
    function avisarErrorCarga(error) {
        if (error && error.estado === 401) return;
        showToast((error && error.message) || 'No se pudieron cargar los datos', 'error');
    }

    async function cargarResumen() {
        state.resumen = await api.get('/api/resumen');
        poblarSelectCiudades();
        actualizarKPIs();
        actualizarGrafico();
    }

    async function cargarPanel() {
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
        actualizarGrafico();
        if (esAdministrador()) await cargarEstudiantes();
    }

    function valorDe(id) { return ((document.getElementById(id) || {}).value || '').trim(); }

    function consultaEstudiantes() {
        var p = new URLSearchParams();
        [['buscar', 'searchInput'], ['ciudad', 'filterCiudad'], ['plan', 'filterPlan'], ['estado', 'filterEstado']]
            .forEach(function (par) {
                var v = valorDe(par[1]);
                if (v) p.set(par[0], v);
            });
        p.set('pagina', state.paginaActual);
        p.set('limite', state.itemsPorPagina);
        return p.toString();
    }

    async function cargarEstudiantes() {
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

    async function refrescarDatos() {
        invalidarReportes();
        try {
            await cargarResumen();
            await cargarEstudiantes();
        } catch (error) {
            avisarErrorCarga(error);
        }
    }

    /* ════════════════════════════════════════════
       KPIs
    ════════════════════════════════════════════ */
    function actualizarKPIs() {
        var r = state.resumen;
        if (!r) return;
        var set = function (id, val) { var el = document.getElementById(id); if (el) el.textContent = val; };
        set('kpiCursos', r.activos);
        set('kpiProgreso', r.progresoPromedio + '%');
        set('kpiTotal', r.total);
        var bar = document.getElementById('kpiProgresoBar');
        if (bar) bar.style.setProperty('--progress-value', r.progresoPromedio + '%');
    }

    /* ════════════════════════════════════════════
       CARDS & PAGINACIÓN (estudiantes)
    ════════════════════════════════════════════ */
    function planSlug(p) {
        return (p || '').toLowerCase()
            .replace(/á/g, 'a').replace(/é/g, 'e').replace(/í/g, 'i')
            .replace(/ó/g, 'o').replace(/ú/g, 'u').replace(/\s+/g, '');
    }
    function progresoClass(p) { return p >= 100 ? 'progress-fill--complete' : p < 40 ? 'progress-fill--low' : ''; }
    function formatFecha(d) {
        if (typeof d !== 'string') return '—';
        var p = d.split('-');
        return p.length === 3 ? p[2] + '/' + p[1] + '/' + p[0] : '—';
    }

    function mostrarEstadoListado(titulo, texto) {
        var grid = document.getElementById('studentsGrid');
        if (!grid) return;
        grid.innerHTML = '<div class="empty-state"><div class="empty-state__icon">' + ico('buscar') + '</div>' +
            '<p class="empty-state__title">' + esc(titulo) + '</p>' +
            '<p>' + esc(texto) + '</p></div>';
        actualizarContador(0);
        renderizarPaginacion();
    }

    function renderizarCards() {
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
                '<div class="card-avatar" aria-hidden="true">' + window.EduTrack.avatar(e.email) + '</div>' +
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

    function cambiarPagina(p) {
        if (p >= 1 && p <= state.paginas && p !== state.paginaActual) {
            state.paginaActual = p;
            cargarEstudiantes();
            var sec = document.getElementById('secEstudiantes');
            if (sec) sec.scrollIntoView({ behavior: 'smooth' });
        }
    }

    function actualizarContador(n) {
        var el = document.getElementById('resultsCount');
        if (el) el.innerHTML = 'Mostrando <strong>' + num(n) + '</strong> estudiantes en total';
    }

    /* ════════════════════════════════════════════
       FILTRAR (estudiantes)
    ════════════════════════════════════════════ */
    function filtrar() {
        clearTimeout(state.temporizadorBusqueda);
        var hay = valorDe('searchInput') || valorDe('filterCiudad') || valorDe('filterPlan') || valorDe('filterEstado');
        var btn = document.getElementById('btnResetFiltros');
        if (btn) btn.classList.toggle('visible', !!hay);
        state.paginaActual = 1;
        return cargarEstudiantes();
    }

    function buscarConRetraso() {
        clearTimeout(state.temporizadorBusqueda);
        state.temporizadorBusqueda = setTimeout(filtrar, 300);
    }

    /* ════════════════════════════════════════════
       MODAL ESTUDIANTE
    ════════════════════════════════════════════ */
    function abrirModal(id) {
        if (!esAdministrador()) return;
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
            document.getElementById('fFecha').value = window.EduTrack.validar.hoy();
            sincronizarMonto('Básico');
        }
        var campoFecha = document.getElementById('fFecha');
        campoFecha.min = window.EduTrack.validar.FECHA_MINIMA;
        campoFecha.max = window.EduTrack.validar.hoy();
        document.getElementById('modalOverlay').classList.add('is-open');
        document.getElementById('fNombre').focus();
    }

    function cerrarModal() {
        document.getElementById('modalOverlay').classList.remove('is-open');
        state.editandoId = null;
    }

    function limpiarFormulario() {
        var f = document.getElementById('formEstudiante'); if (!f) return;
        f.reset();
        f.querySelectorAll('.is-error').forEach(function (el) { el.classList.remove('is-error'); });
        f.querySelectorAll('.form-group__error').forEach(function (el) { el.classList.remove('visible'); el.textContent = ''; });
    }

    async function guardarEstudiante() {
        if (!esAdministrador()) return;
        var g = function (id) { return document.getElementById(id); };
        var d = {
            nombre: g('fNombre').value.trim(),
            apellido: g('fApellido').value.trim(),
            email: g('fEmail').value.trim(),
            ciudad: g('fCiudad').value,
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
        var errores = window.EduTrack.validar.registro(registro).errores.filter(function (e) {
            return e.nivel === 'ERROR';
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
        ['fCiudad', d.ciudad, 'Selecciona ciudad'], ['fCurso', d.cursoId, 'Selecciona curso'],
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

    function setFieldError(id, msg) {
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

    function eliminarEstudiante(id) {
        if (!esAdministrador()) return;
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

    function abrirConfirm(t, m, cb, etiqueta) {
        document.getElementById('confirmTitulo').textContent = t;
        document.getElementById('confirmMsg').innerHTML = m;
        document.getElementById('confirmAceptar').textContent = etiqueta || 'Sí, eliminar';
        state.confirmCb = cb;
        document.getElementById('confirmOverlay').classList.add('is-open');
    }
    function cerrarConfirm() { document.getElementById('confirmOverlay').classList.remove('is-open'); state.confirmCb = null; }
    function ejecutarConfirm() { if (typeof state.confirmCb === 'function') state.confirmCb(); cerrarConfirm(); }

    /* ════════════════════════════════════════════
       GRÁFICO DASHBOARD
    ════════════════════════════════════════════ */
    function actualizarGrafico() {
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

    /* ════════════════════════════════════════════
       SECCIÓN CURSOS
    ════════════════════════════════════════════ */
    var CATEGORIAS_INFO = {
        'todos': { label: 'Todos' },
        'web': { label: 'Desarrollo Web' },
        'data': { label: 'Data & IA' },
        'devops': { label: 'DevOps & Cloud' },
        'mobile': { label: 'Mobile' },
        'design': { label: 'Diseño' },
        'seguridad': { label: 'Seguridad' },
        'marketing': { label: 'Marketing' }
    };

    async function mostrarCursos() {
        var sec = document.getElementById('secCursos');
        if (!sec) return;
        if (!state.cursos.length) sec.innerHTML = '<p class="cursos-count">Cargando cursos…</p>';
        try {
            state.cursos = (await api.get('/api/cursos')).cursos;
        } catch (error) {
            avisarErrorCarga(error);
            if (!state.cursos.length) sec.innerHTML = '<p class="cursos-count">No se pudieron cargar los cursos.</p>';
            return;
        }
        renderizarCursos();
    }

    function renderizarCursos() {
        var sec = document.getElementById('secCursos');
        if (!sec) return;

        var filtro = state.filtroCategoria || 'todos';
        var lista = filtro === 'todos'
            ? state.cursos
            : state.cursos.filter(function (c) { return c.categoria === filtro; });

        var coloresCat = {
            'web': '#3B82F6', 'data': '#F5A623', 'devops': '#8B5CF6',
            'mobile': '#F97316', 'design': '#EC4899', 'seguridad': '#EF4444',
            'marketing': '#22C55E'
        };

        var tabsHTML = Object.keys(CATEGORIAS_INFO).map(function (k) {
            var activo = (k === filtro) ? ' cat-tab--active' : '';
            return '<button class="cat-tab' + activo + '" data-cat="' + k + '">' +
                esc(CATEGORIAS_INFO[k].label) + '</button>';
        }).join('');

        var cardsHTML = lista.map(function (c) {
            var color = coloresCat[c.categoria] || '#F5A623';
            var categoria = CATEGORIAS_INFO[c.categoria] ? CATEGORIAS_INFO[c.categoria].label : c.categoria;
            var nivelClass = c.nivel === 'Avanzado' ? 'nivel--avanzado' : c.nivel === 'Intermedio' ? 'nivel--intermedio' : 'nivel--basico';
            return '<article class="curso-card">' +
                '<div class="curso-card__top" style="--cat-color:' + color + '">' +
                '<span class="curso-cat-badge" style="background:' + color + '20;color:' + color + ';border-color:' + color + '40">' +
                esc(categoria) + '</span>' +
                '<span class="curso-nivel ' + nivelClass + '">' + esc(c.nivel) + '</span>' +
                '</div>' +
                '<h3 class="curso-card__title">' + esc(c.nombre) + '</h3>' +
                '<p class="curso-card__desc">' + esc(c.descripcion) + '</p>' +
                '<div class="curso-card__meta">' +
                '<span>' + esc(c.instructor) + '</span>' +
                '<span>' + num(c.semanas) + ' sem</span>' +
                '<span>' + num(c.inscritos) + ' inscritos</span>' +
                '</div>' +
                '<div class="curso-card__footer">' +
                '<span class="plan-badge plan-badge--' + esc(planSlug(c.plan)) + '">' + esc(c.plan) + '</span>' +
                '<span class="curso-card__precio">$' + num(c.precioUSD).toFixed(2) + ' USD</span>' +
                '</div>' +
                '</article>';
        }).join('');

        sec.innerHTML =
            '<header class="page-header">' +
            '<div><h2 class="page-header__title">Catálogo de <span>Cursos</span></h2>' +
            '<p class="page-header__meta">' + state.cursos.length + ' cursos disponibles · StudentScope MJ</p></div>' +
            '</header>' +
            '<div class="cat-tabs" role="tablist" aria-label="Filtrar por categoría">' + tabsHTML + '</div>' +
            '<p class="cursos-count">Mostrando <strong>' + lista.length + '</strong> curso' + (lista.length !== 1 ? 's' : '') + '</p>' +
            '<div class="cursos-grid">' + cardsHTML + '</div>';

        sec.querySelectorAll('.cat-tab').forEach(function (btn) {
            btn.addEventListener('click', function () {
                state.filtroCategoria = this.getAttribute('data-cat');
                renderizarCursos();
            });
        });
    }

    /* ════════════════════════════════════════════
       SECCIÓN REPORTES
    ════════════════════════════════════════════ */
    async function renderizarReportes() {
        var sec = document.getElementById('secReportes');
        if (!sec || sec._rendered || sec._cargando) return;

        sec._cargando = true;
        var datos;
        try {
            datos = await api.get('/api/reportes');
        } catch (error) {
            avisarErrorCarga(error);
            sec.innerHTML = '<p class="cursos-count">No se pudieron cargar los reportes.</p>';
            return;
        } finally {
            sec._cargando = false;
        }

        sec.innerHTML =
            '<header class="page-header">' +
            '<div><h2 class="page-header__title">Reportes <span>Analíticos</span></h2>' +
            '<p class="page-header__meta">Datos en tiempo real · ' + num(datos.total) + ' estudiantes</p></div>' +
            '</header>' +

            '<div class="rep-kpi-grid">' +
            kpiBox('dinero', 'Ingresos totales', '$' + num(datos.ingresosUSD).toFixed(2), 'USD acumulado', '--kpi-blue-bg', '--kpi-blue-border', '--kpi-blue-icon') +
            kpiBox('graduacion', 'Completaron curso', String(datos.completaron), 'con progreso 100%', '--kpi-yellow-bg', '--kpi-yellow-border', '--kpi-yellow-icon') +
            kpiBox('verificado', 'Tasa de retención', datos.retencionPorcentaje + '%', datos.activos + ' activos de ' + datos.total, '--kpi-blue-bg', '--kpi-blue-border', '--kpi-blue-icon') +
            kpiBox('barras', 'Progreso promedio', datos.progresoPromedio + '%', 'promedio general', '--kpi-purple-bg', '--kpi-purple-border', '--kpi-purple-icon') +
            '</div>' +

            '<div class="rep-charts-row">' +
            '<section class="rep-chart-box" aria-label="Distribución por plan">' +
            '<h3 class="rep-chart-title">Estudiantes por plan</h3>' +
            '<div class="rep-canvas-wrap"><canvas id="repChartPlan"></canvas></div>' +
            '</section>' +
            '<section class="rep-chart-box" aria-label="Distribución de progreso">' +
            '<h3 class="rep-chart-title">Distribución de progreso</h3>' +
            '<div class="rep-canvas-wrap"><canvas id="repChartProgreso"></canvas></div>' +
            '</section>' +
            '</div>' +

            '<section class="rep-table-section" aria-label="Top estudiantes por progreso">' +
            '<h3 class="rep-chart-title">Top 10 estudiantes por progreso</h3>' +
            '<div class="db-table-wrapper">' +
            renderizarTablaTop10(datos.top) +
            '</div>' +
            '</section>';

        sec._rendered = true;
        crearGraficosReportes(datos);
    }

    function kpiBox(icon, label, value, sub, bgVar, borderVar, colorVar) {
        return '<article class="rep-kpi-box" style="background:var(' + bgVar + ');border-color:var(' + borderVar + ')">' +
            '<div class="rep-kpi-icon" style="color:var(' + colorVar + ')">' + ico(icon) + '</div>' +
            '<div class="rep-kpi-body">' +
            '<p class="rep-kpi-label">' + esc(label) + '</p>' +
            '<p class="rep-kpi-value" style="color:var(' + colorVar + ')">' + esc(value) + '</p>' +
            '<p class="rep-kpi-sub">' + esc(sub) + '</p>' +
            '</div></article>';
    }

    function renderizarTablaTop10(top) {
        var rows = top.map(function (e, i) {
            return '<tr class="db-table__row">' +
                '<td class="db-table__td"><strong>' + (i + 1) + '</strong></td>' +
                '<td class="db-table__td">' + esc(e.nombre + ' ' + e.apellido) + '</td>' +
                '<td class="db-table__td">' + esc(e.curso.nombre) + '</td>' +
                '<td class="db-table__td">' +
                '<div style="display:flex;align-items:center;gap:.5rem">' +
                '<div style="flex:1;height:6px;background:var(--color-bg-elevated);border-radius:999px;overflow:hidden">' +
                '<div style="width:' + num(e.progreso) + '%;height:100%;background:var(--color-accent-primary);border-radius:999px"></div>' +
                '</div><strong>' + num(e.progreso) + '%</strong></div></td>' +
                '<td class="db-table__td"><span class="plan-badge plan-badge--' + esc(planSlug(e.plan)) + '">' + esc(e.plan) + '</span></td>' +
                '</tr>';
        }).join('');
        return '<table class="db-table" style="min-width:520px">' +
            '<thead class="db-table__head"><tr>' +
            '<th class="db-table__th">#</th><th class="db-table__th">Estudiante</th>' +
            '<th class="db-table__th">Curso</th><th class="db-table__th">Progreso</th>' +
            '<th class="db-table__th">Plan</th>' +
            '</tr></thead><tbody>' + rows + '</tbody></table>';
    }

    function crearGraficosReportes(datos) {
        if (typeof Chart === 'undefined') return;

        /* Gráfico 1: por plan (doughnut) */
        var ctxPlan = document.getElementById('repChartPlan');
        if (ctxPlan && !state.graficoPlan) {
            state.graficoPlan = new Chart(ctxPlan, {
                type: 'doughnut',
                data: {
                    labels: datos.porPlan.map(function (p) { return p.plan; }),
                    datasets: [{
                        data: datos.porPlan.map(function (p) { return p.total; }),
                        backgroundColor: ['rgba(34,197,94,.8)', 'rgba(59,130,246,.8)', 'rgba(245,166,35,.8)'],
                        borderWidth: 0, hoverOffset: 6
                    }]
                },
                options: {
                    responsive: true, maintainAspectRatio: false, cutout: '65%',
                    plugins: {
                        legend: { position: 'bottom', labels: { color: '#8B949E', padding: 16, font: { family: "'DM Sans'", size: 12 } } },
                        tooltip: {
                            backgroundColor: '#161B22', borderColor: 'rgba(255,255,255,.1)', borderWidth: 1,
                            titleColor: '#F0F6FC', bodyColor: '#8B949E'
                        }
                    }
                }
            });
        }

        /* Gráfico 2: progreso por rangos (bar horizontal) */
        var ctxProg = document.getElementById('repChartProgreso');
        if (ctxProg && !state.graficoProgreso) {
            state.graficoProgreso = new Chart(ctxProg, {
                type: 'bar',
                data: {
                    labels: datos.rangosProgreso.map(function (r) { return r.rango; }),
                    datasets: [{
                        label: 'Estudiantes', data: datos.rangosProgreso.map(function (r) { return r.total; }),
                        backgroundColor: ['rgba(239,68,68,.75)', 'rgba(249,115,22,.75)', 'rgba(245,166,35,.75)',
                            'rgba(59,130,246,.75)', 'rgba(34,197,94,.75)'],
                        borderRadius: 6, borderSkipped: false
                    }]
                },
                options: {
                    responsive: true, maintainAspectRatio: false, indexAxis: 'y',
                    plugins: {
                        legend: { display: false },
                        tooltip: {
                            backgroundColor: '#161B22', borderColor: 'rgba(255,255,255,.1)', borderWidth: 1,
                            titleColor: '#F0F6FC', bodyColor: '#8B949E'
                        }
                    },
                    scales: {
                        x: {
                            beginAtZero: true, grid: { color: 'rgba(255,255,255,.05)' },
                            ticks: { color: '#8B949E', stepSize: 1, font: { family: "'DM Sans'", size: 11 } }
                        },
                        y: {
                            grid: { display: false },
                            ticks: { color: '#8B949E', font: { family: "'DM Sans'", size: 11 } }
                        }
                    }
                }
            });
        }
    }

    /* ════════════════════════════════════════════
       SECCIÓN CONFIGURACIÓN
    ════════════════════════════════════════════ */
    function renderizarConfiguracion() {
        var sec = document.getElementById('secConfiguracion');
        if (!sec || sec._rendered) return;

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

            /* Tarjeta: Sistema */
            '<section class="config-card" aria-labelledby="cfg-sys">' +
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
            '</section>') : '') +

            '</div>';

        sec._rendered = true;
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
    async function guardarPerfil() {
        var campo = document.getElementById('cfgNombre');
        var boton = document.getElementById('btnGuardarPerfil');
        var nombre = campo ? campo.value.trim() : '';

        setFieldError('cfgNombre', nombre ? '' : 'El nombre es obligatorio');
        if (!nombre) return;

        if (boton) boton.disabled = true;
        try {
            var r = await window.EduTrack.api.patch('/api/auth/yo', { nombre: nombre });
            actualizarUsuarioActual(r.usuario);
            showToast('Perfil guardado correctamente', 'success');
        } catch (error) {
            setFieldError('cfgNombre', (error.campos && error.campos.nombre) || error.message);
        } finally {
            if (boton) boton.disabled = false;
        }
    }

    async function cambiarPassword() {
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
            await window.EduTrack.api.patch('/api/auth/yo', { passwordActual: actual, passwordNueva: nueva });
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

    function guardarNotificaciones() {
        showToast('Preferencias de notificaciones guardadas', 'success');
    }

    async function obtenerTodosLosEstudiantes() {
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

    function descargar(nombre, contenido, tipo) {
        var blob = new Blob([contenido], { type: tipo });
        var url = URL.createObjectURL(blob);
        var a = document.createElement('a');
        a.href = url; a.download = nombre; a.click();
        URL.revokeObjectURL(url);
    }

    async function exportar(formato, boton) {
        if (!esAdministrador()) return;
        ocupado(boton, true, 'Exportando…');
        try {
            var lista = await obtenerTodosLosEstudiantes();
            if (formato === 'json') {
                descargar('studentscope_estudiantes.json', JSON.stringify(lista, null, 2), 'application/json');
            } else {
                descargar('studentscope_estudiantes.csv', window.EduTrack.csv.aCSV(lista), 'text/csv;charset=utf-8;');
            }
            showToast((formato === 'json' ? 'JSON' : 'CSV') + ' exportado correctamente', 'success');
        } catch (error) {
            avisarErrorCarga(error);
        } finally {
            ocupado(boton, false);
        }
    }

    function exportarJSON(boton) { return exportar('json', boton); }
    function exportarCSV(boton) { return exportar('csv', boton); }

    /* ════════════════════════════════════════════
       HELPERS
    ════════════════════════════════════════════ */
    function sincronizarMonto(plan) {
        var el = document.getElementById('fMontoDisplay');
        if (el && PLANES_MONTO[plan]) el.textContent = 'USD $' + PLANES_MONTO[plan];
    }

    function poblarSelectCiudades() {
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

    function poblarCursos() {
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
    }

    var _toastTimer;
    function showToast(msg, tipo) {
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


    /* ════════════════════════════════════════════
       PANEL DE NOTIFICACIONES
    ════════════════════════════════════════════ */
    var notifPanelAbierto = false;

    function generarNotificaciones(r) {
        var inactivos = r.total - r.activos;
        var bajos = (r.rangosProgreso.find(function (x) { return x.rango === '0-24%'; }) || { total: 0 }).total;
        var notifs = [{
            tipo: 'stat', icono: 'barras', titulo: 'Resumen del sistema',
            texto: r.total + ' estudiantes · ' + r.activos + ' activos · ' + inactivos + ' inactivos · Promedio ' + r.progresoPromedio + '%',
            tiempo: 'Ahora'
        }];
        if (inactivos > 0) {
            notifs.push({
                tipo: 'warning', icono: 'alerta', titulo: 'Estudiantes inactivos',
                texto: inactivos + ' de ' + r.total + ' estudiantes están inactivos (retención ' + r.retencionPorcentaje + '%).',
                tiempo: 'Hoy'
            });
        }
        if (r.completaron > 0) {
            notifs.push({
                tipo: 'success', icono: 'graduacion', titulo: 'Cursos completados',
                texto: r.completaron + ' estudiantes completaron su curso al 100%.',
                tiempo: 'Hoy'
            });
        }
        if (bajos > 0) {
            notifs.push({
                tipo: 'info', icono: 'tendenciaBaja', titulo: 'Progreso bajo',
                texto: bajos + ' estudiantes llevan menos del 25% de progreso.',
                tiempo: 'Reciente'
            });
        }
        notifs.push({
            tipo: 'success', icono: 'dinero', titulo: 'Ingresos acumulados',
            texto: '$' + num(r.ingresosUSD).toFixed(2) + ' USD en inscripciones.',
            tiempo: 'Total'
        });
        return notifs;
    }

    async function abrirPanelNotificaciones() {
        var panel = document.getElementById('notifPanel');
        if (!panel || !esAdministrador()) return;
        if (notifPanelAbierto) { cerrarPanelNotificaciones(); return; }

        var datos;
        try {
            datos = await api.get('/api/reportes');
        } catch (error) {
            avisarErrorCarga(error);
            return;
        }
        var notifs = generarNotificaciones(datos);
        var colores = {
            warning: { bg: 'rgba(245,166,35,0.08)', border: 'rgba(245,166,35,0.25)', dot: '#F5A623' },
            success: { bg: 'rgba(34,197,94,0.08)', border: 'rgba(34,197,94,0.25)', dot: '#22C55E' },
            info: { bg: 'rgba(59,130,246,0.08)', border: 'rgba(59,130,246,0.25)', dot: '#3B82F6' },
            stat: { bg: 'rgba(139,92,246,0.08)', border: 'rgba(139,92,246,0.25)', dot: '#8B5CF6' }
        };

        var itemsHTML = notifs.map(function (n) {
            var c = colores[n.tipo] || colores.info;
            return '<div class="notif-item" style="background:' + c.bg + ';border-color:' + c.border + '">' +
                '<div class="notif-item__left">' +
                '<span class="notif-dot" style="background:' + c.dot + '"></span>' +
                '<span class="notif-icono">' + ico(n.icono) + '</span>' +
                '</div>' +
                '<div class="notif-item__body">' +
                '<p class="notif-titulo">' + esc(n.titulo) + '</p>' +
                '<p class="notif-texto">' + esc(n.texto) + '</p>' +
                '</div>' +
                '<span class="notif-tiempo">' + esc(n.tiempo) + '</span>' +
                '</div>';
        }).join('');

        var panelContent = document.getElementById('notifPanelContent');
        if (panelContent) panelContent.innerHTML = itemsHTML;

        var badge = document.getElementById('notifBadge');
        var inactivos = datos.total - datos.activos;
        if (badge) {
            badge.textContent = inactivos || '';
            badge.style.display = inactivos ? 'flex' : 'none';
        }

        notifPanelAbierto = true;
        panel.classList.add('is-open');
    }

    function cerrarPanelNotificaciones() {
        var panel = document.getElementById('notifPanel');
        if (panel) panel.classList.remove('is-open');
        notifPanelAbierto = false;
    }

    /* ════════════════════════════════════════════
       SESIÓN Y CUENTAS
    ════════════════════════════════════════════ */
    function mostrarErrorCampo(idError, mensaje) {
        var el = document.getElementById(idError);
        if (!el) return;
        el.textContent = mensaje || '';
        el.classList.toggle('visible', !!mensaje);
    }

    function limpiarErrores(ids) {
        ids.forEach(function (id) { mostrarErrorCampo(id, ''); });
    }

    function mostrarErroresServidor(error, mapa, idGeneral) {
        var usado = false;
        Object.keys(error.campos || {}).forEach(function (campo) {
            if (mapa[campo]) {
                mostrarErrorCampo(mapa[campo], error.campos[campo]);
                usado = true;
            }
        });
        if (!usado) mostrarErrorCampo(idGeneral, error.message);
    }

    function ocupado(boton, estaOcupado, texto) {
        if (!boton) return;
        if (estaOcupado) {
            boton.dataset.texto = boton.textContent;
            boton.textContent = texto;
        } else if (boton.dataset.texto) {
            boton.textContent = boton.dataset.texto;
        }
        boton.disabled = estaOcupado;
    }

    function entrar(usuario) {
        state.usuario = usuario;
        mostrarVista('dashboard', usuario);
    }

    function actualizarUsuarioActual(usuario) {
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
        ['searchInput', 'filterCiudad', 'filterPlan', 'filterEstado'].forEach(function (id) {
            var el = document.getElementById(id); if (el) el.value = '';
        });
        cerrarPanelNotificaciones();
        window.EduTrack.cuentas.reiniciar();
    }

    async function iniciarSesion(e) {
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
            var r = await window.EduTrack.api.post('/api/auth/login', { email: email, password: password });
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

    async function registrarCuenta(e) {
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
            var r = await window.EduTrack.api.post('/api/auth/registro', { nombre: nombre, email: email, password: password });
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

    async function cerrarSesion() {
        try {
            await window.EduTrack.api.post('/api/auth/logout');
        } catch {
            /* la sesión local se cierra de todos modos */
        }
        limpiarSesionLocal();
        mostrarVista('landing');
    }

    function sesionExpirada() {
        if (!state.usuario) return;
        limpiarSesionLocal();
        mostrarVista('login');
        showToast('Tu sesión expiró. Inicia sesión de nuevo', 'info');
    }

    async function restaurarSesion() {
        try {
            var r = await window.EduTrack.api.get('/api/auth/yo');
            entrar(r.usuario);
        } catch {
            /* sin sesión activa: se queda la página de inicio */
        }
    }

    /* ════════════════════════════════════════════
       INIT
    ════════════════════════════════════════════ */
    function init() {
        window.EduTrack.pintarIconos();

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
        ['filterCiudad', 'filterPlan', 'filterEstado'].forEach(function (id) {
            var el = document.getElementById(id); if (el) el.addEventListener('change', filtrar);
        });

        var bReset = document.getElementById('btnResetFiltros');
        if (bReset) bReset.addEventListener('click', function () {
            ['searchInput', 'filterCiudad', 'filterPlan', 'filterEstado'].forEach(function (id) {
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
            if (e.key === 'Escape') { cerrarModal(); cerrarConfirm(); }
        });

        document.addEventListener('click', function (e) {
            const elemento = e.target.closest('[data-action]');
            if (!elemento || elemento.disabled) return;
            const accion = ACCIONES[elemento.getAttribute('data-action')];
            if (accion) accion(elemento);
        });

        window.EduTrack.cuentas.iniciar();
        restaurarSesion();
    }

    const ACCIONES = {
        'ir-login': function () { mostrarVista('login'); },
        'ir-registro': function () { mostrarVista('registro'); },
        'ir-landing': function () { mostrarVista('landing'); },
        'editar': function (el) { abrirModal(num(el.getAttribute('data-id'))); },
        'eliminar': function (el) { eliminarEstudiante(num(el.getAttribute('data-id'))); },
        'pagina': function (el) { cambiarPagina(num(el.getAttribute('data-page'))); },
        'cerrar-modal': function () { cerrarModal(); },
        'guardar-estudiante': function () { guardarEstudiante(); },
        'cerrar-confirm': function () { cerrarConfirm(); },
        'ejecutar-confirm': function () { ejecutarConfirm(); },
        'cerrar-notificaciones': function () { cerrarPanelNotificaciones(); },
        'guardar-perfil': function () { guardarPerfil(); },
        'cambiar-password': function () { cambiarPassword(); },
        'guardar-notificaciones': function () { guardarNotificaciones(); },
        'exportar-json': function (el) { exportarJSON(el); },
        'exportar-csv': function (el) { exportarCSV(el); }
    };

    /* API pública */
    window.EduTrack = window.EduTrack || {};
    window.EduTrack.abrirModal = abrirModal;
    window.EduTrack.cerrarModal = cerrarModal;
    window.EduTrack.guardarEstudiante = guardarEstudiante;
    window.EduTrack.eliminarEstudiante = eliminarEstudiante;
    window.EduTrack.cerrarConfirm = cerrarConfirm;
    window.EduTrack.ejecutarConfirm = ejecutarConfirm;
    window.EduTrack.mostrarVista = mostrarVista;
    window.EduTrack.cambiarPagina = cambiarPagina;
    window.EduTrack.guardarPerfil = guardarPerfil;
    window.EduTrack.cambiarPassword = cambiarPassword;
    window.EduTrack.guardarNotificaciones = guardarNotificaciones;
    window.EduTrack.exportarJSON = exportarJSON;
    window.EduTrack.exportarCSV = exportarCSV;
    window.EduTrack.cerrarPanelNotificaciones = cerrarPanelNotificaciones;
    window.EduTrack.toast = showToast;
    window.EduTrack.confirmar = abrirConfirm;
    window.EduTrack.marcarError = setFieldError;
    window.EduTrack.usuarioActual = function () { return state.usuario; };
    window.EduTrack.actualizarUsuarioActual = actualizarUsuarioActual;
    window.EduTrack.registrarAcciones = function (acciones) { Object.assign(ACCIONES, acciones); };

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

})();