import { avisarErrorCarga } from './Datos.js';
import { api, esc, ico, num, state } from './Estado.js';
import { planSlug } from './Interfaz.js';

function destruirGraficosReportes() {
    if (state.graficoPlan) { state.graficoPlan.destroy(); state.graficoPlan = null; }
    if (state.graficoProgreso) { state.graficoProgreso.destroy(); state.graficoProgreso = null; }
}

export function vaciarReportes() {
    var sec = document.getElementById('secReportes');
    if (sec) {
        sec._turno = (sec._turno || 0) + 1;
        sec.innerHTML = '';
    }
    destruirGraficosReportes();
}

export async function renderizarReportes() {
    var sec = document.getElementById('secReportes');
    if (!sec) return;

    var turno = (sec._turno = (sec._turno || 0) + 1);
    var datos;
    try {
        datos = await api.get('/api/reportes');
    } catch (error) {
        if (turno !== sec._turno) return;
        avisarErrorCarga(error);
        if (!sec.firstElementChild) {
            sec.innerHTML = '<p class="cursos-count">No se pudieron cargar los reportes.</p>';
        }
        return;
    }
    if (turno !== sec._turno) return;
    destruirGraficosReportes();

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
        '<th class="db-table__th" scope="col">#</th><th class="db-table__th" scope="col">Estudiante</th>' +
        '<th class="db-table__th" scope="col">Curso</th><th class="db-table__th" scope="col">Progreso</th>' +
        '<th class="db-table__th" scope="col">Plan</th>' +
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
                    backgroundColor: ['#7FE3D4', '#2A3E9E', '#1F2F7A'],
                    borderWidth: 0, hoverOffset: 6
                }]
            },
            options: {
                responsive: true, maintainAspectRatio: false, cutout: '65%',
                plugins: {
                    legend: { position: 'bottom', labels: { color: '#444D78', padding: 16, font: { family: "'Atkinson Hyperlegible'", size: 12 } } },
                    tooltip: {
                        backgroundColor: '#131A45', borderColor: 'rgba(19,26,69,.2)', borderWidth: 1,
                        titleColor: '#FFFFFF', bodyColor: '#E6E9F6'
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
                    backgroundColor: ['#B23018', '#C9602A', '#B88A00',
                        '#2A3E9E', '#0A6D5F'],
                    borderRadius: 6, borderSkipped: false
                }]
            },
            options: {
                responsive: true, maintainAspectRatio: false, indexAxis: 'y',
                plugins: {
                    legend: { display: false },
                    tooltip: {
                        backgroundColor: '#131A45', borderColor: 'rgba(19,26,69,.2)', borderWidth: 1,
                        titleColor: '#FFFFFF', bodyColor: '#E6E9F6'
                    }
                },
                scales: {
                    x: {
                        beginAtZero: true, grid: { color: 'rgba(19,26,69,.1)' },
                        ticks: { color: '#444D78', stepSize: 1, font: { family: "'Atkinson Hyperlegible'", size: 11 } }
                    },
                    y: {
                        grid: { display: false },
                        ticks: { color: '#444D78', font: { family: "'Atkinson Hyperlegible'", size: 11 } }
                    }
                }
            }
        });
    }
}
